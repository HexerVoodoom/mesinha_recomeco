# Mesinha — Documentação do Projeto

App de casal para Amanda & Mateus: lista compartilhada, mural de memórias, lembretes com notificações push.

---

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | React + Vite (Figma Make) |
| Backend | Supabase Edge Functions (Deno + Hono) |
| Banco de dados | Supabase PostgreSQL |
| Armazenamento KV | Tabela JSONB `kv_store_19717bce` |
| Notificações push | Web Push API + VAPID |
| Cron | pg_cron (PostgreSQL extension) |
| Deploy | GitHub Actions → Supabase CLI |
| Hosting | Supabase (edge function) + Figma Make (frontend) |

---

## Supabase

- **Project ID:** `oubdmmaqxnutbbxiqeow`
- **Edge function:** `make-server-19717bce`
- **Base URL:** `https://oubdmmaqxnutbbxiqeow.supabase.co/functions/v1/make-server-19717bce`
- **KV Table:** `kv_store_19717bce` (key TEXT PRIMARY KEY, value JSONB)
- **DB Index:** `idx_kv_items_createdat` em `value->>'createdAt'` (DESC NULLS LAST) — cobre paginação do mural

### Links úteis

- Dashboard: https://supabase.com/dashboard/project/oubdmmaqxnutbbxiqeow
- Tabelas: https://supabase.com/dashboard/project/oubdmmaqxnutbbxiqeow/database/tables
- Edge Functions: https://supabase.com/dashboard/project/oubdmmaqxnutbbxiqeow/functions
- Logs da função: https://supabase.com/dashboard/project/oubdmmaqxnutbbxiqeow/functions/make-server-19717bce/logs
- Disk IO / métricas: https://supabase.com/dashboard/project/oubdmmaqxnutbbxiqeow/reports

---

## Repositório

- **GitHub:** https://github.com/hexervoodoom/mesinha_recomeco
- **Branch de desenvolvimento atual:** `claude/mesinha-push-notifications-8ryckc`
- **Branch principal (produção):** `main`
- **Backup estável:** tag `backup/working-2026-06-24`

### Fluxo de trabalho

Toda mudança segue: branch → commit → push → PR → CI verde → **merge em `main`**
(squash). O merge é automático, não fica esperando aprovação — as regras
completas estão no `CLAUDE.md`, na raiz do repositório.

---

## Deploy

O deploy do backend acontece **automaticamente** via GitHub Actions ao fazer push para `main` se houver mudanças em `supabase/functions/**`.

Workflow: `.github/workflows/deploy-supabase.yml`

Para deploy manual via CLI:
```bash
supabase functions deploy server --project-ref oubdmmaqxnutbbxiqeow
```

O frontend é hospedado pelo Figma Make — o build (`npm run build`) é feito separadamente e publicado pela plataforma.

---

## API Endpoints

Todos prefixados em `/make-server-19717bce`:

| Método | Rota | Descrição |
|---|---|---|
| GET | `/health` | Health check |
| POST | `/login` | Autenticação (Amanda / Mateus) |
| GET | `/items` | Lista itens com paginação e filtro de categoria |
| GET | `/items/:id/full` | Item completo (incluindo conteúdo pesado) |
| GET | `/items/:id/photo` | Foto do item (base64) |
| POST | `/items` | Cria novo item |
| PUT | `/items/:id` | Atualiza item existente |
| DELETE | `/items/:id` | Remove item |
| GET | `/settings` | Configurações do casal |
| PUT | `/settings` | Atualiza configurações |
| GET | `/backup/stats` | Estatísticas do backup |
| GET | `/backup` | Exporta backup completo |
| POST | `/push-subscription` | Registra subscription push de um usuário |
| DELETE | `/push-subscription` | Remove subscription push |
| POST | `/trigger-reminders` | Dispara lembretes (chamado pelo pg_cron) |
| POST | `/nudge` | Cutucada: push imediato pro outro (rate limit de 3 min por pessoa) |
| GET | `/memories/on-this-day` | Posts do mural desta data em anos anteriores (cache diário em KV) |
| GET | `/question-of-the-day` | Pergunta do dia (cria na 1ª chamada); esconde a resposta do outro até os dois responderem |
| POST | `/question-of-the-day/answer` | Responde a pergunta de hoje |
| GET/POST/DELETE | `/question-bank` | Banco de perguntas escritas pelo casal |
| GET/POST/DELETE | `/cards` | Baralho de cartas dos jogos (verdade / desafio / o que prefere) |
| GET | `/garden` | Sequência, nível do jardim e retrospectiva (cache diário, invalidado por contagem) |
| GET | `/meetup-month` | Dias com encontro de um mês (tipo + confirmação) — usado pelos widgets nativos de calendário; `?month=YYYY-MM` opcional (padrão: mês atual) |
| GET | `/wakeups` | Lista os despertadores (com o status do último toque de cada um). `?native=<perfil>` marca o aparelho como apto a receber o FCM de sincronização |
| GET | `/wakeups/version` | Carimbo que muda a cada alteração (leitura por chave, barata). As telas perguntam isso e só baixam a lista quando muda |
| POST | `/wakeups` | Cria despertador (pra si, pro outro ou pros dois) — push avisando quem vai ser acordado + FCM de sincronização |
| PUT/DELETE | `/wakeups/:id` | Edita / apaga (e sincroniza os celulares) |
| POST | `/wakeups/:id/ring` | O aparelho avisa que começou a tocar (`ringing`) ou que tocou 30 min sem ninguém desligar (`missed`). Aviso de um toque mais antigo que o gravado é ignorado |
| POST | `/wakeups/:id/dismiss` | Desligou: grava o recadinho (só aceita um dos 6) e manda de push pro outro — um push só se dois despertadores desligarem juntos |

### Padrões de chave no KV

| Prefixo | Conteúdo |
|---|---|
| `item:` | Todos os itens (listas, mural, alarmes…) |
| `settings` | Configurações globais do app (inclui `togetherSince` do contador "juntos há X") |
| `push-subscription:Amanda` | Subscription push da Amanda |
| `push-subscription:Mateus` | Subscription push do Mateus |
| `nudge-last:<perfil>` | Timestamp da última cutucada (rate limit) |
| `on-this-day:<data>` | Cache diário das memórias do "Neste dia" |
| `question-bank` | Perguntas do dia escritas pelo casal |
| `question-used` | Últimas 60 perguntas usadas (evita repetir) |
| `card-deck` | Cartas dos jogos escritas pelo casal, por tipo |
| `garden:<data>` | Cache diário da sequência/retrospectiva |
| `wakeup:<id>` | Despertador (horário, dias, destinatário, volume, recadinho) |
| `wakeupring:<id>:<perfil>` | Status do último toque DAQUELA pessoa (chave própria: com "nós dois" os celulares avisam no mesmo segundo e, num objeto só, um aviso apagava o outro) |
| `wakeupversion` | Carimbo que muda a cada alteração de despertador/toque |
| `wakeup-push-last:<perfil>` | Último push de "desligou" (evita push repetido com dois despertadores no mesmo minuto) |
| `wakeup-native:<perfil>` | O app Android dessa pessoa já tem despertador (recebe o FCM `wakeup-sync`) |

---

## Calendário de Lançamento das Features

Todas as features novas já estão no código em `main`, mas cada uma fica
**invisível** até a data dela — **duas por mês**, pra ser surpresa. Não existe
cadeado nem "em breve": o ícone simplesmente não aparece na grade até abrir, e
no dia aparece um aviso de novidade (uma única vez por aparelho).

**Arquivo:** `src/app/utils/featureSchedule.ts`

As datas alternam entre o **dia 19** (fixo, nunca muda) e o **dia 4**. Esse par
é o que dá o espaçamento mais parelho mantendo o 19: 15 dias do 4 pro 19, e 13
a 16 do 19 pro 4 do mês seguinte (em meses de 30 dias fica 15/15 exato). No
calendário atual o intervalo fica entre 15 e 16 dias, média 15,3.

```
step 0 -> 19/ago   step 1 -> 04/set   step 2 -> 19/set   step 3 -> 04/out ...
```

Para ajustar, mexa em três constantes:

- `FIRST_RELEASE` — mês/ano da estreia (a estreia cai no `MAIN_DAY` desse mês)
- `MAIN_DAY` — o dia fixo (19)
- `MID_DAY` — o dia da segunda surpresa do mês (4)

A ordem de lançamento é a ordem da lista `FEATURE_SCHEDULE`; o campo `step` é
a posição na fila (0 = a estreia). Para adiantar uma feature, basta baixar o
`step` dela. Steps pares sempre caem no dia 19.

| Peça | Como respeita o calendário |
|---|---|
| Ícones da grade | `CategoryMenu` filtra por `SCHEDULED_CATEGORIES` / `SCHEDULED_TOOLS` |
| Swipe entre categorias | `visibleCategories()` (exportada pelo `CategoryMenu`) |
| Card "Neste dia", contador, reações | Gate direto com `isFeatureUnlocked()` na `Home` |
| Contador em Configurações | Gate com `isFeatureUnlocked('counter')` |
| Aviso de novidade | `FeatureAnnouncement`, com `seenFeatureAnnouncements` no localStorage |

O gate é **de interface**: o backend responde normalmente a todas as rotas
desde o merge. Isso é proposital — se uma feature for adiantada, ela funciona
na hora, sem precisar de deploy do servidor.

Quem instala o app pela primeira vez depois de várias features já terem
aberto **não recebe a fila de avisos atrasados** (`backfillAnnouncementsOnFirstRun`)
— só vê os avisos das que abrirem dali pra frente.

---

## Categorias de Item

| Categoria | Uso |
|---|---|
| `mural` | Posts do mural (text, image, video, audio) |
| `alarm` | Lembretes com horário, dias e destinatário |
| `lista` | Listas compartilhadas |
| `capsule` | Cápsula do tempo: carta/foto que só abre na data (`eventDate`). O conteúdo é escondido **no servidor** enquanto lacrada (`capsuleLocked: true` na resposta); push ao lacrar e no dia da abertura (cron 08:00) |
| `mood` | Sabor do Dia (doce, salgado, azedo, amargo, apimentado, umami, agridoce, sem gosto). Id determinístico `mood-<perfil>-<data>` (upsert) => 1 registro por pessoa por dia e push no máximo 1x/dia. Aceita registro retroativo (tocar num dia vazio do calendário) e tocar num sabor já registrado abre o modal com o recadinho |
| `question` | Pergunta do dia. Id `question-<data>`, com `answerAmanda`/`answerMateus` |
| `chore` | Tarefa de casa com rodízio (`choreAssignee`, `choreRotates`, `choreDoneCount`, `choreLastDoneBy/At`) |
| `bucket` | Lista de sonhos (com barra de progresso) |
| `gratitude` | Registros de gratidão |
| _(outros)_ | Extensível |

---

## Notificações Push

### Configuração VAPID

- **Chave pública:** `BEeyyQPVJ900xV1F1Jo8Q2TNc2DK7jb9jyiqmQQX3QnUwzJYxy1j5BByQ0vJFDSbPTGacjS3oUtpOKCtxAF5WIY`
- A chave privada fica em variável de ambiente `VAPID_PRIVATE_KEY` no Supabase

### Fluxo de registro

1. App abre → `useNotifications` verifica `Notification.permission`
2. Se `'default'`: pede permissão ao usuário
3. Se `'granted'`: chama `subscribeToPush(currentUser)` → POST `/push-subscription`
4. Subscription salva em KV como `push-subscription:Amanda` ou `push-subscription:Mateus`

### Quando chega notificação

| Evento | Destinatário |
|---|---|
| Post novo no mural | O **outro** usuário (imediatamente no POST) |
| Lembrete de alarme | Usuário(s) configurados — disparado pelo cron |

### Cron de lembretes

- **Frequência:** a cada minuto (pg_cron)
- **Endpoint:** POST `/trigger-reminders`
- **Secret:** header `X-Cron-Secret: mesinha-cron-2024` (também em env `CRON_SECRET`)
- **Limit de itens lidos:** 50 (reduzido de 1000 para economizar Disk IO)

SQL para criar o cron (roda uma vez no banco):
```sql
select cron.schedule(
  'mesinha-reminders',
  '* * * * *',
  $$
    select net.http_post(
      'https://oubdmmaqxnutbbxiqeow.supabase.co/functions/v1/make-server-19717bce/trigger-reminders',
      '{}',
      '{"Content-Type": "application/json", "X-Cron-Secret": "mesinha-cron-2024"}'
    );
  $$
);
-- Para cancelar:
select cron.unschedule('mesinha-reminders');
```

### Status atual das subscriptions

- **Amanda:** tem subscription FCM ativa — recebe notificações
- **Mateus:** sem subscription registrada — precisa abrir o app e aceitar a permissão de notificação

---

## Arquitetura do Cache (Frontend)

O app usa `localStorage` como cache offline sob a chave `offlineItems`.

### Função `toLightItem`

Converte itens pesados para versão leve antes de salvar no cache:
- Remove `muralContent` (exceto para posts de texto, onde fica salvo)
- Converte `muralPhoto` (base64) para o sentinel `'HAS_PHOTO'`
- Mantém todos os outros campos

### `saveItemsToStorage(items)`

Helper que serializa e salva a lista completa no localStorage. Limpa o cache em caso de erro de quota (ex.: muitas fotos em memória).

### Fluxo ao abrir o app

1. Carrega `offlineItems` do localStorage → exibe na tela imediatamente (sem delay)
2. `loadItems` busca os 100 primeiros itens do servidor (geral, todas as categorias)
3. `refreshCategoryItems('mural')` busca os 200 itens do mural especificamente
4. Ambos gravam no localStorage usando `setItems(prev => ...)` para evitar race conditions

---

## Arquivos Principais

| Arquivo | Responsabilidade |
|---|---|
| `src/app/pages/Home.tsx` | Página principal — estado global, carregamento, handlers |
| `src/app/components/MuralItemComponent.tsx` | Card do mural (texto, foto, vídeo, áudio) |
| `src/app/hooks/useNotifications.ts` | Push subscription + lembretes locais |
| `src/app/utils/api.ts` | Funções de acesso à API do backend |
| `supabase/functions/server/index.ts` | Edge function (Hono) — todos os endpoints |
| `supabase/functions/server/kv_store.tsx` | Abstração do KV store sobre Supabase |
| `tools/weekly-summary.mjs` | Script CLI para gerar resumo semanal via Claude |
| `.github/workflows/deploy-supabase.yml` | CI/CD automático para a edge function |

---

## Problemas Conhecidos / Limitações

### Disk IO (Supabase alert)

A causa raiz é o armazenamento de imagens em base64 dentro de colunas JSONB, que resulta em leituras de rows muito grandes. O cron de lembretes foi o maior contribuinte (lendo 1000 itens por minuto — reduzido para 50).

**Solução definitiva (não implementada):** migrar arquivos de mídia para o Supabase Storage e salvar apenas a URL no JSONB.

### Alarm sem dias configurados

O item "16 de março - trem do dota" tem `reminderDays: []` e nunca vai disparar. Para funcionar, editar o item no app e adicionar ao menos um dia da semana.

### Mateus sem notificação push

Mateus precisa abrir o app pelo celular/navegador e aceitar a permissão de notificação. Após aceitar, a subscription é registrada automaticamente e notificações de mural e lembretes passarão a chegar.

---

## Desenvolvimento Local

```bash
# Frontend
npm run dev       # http://localhost:5173

# Backend — a edge function roda no Supabase cloud
# Para testar endpoints localmente use curl ou Insomnia apontando para:
# https://oubdmmaqxnutbbxiqeow.supabase.co/functions/v1/make-server-19717bce/health
```

### Variáveis de ambiente do Supabase (secrets)

Configurados em: https://supabase.com/dashboard/project/oubdmmaqxnutbbxiqeow/settings/functions

| Variável | Uso |
|---|---|
| `SUPABASE_URL` | URL do projeto (injetada automaticamente) |
| `SUPABASE_SERVICE_ROLE_KEY` | Acesso admin ao banco (injetada automaticamente) |
| `VAPID_PRIVATE_KEY` | Assinar notificações push |
| `CRON_SECRET` | Autenticar chamadas do pg_cron |

---

## Resumo Semanal (ferramenta)

O script `tools/weekly-summary.mjs` gera um resumo semanal dos posts do mural usando a API do Claude.

```bash
cd tools
node weekly-summary.mjs
```

Requer `ANTHROPIC_API_KEY` e `API_BASE_URL` no `.env.local` (na raiz do projeto).

---

## Despertador

Ferramenta "Despertador" (ícone de sino na página 2 da grade), que abre um
painel no mesmo visual da Pergunta do Dia e do Jardim, com Corvinho (Mateus) e
Alpaquinha (Amanda) nos balõezinhos, como nos widgets. A tela do alarme
tocando, no Android e no navegador, segue esse mesmo visual. Qualquer um cria
um despertador **pra si, pro outro ou pros dois**, com horário, dias da semana
(nenhum dia = toca uma vez só), volume (**mínimo 20%**, nunca fica mudo) e um
recadinho opcional que aparece na tela quando tocar.

**Pra desligar não tem botão de desligar nem soneca:** a pessoa escolhe um de 6
recadinhos prontos, que vai de push pro outro. Quem criou pro outro vê no card
o status ao vivo: 🔔 tocando agora / ✅ desligou às 07:03 com "Bom dia, meu
amor! ☀️" / 😴 tocou 30 min e ninguém desligou.

### Quem toca de verdade é o app Android

| Peça | O que faz |
|---|---|
| `WakeupScheduler` (`Wakeups.kt`) | Agenda SÓ o próximo toque com `setAlarmClock` — exato, fura o Doze, ícone de despertador na barra |
| `WakeupReceiver` | Recebe o disparo, sobe o serviço e reagenda o próximo; reagenda também quando o relógio/fuso muda e quando o app atualiza |
| `WakeupRingService` | Serviço em primeiro plano: toca no canal de **alarme** (fura silencioso; o Não Perturbe libera alarmes por padrão), força o volume de alarme pro escolhido e sobe de novo se alguém abaixar, pede foco de áudio, vibra. Desiste depois de 30 min |
| `WakeupActivity` | Tela cheia por cima da tela de bloqueio com os 6 recadinhos. Voltar e teclas de volume não fazem nada |
| `WakeupTune.kt` | O toque (ver abaixo) |

**Sincronização:** a lista fica em cache no aparelho (toca sem internet). Ela
é baixada ao abrir o app, quando o PWA mexe nela (`MesinhaNative.wakeupsChanged`),
no boot e quando chega um FCM só de dados `wakeup-sync` — que o servidor manda
pros dois celulares sempre que a lista muda. É isso que faz o despertador que
o Mateus criou pra Amanda tocar no celular dela mesmo que ela nunca abra o app.
Os avisos de "tocando"/"desligou" que falham sem internet ficam numa fila e
são reenviados no próximo sync.

**Permissões:** alarme exato via `USE_EXACT_ALARM` (Android 13+, concedida na
instalação; no Android 12 `SCHEDULE_EXACT_ALARM`). É obrigatória: sem alarme
exato o Android 12+ não deixa subir o serviço que toca a música. A Play Console
pede a declaração de app de despertador pra ela e pra tela cheia
(`USE_FULL_SCREEN_INTENT`). A tela do Despertador mostra um aviso com botão
"Liberar" pro que estiver faltando (tela cheia, notificações, bateria).

**Robustez** (vista em duas rodadas de QA, testada num emulador Android 14):
- *Reinício do celular:* a lista fica no armazenamento protegido pelo aparelho
  (direct boot) e o `BootReceiver` escuta `LOCKED_BOOT_COMPLETED` — o
  despertador volta a ser agendado antes do primeiro desbloqueio.
- *Processo morto no meio do toque:* `START_REDELIVER_INTENT` recria o serviço
  e ele volta a tocar; toques já desligados ficam marcados no aparelho e não
  voltam. O volume original fica salvo em disco e é restaurado.
- *Reagendar bem na hora do toque* olha 90s pra trás (não troca o toque de
  hoje pelo de amanhã); um despertador criado/editado depois do próprio
  horário só vale a partir do próximo (`updatedAt`).
- *Sem internet:* os avisos de tocando/desligou ficam numa fila, saem dela só
  depois de enviados, com nova tentativa agendada.
- *Plano B:* se o Android recusar o serviço, uma notificação de alarme (som do
  sistema em loop, some em 30 min) abre a tela de desligar, que liga a música.
- *Abrir o app com despertador tocando* leva direto pra tela de desligar.

**No navegador** (fora do app) o despertador só toca com o Mesinha aberto
(`WakeupWebRinger`), com a mesma tela dos 6 recadinhos. Toca também o que
venceu há até 10 min (aba congelada), confere a lista antes de um toque
atrasado, volta a tocar se a página recarregar, para se desligarem em outro
aparelho e guarda o recado pra reenviar se estiver sem internet.

### O toque: "Abertura de Anime" (procedural)

Enquanto as músicas escolhidas não entram, o toque é gerado na hora: loop de 8
compassos no espírito das aberturas de anime dos anos 90 — progressão "royal
road" (IV–V–iii–vi), melodia de synth quadrado com vibrato, baixo pulando
oitava, acordes nos contratempos e bateria. O mesmo sintetizador existe em
`src/app/utils/wakeupTune.ts` (prévia no app / toque no navegador) e em
`android/.../WakeupTune.kt` (toque de verdade). Mexeu num, mexe no outro.

---

## Mapa: localização em tempo real

A aba Mapa mostra os dois no mapa de Goiânia. Tem dois modos de compartilhamento:

| Modo | Dura | Funciona com o app fechado? |
|---|---|---|
| `temporario` | 1 hora | Não |
| `sempre` | até desligar | Sim, **só no app Android instalado** |

### Por que o modo "sempre" precisa do app nativo

O `navigator.geolocation` da WebView só roda com o app na frente — tela apagada,
o Android congela a WebView e o compartilhamento morre. Por isso o modo "sempre"
é entregue ao `LocationSharingService` (serviço em primeiro plano, Kotlin), que
usa o `FusedLocationProvider` e continua mandando posição com o app fechado.

No navegador o modo "sempre" ainda funciona, mas só enquanto o Mesinha estiver
aberto — a interface avisa isso.

### Cadência adaptativa (a conta de bateria)

Rastreio de alta precisão contínuo custa **20–35% de bateria por dia**. Com três
degraus, cai para **5–8%**:

| Situação | Precisão | Intervalo |
|---|---|---|
| Parado (não saiu 30m do último envio) | balanceada (Wi-Fi/torre) | 60s |
| Em movimento | balanceada | 15s |
| O outro está com a aba Mapa aberta | alta (GPS) | 8s |

O sinal "o outro está olhando" vem do endpoint `POST /location/watching`,
renovado a cada minuto enquanto a tela do Mapa está visível. O servidor devolve
`partnerWatching` na resposta do próprio `PUT /location`, então descobrir isso
não gasta requisição extra. A mesma lógica existe nos dois lados
(`useLocationSharing.ts` no PWA, `LocationSharingService.kt` no app).

### Condições para o "sempre" funcionar de verdade

1. App Android instalado (o PWA no navegador não dá conta).
2. Permissão de localização **"Permitir o tempo todo"** — pedida em duas etapas,
   como o Android exige.
3. Isenção da otimização de bateria (o app abre o diálogo ao ligar o modo).
4. Em Xiaomi/Oppo/Realme, autostart liberado na mão nas configurações da ROM.
5. Notificação permanente na barra — obrigatória, o Android não deixa esconder.
   E é justo: ninguém deve ser localizado sem ver o aviso.

Autocura: o serviço é `START_STICKY`, volta no boot (`BootReceiver`) e é
religado toda vez que o app abre (`MainActivity`), porque várias fabricantes
matam serviços sem avisar. Se a localização do sistema for desligada, o serviço
se encerra em vez de deixar uma posição velha passando por atual.

### Skin do mapa

Os tiles são do OpenStreetMap, com um filtro CSS (`MapSkin.css`) que joga o mapa
para a paleta bege/marrom do app. O filtro é aplicado só na camada de tiles —
marcadores e popups mantêm as cores. A classe `.mesinha-map-skin` é o ponto de
troca para o mapa de Goiânia desenhado à mão, quando a ilustração existir.

O mapa é travado na região metropolitana de Goiânia (`GOIANIA_BOUNDS`, zoom
mínimo 11). Se alguém estiver fora do retângulo (viagem), os limites são
liberados automaticamente — um limite que esconde a pessoa justo quando ela está
longe seria o pior momento possível para ser rígido.
