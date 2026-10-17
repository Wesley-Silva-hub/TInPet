import type { Notification } from '@tinpet/shared'
import { Bell, Heart, MessageCircle, Sparkles } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { useEffect, useRef } from 'react'
import { Link } from 'react-router'
import { Avatar } from '../../components/ui/Avatar'
import { InfiniteSentinel } from '../../components/ui/InfiniteSentinel'
import { PageHeader } from '../../components/ui/PageHeader'
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States'
import { timeAgo } from '../../lib/time'
import { useNotifications, useReadAll } from './queries'

const icons = {
  POST_LIKE: { icon: Heart, className: 'bg-brand-500 text-white' },
  POST_COMMENT: { icon: MessageCircle, className: 'bg-sky-600 text-white' },
  MATCH: { icon: Sparkles, className: 'bg-sun-400 text-ink' },
} as const

function describe(notification: Notification) {
  const name = notification.actor?.name.split(' ')[0] ?? 'Alguém'
  switch (notification.type) {
    case 'POST_LIKE':
      return { text: `${name} curtiu sua publicação.`, to: `/posts/${notification.postId}` }
    case 'POST_COMMENT':
      return {
        text: `${name} comentou: “${notification.preview}”`,
        to: `/posts/${notification.postId}`,
      }
    case 'MATCH':
      return {
        text: `Deu match com o pet de ${name}! Que tal dar um oi?`,
        to: `/matches/${notification.matchId}`,
      }
  }
}

export function NotificationsPage() {
  const notifications = useNotifications()
  const readAll = useReadAll()
  const reduceMotion = useReducedMotion()
  const items = notifications.data?.pages.flatMap((page) => page.items) ?? []
  const marked = useRef(false)
  const hasUnread = items.some((item) => !item.read)

  // Abrir a página marca como lidas (os destaques em negrito continuam até sair da página)
  useEffect(() => {
    if (hasUnread && !marked.current) {
      marked.current = true
      readAll.mutate()
    }
  }, [hasUnread, readAll])

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4">
      <PageHeader title="Notificações" />
      {notifications.isPending && <LoadingState />}
      {notifications.isError && (
        <ErrorState error={notifications.error} onRetry={() => notifications.refetch()} />
      )}
      {notifications.isSuccess && items.length === 0 && (
        <EmptyState icon={<Bell className="size-8" />} title="Nada por aqui ainda">
          Quando alguém curtir, comentar ou der match com seu pet, você fica sabendo aqui.
        </EmptyState>
      )}
      <ul className="flex flex-col gap-1">
        {items.map((notification, index) => {
          const { text, to } = describe(notification)
          const { icon: Icon, className } = icons[notification.type]
          return (
            <motion.li
              key={notification.id}
              initial={reduceMotion ? false : { opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: Math.min(index, 8) * 0.03 }}
            >
              <Link
                to={to}
                className={`flex items-center gap-3 rounded-2xl p-3 transition hover:bg-surface-2 ${
                  notification.read ? '' : 'bg-brand-50'
                }`}
              >
                <span className="relative shrink-0">
                  <Avatar
                    src={notification.actor?.avatarUrl}
                    name={notification.actor?.name ?? '?'}
                    className="size-12"
                  />
                  <span
                    className={`absolute -right-1 -bottom-1 grid size-6 place-items-center rounded-full border-2 border-canvas ${className}`}
                  >
                    <Icon className="size-3.5" aria-hidden />
                  </span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`line-clamp-2 ${notification.read ? '' : 'font-semibold'}`}>
                    {text}
                  </span>
                  <time dateTime={notification.createdAt} className="text-xs text-muted">
                    {timeAgo(notification.createdAt)}
                  </time>
                </span>
                {notification.postImageUrl && (
                  <img
                    src={notification.postImageUrl}
                    alt=""
                    className="size-12 shrink-0 rounded-lg object-cover"
                  />
                )}
                {!notification.read && (
                  <span className="size-2.5 shrink-0 rounded-full bg-brand-500">
                    <span className="sr-only">não lida</span>
                  </span>
                )}
              </Link>
            </motion.li>
          )
        })}
      </ul>
      <InfiniteSentinel
        hasMore={Boolean(notifications.hasNextPage)}
        loading={notifications.isFetchingNextPage}
        onLoadMore={() => notifications.fetchNextPage()}
      />
    </div>
  )
}
