// Service worker do TinPet: só notificações push. Não intercepta requisições nem guarda cache,
// então nunca segura uma versão antiga do site depois de um deploy.

self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

/** Só caminhos do próprio app: um push nunca abre outro site. */
function safePath(value) {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') ? value : '/'
}

self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = {}
  }
  event.waitUntil(
    self.registration.showNotification(data.title || 'TinPet', {
      body: data.body || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: data.tag,
      renotify: Boolean(data.tag),
      data: { url: safePath(data.url) },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = new URL(safePath(event.notification.data?.url), self.location.origin).href
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      const open = windows.find((client) => 'focus' in client)
      if (open) {
        return open.navigate(url).then((client) => (client ?? open).focus())
      }
      return self.clients.openWindow(url)
    }),
  )
})
