self.addEventListener('push', function (event) {
  if (!event.data) return;

  var data = {};
  try { data = event.data.json(); } catch (e) { data = { title: 'Mesinha', body: event.data.text() }; }

  var title = data.title || 'Mesinha 💗';
  var options = {
    body: data.body || '',
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    tag: data.tag || 'mesinha-update',
    data: { url: data.url || '/' },
    requireInteraction: false,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();

  var url = (event.notification.data && event.notification.data.url)
    ? event.notification.data.url
    : '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if ('focus' in client) {
          // Leva a aba já aberta até a tela da notificação antes de focar —
          // antes o endereço mandado no push era simplesmente ignorado quando
          // o app já estava aberto.
          if ('navigate' in client && url) {
            return client.navigate(url).then(function (focado) {
              return (focado || client).focus();
            }).catch(function () {
              return client.focus();
            });
          }
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
