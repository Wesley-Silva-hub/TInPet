/**
 * Dados de desenvolvimento e demonstração. Idempotente: tabelas de domínio por upsert e dados
 * de demonstração (e-mails @tinpet.dev e artigos do seed) recriados a cada execução.
 * Fotos reais CC0 em ./seed-assets (ver CREDITS.md). Senha de todos os usuários: tinpet123
 */
import { readFileSync } from 'node:fs'
import { extractHashtags } from '@tinpet/shared'
import argon2 from 'argon2'
import type { Species } from '../src/generated/prisma/client'
import { roundCoordinate } from '../src/shared/dto'
import { loadEnv } from '../src/shared/env'
import { createPrisma } from '../src/shared/prisma'
import { createStorage, newStorageKey } from '../src/shared/storage/storage'
import {
  articles,
  breeds,
  commentPool,
  companies,
  maritalStatuses,
  owners,
  professions,
} from './seed-data'

const env = loadEnv()
const db = createPrisma(env.DATABASE_URL)
const storage = createStorage(env)
const DEMO_DOMAIN = '@tinpet.dev'
const DAY_MS = 24 * 60 * 60 * 1000
const now = Date.now()

/** Gerador pseudoaleatório com semente fixa: o seed produz sempre o mesmo resultado. */
let seed = 42
function random() {
  seed = (seed * 1_103_515_245 + 12_345) % 2_147_483_648
  return seed / 2_147_483_648
}
const pick = <T>(items: readonly T[]) => items[Math.floor(random() * items.length)] as T

/** Cada uso de uma foto vira um arquivo próprio no storage (apagar um não afeta o outro). */
async function upload(folder: string, asset: string) {
  const key = newStorageKey(folder, 'webp')
  const file = readFileSync(new URL(`./seed-assets/${asset}.webp`, import.meta.url))
  await storage.put(key, file, 'image/webp')
  return key
}

async function seedLookups() {
  for (const name of maritalStatuses) {
    await db.maritalStatus.upsert({ where: { name }, create: { name }, update: {} })
  }
  for (const name of professions) {
    await db.profession.upsert({ where: { name }, create: { name }, update: {} })
  }
  for (const [species, names] of Object.entries(breeds) as [Species, string[]][]) {
    for (const name of names) {
      await db.breed.upsert({
        where: { species_name: { species, name } },
        create: { species, name },
        update: {},
      })
    }
  }
}

async function clearDemoData() {
  const demoUsers = await db.user.findMany({
    where: { email: { endsWith: DEMO_DOMAIN } },
    include: {
      pets: { include: { photos: true } },
      products: true,
      posts: { select: { imageKey: true } },
    },
  })
  const seededArticles = await db.article.findMany({
    where: { slug: { in: articles.map((article) => article.slug) } },
  })
  const keys = [
    ...demoUsers.flatMap((user) => [
      ...(user.avatarKey ? [user.avatarKey] : []),
      ...user.pets.flatMap((pet) => pet.photos.map((photo) => photo.storageKey)),
      ...user.products.flatMap((product) => (product.imageKey ? [product.imageKey] : [])),
      ...user.posts.map((post) => post.imageKey),
    ]),
    ...seededArticles.flatMap((article) => (article.coverKey ? [article.coverKey] : [])),
  ]
  await db.user.deleteMany({ where: { email: { endsWith: DEMO_DOMAIN } } })
  await db.article.deleteMany({
    where: { id: { in: seededArticles.map((article) => article.id) } },
  })
  await storage.delete(keys)
}

async function main() {
  await seedLookups()
  await clearDemoData()

  const passwordHash = await argon2.hash('tinpet123')
  const consentAt = new Date(now - 30 * DAY_MS)
  const [statusList, professionList, breedList] = await Promise.all([
    db.maritalStatus.findMany(),
    db.profession.findMany(),
    db.breed.findMany(),
  ])

  const userIds = new Map<string, string>()
  const petIds = new Map<string, string>()
  const postIds: { id: string; authorId: string; createdAt: Date }[] = []

  for (const owner of owners) {
    const user = await db.user.create({
      data: {
        email: `${owner.key}${DEMO_DOMAIN}`,
        passwordHash,
        name: owner.name,
        bio: owner.bio,
        birthDate: new Date(`${owner.birth}T00:00:00Z`),
        role: 'OWNER',
        maritalStatusId: statusList.find((s) => s.name === owner.marital)?.id ?? null,
        professionId: professionList.find((p) => p.name === owner.profession)?.id ?? null,
        latitude: roundCoordinate(owner.lat),
        longitude: roundCoordinate(owner.lng),
        city: owner.city,
        state: owner.state,
        consentTermsAt: consentAt,
        consentLocationAt: consentAt,
        avatarKey: await upload(`avatars/${owner.key}`, owner.avatar),
        createdAt: consentAt,
      },
    })
    userIds.set(owner.key, user.id)

    for (const pet of owner.pets) {
      const created = await db.pet.create({
        data: {
          ownerId: user.id,
          name: pet.name,
          species: pet.species,
          breedId:
            breedList.find((b) => b.species === pet.species && b.name === pet.breed)?.id ?? null,
          sex: pet.sex,
          size: pet.size,
          purpose: pet.purpose,
          birthDate: new Date(`${pet.birth}T00:00:00Z`),
          bio: pet.bio,
        },
      })
      petIds.set(pet.key, created.id)
      for (const [position, asset] of pet.photos.entries()) {
        await db.petPhoto.create({
          data: {
            petId: created.id,
            position,
            storageKey: await upload(`pets/${created.id}`, asset),
          },
        })
      }
    }

    for (const [asset, caption, petKey, daysAgo] of owner.posts) {
      const createdAt = new Date(now - daysAgo * DAY_MS)
      const post = await db.post.create({
        data: {
          authorId: user.id,
          petId: petKey ? (petIds.get(petKey) ?? null) : null,
          caption,
          imageKey: await upload(`posts/${user.id}`, asset),
          createdAt,
          hashtags: { create: extractHashtags(caption).map((tag) => ({ tag, createdAt })) },
        },
      })
      postIds.push({ id: post.id, authorId: user.id, createdAt })
    }
  }

  // Curtidas e comentários de outros tutores, sempre depois da publicação
  const everyone = [...userIds.values()]
  for (const post of postIds) {
    const others = everyone.filter((id) => id !== post.authorId)
    const likers = others.filter(() => random() < 0.55)
    await db.postLike.createMany({
      data: likers.map((userId) => ({ postId: post.id, userId, createdAt: post.createdAt })),
    })
    // Avisos ao autor (os da última semana chegam como não lidos)
    const recent = now - post.createdAt.getTime() < 7 * DAY_MS
    await db.notification.createMany({
      data: likers.map((actorId) => ({
        userId: post.authorId,
        actorId,
        type: 'POST_LIKE' as const,
        postId: post.id,
        createdAt: post.createdAt,
        readAt: recent ? null : post.createdAt,
      })),
    })
    const commentCount = Math.floor(random() * 4)
    for (let i = 0; i < commentCount; i++) {
      const comment = await db.postComment.create({
        data: {
          postId: post.id,
          authorId: pick(others),
          content: pick(commentPool),
          createdAt: new Date(post.createdAt.getTime() + (i + 1) * 37 * 60 * 1000),
        },
      })
      await db.notification.create({
        data: {
          userId: post.authorId,
          actorId: comment.authorId,
          type: 'POST_COMMENT',
          postId: post.id,
          preview: comment.content,
          createdAt: comment.createdAt,
          readAt: recent ? null : comment.createdAt,
        },
      })
    }
  }

  // Match já existente com conversa: Bento (Rafael) e Pretinha (Paula)
  const pairs: [string, string][] = [['bento', 'pretinha']]
  for (const [a, b] of pairs) {
    const petA = petIds.get(a) as string
    const petB = petIds.get(b) as string
    await db.swipe.createMany({
      data: [
        { fromPetId: petA, toPetId: petB, direction: 'LIKE' },
        { fromPetId: petB, toPetId: petA, direction: 'LIKE' },
      ],
    })
    const [petAId, petBId] = [petA, petB].sort() as [string, string]
    const match = await db.match.create({
      data: { petAId, petBId, createdAt: new Date(now - 2 * DAY_MS) },
    })
    const rafael = userIds.get('rafael') as string
    const paula = userIds.get('paula') as string
    const conversation = [
      [paula, 'Oi, Rafael! A Pretinha adorou o Bento 😄'],
      [rafael, 'Oi, Paula! O Bento também. Vocês passeiam no Ibirapuera?'],
      [paula, 'Sábado de manhã, depois do meu plantão. Bora?'],
      [rafael, 'Fechado! Às 8h perto do portão 3?'],
    ] as const
    for (const [index, [senderId, content]] of conversation.entries()) {
      await db.message.create({
        data: {
          matchId: match.id,
          senderId,
          content,
          createdAt: new Date(now - DAY_MS + index * 15 * 60 * 1000),
          readAt: index < conversation.length - 1 ? new Date() : null,
        },
      })
    }
  }

  // Carteiras de vacinação: em dia para a maioria; o Bento tem reforço chegando (vira lembrete)
  const daysFromNow = (days: number) => new Date(now + days * DAY_MS)
  for (const owner of owners) {
    for (const pet of owner.pets) {
      const petId = petIds.get(pet.key) as string
      const isDog = pet.species === 'DOG'
      const isCat = pet.species === 'CAT'
      if (!isDog && !isCat) continue
      await db.petVaccine.createMany({
        data: [
          {
            petId,
            name: 'Antirrábica',
            appliedAt: daysFromNow(-120),
            nextDueAt: daysFromNow(245),
            clinic: 'Clínica Veterinária Bem-Estar',
          },
          {
            petId,
            name: isDog ? 'V10 (polivalente canina)' : 'V4 (polivalente felina)',
            appliedAt: daysFromNow(pet.key === 'bento' ? -356 : -60),
            nextDueAt: daysFromNow(pet.key === 'bento' ? 9 : 305),
            clinic: 'Clínica Veterinária Bem-Estar',
          },
        ],
      })
    }
  }

  // A Kira (Larissa) já curtiu o Bento: se o Rafael curtir a Kira, dá match na hora
  await db.swipe.create({
    data: {
      fromPetId: petIds.get('kira') as string,
      toPetId: petIds.get('bento') as string,
      direction: 'LIKE',
    },
  })

  // Pet perdido de demonstração: a Mel sumiu no Ininga, com dois avistamentos
  const camila = userIds.get('camila') as string
  const melId = petIds.get('mel') as string
  const lostMel = await db.lostPetAlert.create({
    data: {
      petId: melId,
      ownerId: camila,
      description:
        'Labradora caramelo, coleira azul com plaquinha. É dócil, mas assusta com moto. Atende por "Mel".',
      rewardCents: 20000,
      neighborhood: 'Ininga',
      latitude: roundCoordinate(-5.0556),
      longitude: roundCoordinate(-42.7945),
      lastSeenAt: new Date(now - 3 * 3_600_000),
      createdAt: new Date(now - 2.5 * 3_600_000),
    },
  })
  const sightings = [
    [
      'julia',
      'Vi uma labradora caramelo correndo perto da UFPI, ia em direção à Av. Universitária.',
      -5.058,
      -42.799,
      100,
    ],
    [
      'sofia',
      'Acho que é ela! Estava bebendo água na praça aqui do Ininga agora há pouco.',
      -5.054,
      -42.793,
      40,
    ],
  ] as const
  for (const [reporter, message, latitude, longitude, minutesAgo] of sightings) {
    await db.petSighting.create({
      data: {
        petId: melId,
        alertId: lostMel.id,
        reporterId: userIds.get(reporter) as string,
        source: 'APP',
        message,
        latitude,
        longitude,
        createdAt: new Date(now - minutesAgo * 60_000),
      },
    })
  }
  const neighbors = owners
    .filter(
      (owner) => owner.key !== 'camila' && (owner.city === 'Teresina' || owner.city === 'Timon'),
    )
    .map((owner) => userIds.get(owner.key) as string)
  await db.notification.createMany({
    data: neighbors.map((userId) => ({
      userId,
      actorId: camila,
      type: 'LOST_PET_NEARBY' as const,
      alertId: lostMel.id,
      preview: 'Mel sumiu perto de Ininga',
      createdAt: new Date(now - 2.5 * 3_600_000),
    })),
  })
  // Plaquinha QR do Bento pronta para testar em /p/BENTXK7Q
  await db.pet.update({
    where: { id: petIds.get('bento') as string },
    data: { tagCode: 'BENTXK7Q' },
  })

  for (const article of articles) {
    await db.article.create({
      data: {
        slug: article.slug,
        title: article.title,
        summary: article.summary,
        body: article.body,
        category: article.category,
        readMinutes: article.readMinutes,
        coverKey: await upload('articles', article.cover),
        publishedAt: new Date(now - article.daysAgo * DAY_MS),
      },
    })
  }

  let promotionCount = 0
  const storeIds: string[] = []
  for (const company of companies) {
    const user = await db.user.create({
      data: {
        email: `${company.email}${DEMO_DOMAIN}`,
        passwordHash,
        name: company.name,
        birthDate: new Date('1985-01-01T00:00:00Z'),
        role: 'COMPANY',
        latitude: roundCoordinate(company.lat),
        longitude: roundCoordinate(company.lng),
        city: company.city,
        state: company.state,
        consentTermsAt: consentAt,
        consentLocationAt: consentAt,
        company: {
          create: {
            tradeName: company.tradeName,
            cnpj: company.cnpj,
            phone: company.phone,
            website: company.website,
            kind: company.kind,
            description: company.description,
            neighborhood: company.neighborhood,
            delivers: company.delivers,
          },
        },
      },
    })
    storeIds.push(user.id)
    for (const [index, product] of company.products.entries()) {
      const { image, promotion, ...data } = product
      const created = await db.product.create({
        data: {
          ...data,
          companyId: user.id,
          externalLink: company.website,
          createdAt: new Date(now - (index + 1) * 3_600_000),
        },
      })
      await db.product.update({
        where: { id: created.id },
        data: { imageKey: await upload(`products/${created.id}`, image) },
      })
      if (promotion) {
        const { endsInHours, ...offer } = promotion
        const startsAt = new Date(now - 6 * 3_600_000)
        // Números coerentes: cliques são uma fração das visualizações, cupons uma fração dos cliques
        const viewers = everyone.filter(() => random() < 0.75)
        const clicks = Math.max(1, Math.round(viewers.length * (0.15 + random() * 0.2)))
        const boosted = await db.promotion.create({
          data: {
            ...offer,
            companyId: user.id,
            productId: created.id,
            startsAt,
            endsAt: new Date(now + endsInHours * 3_600_000),
            clicks,
            couponReveals: offer.couponCode ? Math.max(1, Math.round(clicks * 0.6)) : 0,
          },
        })
        await db.promotionImpression.createMany({
          data: viewers.map((userId) => ({ promotionId: boosted.id, userId, day: startsAt })),
        })
        promotionCount++
      }
    }
  }

  // Stories no ar (somem em 24 h; rode o seed de novo para renovar)
  let storyCount = 0
  for (const [index, owner] of owners.slice(0, 4).entries()) {
    const authorId = userIds.get(owner.key)
    const [asset, , petKey] = owner.posts[0] ?? []
    if (!authorId || !asset) continue
    await db.story.create({
      data: {
        authorId,
        petId: petKey ? (petIds.get(petKey) ?? null) : null,
        imageKey: await upload(`stories/${authorId}`, asset),
        caption:
          ['Bom dia, vizinhança! ☀️', 'Hora do passeio 🐾', '', 'Olha quem acordou 😴'][index] ?? '',
        createdAt: new Date(now - (index + 1) * 3_600_000),
        expiresAt: new Date(now + (23 - index) * 3_600_000),
      },
    })
    storyCount++
  }

  // Eventos de pets nos próximos dias, perto dos tutores de demonstração
  const day = 86_400_000
  const atHour = (daysAhead: number, hour: number) => {
    const date = new Date(now + daysAhead * day)
    date.setUTCHours(hour + 3, 0, 0, 0)
    return date
  }
  const demoEvents = [
    {
      key: owners[0]?.key,
      title: 'Cãominhada no Parque da Cidadania',
      kind: 'WALK' as const,
      species: ['DOG' as const],
      startsAt: atHour(2, 16),
      endsAt: atHour(2, 18),
      place: 'Parque da Cidadania, entrada principal',
      neighborhood: 'Centro',
      description: 'Passeio leve de 3 km. Traga água, saquinho e coleira com guia.',
    },
    {
      key: owners[1]?.key,
      title: 'Feira de adoção responsável',
      kind: 'ADOPTION_FAIR' as const,
      species: [],
      startsAt: atHour(5, 9),
      endsAt: atHour(5, 13),
      place: 'Praça Pedro II',
      neighborhood: 'Centro',
      description: 'ONGs parceiras com cães e gatos vacinados e castrados esperando um lar.',
    },
    {
      key: owners[2]?.key,
      title: 'Encontro de gateiros',
      kind: 'MEETUP' as const,
      species: ['CAT' as const],
      startsAt: atHour(9, 15),
      endsAt: null,
      place: 'Café do Jóquei, área externa',
      neighborhood: 'Jóquei',
      description:
        'Troca de dicas de alimentação e enriquecimento ambiental. Gatos em caixa de transporte.',
    },
  ]
  let eventCount = 0
  for (const event of demoEvents) {
    const organizer = owners.find((item) => item.key === event.key)
    const organizerId = event.key ? userIds.get(event.key) : undefined
    if (!organizer || !organizerId) continue
    const { key: _key, ...data } = event
    const created = await db.petEvent.create({
      data: {
        ...data,
        organizerId,
        latitude: roundCoordinate(organizer.lat),
        longitude: roundCoordinate(organizer.lng),
      },
    })
    const guests = [...userIds.values()]
      .filter((id) => id !== organizerId)
      .slice(eventCount, eventCount + 4)
    await db.eventAttendee.createMany({
      data: guests.map((userId) => ({ eventId: created.id, userId })),
    })
    eventCount++
  }

  // Avaliações das lojas: notas coerentes (maioria boa, algumas medianas)
  const reviewComments = [
    'Atendimento muito atencioso, voltarei com certeza.',
    'Entrega rápida e produtos bem embalados.',
    'Preço justo, mas a fila estava grande.',
    '',
    'Equipe carinhosa com o meu pet!',
  ]
  const reviewers = [...userIds.values()]
  let reviewCount = 0
  for (const [storeIndex, storeId] of storeIds.entries()) {
    for (const [index, authorId] of reviewers.slice(storeIndex, storeIndex + 4).entries()) {
      await db.storeReview.create({
        data: {
          storeId,
          authorId,
          rating: random() < 0.75 ? 5 - (index % 2) : 3,
          comment: reviewComments[(storeIndex + index) % reviewComments.length] ?? '',
        },
      })
      reviewCount++
    }
  }

  // Passeadores: dois tutores que também passeiam com pets da vizinhança
  const walkerBios = [
    'Passeio com 1 pet por vez, sempre com guia e saquinho. Mando foto no fim!',
    'Estudante de veterinária, adoro cães grandes. Passeios longos de manhã cedo.',
  ]
  let walkerCount = 0
  for (const [index, owner] of owners.slice(-2).entries()) {
    const userId = userIds.get(owner.key)
    if (!userId) continue
    await db.walkerProfile.create({
      data: {
        userId,
        bio: walkerBios[index] ?? '',
        priceCents: [3000, 4500][index] ?? 3000,
        walkMinutes: [30, 60][index] ?? 30,
        neighborhoods: ['Jóquei, Fátima', 'Ininga, Noivos'][index] ?? '',
        species: ['DOG'],
        weekdays: [
          [1, 2, 3, 4, 5],
          [0, 3, 5, 6],
        ][index] ?? [1, 2, 3, 4, 5],
      },
    })
    walkerCount++
  }

  // Moderação: conta ADMIN (só por seed ou SQL; o cadastro público não cria) e denúncias de exemplo
  await db.user.create({
    data: {
      email: `moderacao${DEMO_DOMAIN}`,
      passwordHash,
      name: 'Equipe de Moderação',
      birthDate: new Date('1990-01-01T00:00:00Z'),
      role: 'ADMIN',
      consentTermsAt: consentAt,
    },
  })
  const [firstOwner, secondOwner, thirdOwner] = [...userIds.values()]
  if (firstOwner && secondOwner && thirdOwner) {
    await db.report.createMany({
      data: [
        {
          reporterId: firstOwner,
          reportedId: thirdOwner,
          reason: 'SPAM',
          details: 'Mandou o mesmo link de venda para várias pessoas no chat.',
        },
        {
          reporterId: secondOwner,
          reportedId: thirdOwner,
          reason: 'FAKE_PROFILE',
          details: 'As fotos parecem ser de outro pet.',
        },
      ],
    })
  }

  process.stdout.write(
    `Seed concluído: ${owners.length} tutores, ${petIds.size} pets, ${postIds.length} posts, ${articles.length} artigos, ${companies.length} lojas, ${promotionCount} ofertas no ar, ${eventCount} eventos, ${reviewCount} avaliações, ${storyCount} stories, ${walkerCount} passeadores. Senha: tinpet123\n`,
  )
}

try {
  await main()
} finally {
  await db.$disconnect()
}
