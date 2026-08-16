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

---

## Calendário de Lançamento das Features

Todas as features novas já estão no código em `main`, mas cada uma fica
**invisível** até a data dela — uma nova a cada 15 dias, pra ser surpresa. Não
existe cadeado nem "em breve": o ícone simplesmente não aparece na grade até
abrir, e no dia aparece um aviso de novidade (uma única vez por aparelho).

**Arquivo:** `src/app/utils/featureSchedule.ts`

Para ajustar, mexa em duas constantes:

- `LAUNCH_ANCHOR` — data em que a primeira feature entra no ar
- `INTERVAL_DAYS` — intervalo entre uma e a próxima (padrão: 15)

A ordem de lançamento é a ordem da lista `FEATURE_SCHEDULE`; o campo `step` é
a posição na fila (0 = já no ar na data da âncora). Para adiantar uma feature,
basta baixar o `step` dela.

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
| `mood` | Check-in de humor. Id determinístico `mood-<perfil>-<data>` (upsert) => 1 registro por pessoa por dia e push no máximo 1x/dia |
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
