self.addEventListener('push', (event) => {
  if (!event.data) return
  const data = event.data.json()

  event.waitUntil((async () => {
    // Find any open dashboard windows
    const clientList = await clients.matchAll({ type: 'window', includeUncontrolled: true })

    // Tell active pages to play the chime themselves
    clientList.forEach(client => client.postMessage({ type: 'NEW_ORDER_PUSH', payload: data }))

    // Show the visual notification — silent when a page is alive (page handles sound)
    await self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: data.tag || 'new-order',
      renotify: true,
      silent: clientList.length > 0,
      data: { url: data.url || '/dashboard/orders' },
    })
  })())
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/dashboard/orders'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (client.url.includes('/dashboard') && 'focus' in client) {
          client.navigate(url)
          return client.focus()
        }
      }
      return clients.openWindow(url)
    })
  )
})
