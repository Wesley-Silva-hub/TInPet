import type {
  Comment,
  commentsQuerySchema,
  LikeResult,
  Page,
  Post,
  postFieldsSchema,
  postsQuerySchema,
} from '@tinpet/shared'
import type { z } from 'zod'
import type { Prisma } from '../../generated/prisma/client'
import type { AuthUser } from '../../shared/auth'
import type { AppDeps } from '../../shared/context'
import { decodeCursor, encodeCursor } from '../../shared/dto'
import { badRequest, forbidden, notFound } from '../../shared/errors'
import { processImage } from '../../shared/images'
import { newStorageKey } from '../../shared/storage/storage'

const PREVIEW_COMMENTS = 2

interface TimeCursor {
  t: string
  id: string
}
const isTimeCursor = (value: unknown): value is TimeCursor =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as TimeCursor).t === 'string' &&
  !Number.isNaN(Date.parse((value as TimeCursor).t)) &&
  typeof (value as TimeCursor).id === 'string' &&
  /^[0-9a-f-]{36}$/i.test((value as TimeCursor).id)

const authorSelect = {
  select: { id: true, name: true, avatarKey: true, city: true },
} satisfies Prisma.UserDefaultArgs

/** Esconde conteúdo de quem bloqueou o usuário ou foi bloqueado por ele. */
function visibleTo(viewerId: string): Prisma.UserWhereInput {
  return {
    blocksMade: { none: { blockedId: viewerId } },
    blocksReceived: { none: { blockerId: viewerId } },
  }
}

export function createSocialService({ db, storage }: AppDeps) {
  const postInclude = (viewerId: string) =>
    ({
      author: authorSelect,
      pet: { select: { id: true, name: true, species: true } },
      _count: { select: { likes: true, comments: true } },
      likes: { where: { userId: viewerId }, select: { userId: true } },
      comments: {
        where: { author: visibleTo(viewerId) },
        orderBy: { createdAt: 'desc' },
        take: PREVIEW_COMMENTS,
        include: { author: authorSelect },
      },
    }) satisfies Prisma.PostInclude

  type PostRow = Prisma.PostGetPayload<{ include: ReturnType<typeof postInclude> }>
  type CommentRow = Prisma.PostCommentGetPayload<{ include: { author: typeof authorSelect } }>

  const toAuthor = (author: {
    id: string
    name: string
    avatarKey: string | null
    city: string | null
  }) => ({
    id: author.id,
    name: author.name,
    avatarUrl: author.avatarKey ? storage.publicUrl(author.avatarKey) : null,
    city: author.city,
  })

  const toComment = (comment: CommentRow, viewerId: string): Comment => ({
    id: comment.id,
    postId: comment.postId,
    author: toAuthor(comment.author),
    content: comment.content,
    createdAt: comment.createdAt.toISOString(),
    mine: comment.authorId === viewerId,
  })

  const toPost = (post: PostRow, viewerId: string): Post => ({
    id: post.id,
    author: toAuthor(post.author),
    pet: post.pet,
    imageUrl: storage.publicUrl(post.imageKey),
    caption: post.caption,
    createdAt: post.createdAt.toISOString(),
    likeCount: post._count.likes,
    commentCount: post._count.comments,
    likedByMe: post.likes.length > 0,
    mine: post.authorId === viewerId,
    recentComments: post.comments.toReversed().map((comment) => toComment(comment, viewerId)),
  })

  /** Post existente e visível para o usuário (sem bloqueio entre os dois). */
  async function visiblePost(user: AuthUser, postId: string) {
    const post = await db.post.findFirst({
      where: { id: postId, author: visibleTo(user.id) },
      select: { id: true, authorId: true, imageKey: true },
    })
    if (!post) throw notFound('Post')
    return post
  }

  async function likeState(user: AuthUser, postId: string): Promise<LikeResult> {
    const [likeCount, mine] = await Promise.all([
      db.postLike.count({ where: { postId } }),
      db.postLike.count({ where: { postId, userId: user.id } }),
    ])
    return { likeCount, likedByMe: mine > 0 }
  }

  return {
    /** Feed: mais recentes primeiro, paginado por cursor; opcionalmente só de um autor. */
    async list(user: AuthUser, query: z.output<typeof postsQuerySchema>): Promise<Page<Post>> {
      const cursor = decodeCursor(query.cursor, isTimeCursor)
      const rows = await db.post.findMany({
        where: {
          authorId: query.authorId,
          author: visibleTo(user.id),
          ...(cursor && {
            OR: [
              { createdAt: { lt: new Date(cursor.t) } },
              { createdAt: new Date(cursor.t), id: { lt: cursor.id } },
            ],
          }),
        },
        include: postInclude(user.id),
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: query.limit + 1,
      })
      const page = rows.slice(0, query.limit)
      const last = page.at(-1)
      return {
        items: page.map((post) => toPost(post, user.id)),
        nextCursor:
          rows.length > query.limit && last
            ? encodeCursor({ t: last.createdAt.toISOString(), id: last.id })
            : null,
      }
    },

    async get(user: AuthUser, postId: string) {
      await visiblePost(user, postId)
      const post = await db.post.findUniqueOrThrow({
        where: { id: postId },
        include: postInclude(user.id),
      })
      return toPost(post, user.id)
    },

    async create(user: AuthUser, file: Buffer, fields: z.output<typeof postFieldsSchema>) {
      if (fields.petId) {
        const pet = await db.pet.findUnique({
          where: { id: fields.petId },
          select: { ownerId: true },
        })
        if (!pet || pet.ownerId !== user.id)
          throw badRequest('INVALID_PET', 'Escolha um dos seus pets')
      }
      const image = await processImage(file, 1080)
      const key = newStorageKey(`posts/${user.id}`, 'webp')
      await storage.put(key, image, 'image/webp')
      const post = await db.post.create({
        data: { authorId: user.id, petId: fields.petId, caption: fields.caption, imageKey: key },
        include: postInclude(user.id),
      })
      return toPost(post, user.id)
    },

    async remove(user: AuthUser, postId: string) {
      const post = await visiblePost(user, postId)
      if (post.authorId !== user.id) throw forbidden('Só o autor pode apagar o post')
      await db.post.delete({ where: { id: postId } })
      await storage.delete([post.imageKey])
    },

    /** Curtir e descurtir são idempotentes: repetir não muda o resultado. */
    async like(user: AuthUser, postId: string) {
      await visiblePost(user, postId)
      await db.postLike.upsert({
        where: { postId_userId: { postId, userId: user.id } },
        create: { postId, userId: user.id },
        update: {},
      })
      return likeState(user, postId)
    },

    async unlike(user: AuthUser, postId: string) {
      await visiblePost(user, postId)
      await db.postLike.deleteMany({ where: { postId, userId: user.id } })
      return likeState(user, postId)
    },

    /** Comentários em ordem cronológica (como numa conversa). */
    async comments(
      user: AuthUser,
      postId: string,
      query: z.output<typeof commentsQuerySchema>,
    ): Promise<Page<Comment>> {
      await visiblePost(user, postId)
      const cursor = decodeCursor(query.cursor, isTimeCursor)
      const rows = await db.postComment.findMany({
        where: {
          postId,
          author: visibleTo(user.id),
          ...(cursor && {
            OR: [
              { createdAt: { gt: new Date(cursor.t) } },
              { createdAt: new Date(cursor.t), id: { gt: cursor.id } },
            ],
          }),
        },
        include: { author: authorSelect },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        take: query.limit + 1,
      })
      const page = rows.slice(0, query.limit)
      const last = page.at(-1)
      return {
        items: page.map((comment) => toComment(comment, user.id)),
        nextCursor:
          rows.length > query.limit && last
            ? encodeCursor({ t: last.createdAt.toISOString(), id: last.id })
            : null,
      }
    },

    async comment(user: AuthUser, postId: string, content: string) {
      await visiblePost(user, postId)
      const comment = await db.postComment.create({
        data: { postId, authorId: user.id, content },
        include: { author: authorSelect },
      })
      return toComment(comment, user.id)
    },

    /** Apaga o próprio comentário, ou qualquer comentário no próprio post. */
    async removeComment(user: AuthUser, commentId: string) {
      const comment = await db.postComment.findUnique({
        where: { id: commentId },
        select: { authorId: true, post: { select: { authorId: true } } },
      })
      if (!comment) throw notFound('Comentário')
      if (comment.authorId !== user.id && comment.post.authorId !== user.id) {
        throw forbidden('Você não pode apagar este comentário')
      }
      await db.postComment.delete({ where: { id: commentId } })
    },
  }
}
