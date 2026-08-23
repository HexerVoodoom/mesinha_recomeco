import { registerSW } from 'virtual:pwa-register';

// De quanto em quanto tempo perguntamos ao servidor se saiu versão nova.
const INTERVALO_CHECAGEM = 60 * 1000; // 1 minuto

let jaRecarregou = false;

/**
 * Registra o service worker e mantém o app sempre na última versão.
 *
 * Antes, o service worker só baixava a versão nova depois que o app já tinha
 * aberto com a versão antiga — por isso a mudança só aparecia "na próxima vez".
 * Aqui a gente:
 *  1. checa por atualização assim que abre (e de minuto em minuto, e toda vez
 *     que o app volta pro primeiro plano);
 *  2. recarrega a tela sozinho quando a versão nova assume o controle.
 */
export function registrarAtualizacaoAutomatica() {
  if (!('serviceWorker' in navigator)) return;

  // Quando o service worker novo assume, recarrega pra pegar os arquivos novos.
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (jaRecarregou) return;
    jaRecarregou = true;
    window.location.reload();
  });

  const atualizar = registerSW({
    immediate: true,
    onNeedRefresh() {
      // Aplica na hora, sem perguntar nada pra pessoa.
      atualizar(true);
    },
    onRegisteredSW(_url, registro) {
      if (!registro) return;

      const checar = () => {
        registro.update().catch(() => {
          // Sem rede agora — tenta de novo na próxima checagem.
        });
      };

      checar();
      setInterval(checar, INTERVALO_CHECAGEM);

      // App voltando do segundo plano é o melhor momento pra checar.
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') checar();
      });
      window.addEventListener('online', checar);
    },
  });
}
