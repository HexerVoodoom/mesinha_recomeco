# Dossiê de contexto — mesinha_recomeco
Squad-Alpha · Curador de contexto · gerado em 2026-08-24 · modo: validar o que já existe

Memória entre runs (`memoria/mesinha-recomeco.md`): **não existe** — nada "já sabido" a herdar. Este é o primeiro dossiê registrado para o alvo.

Bloco de contexto do run: **não existe** — este dossiê é insumo para o `alpha-briefer` preenchê-lo.

---

## 1. O que é o mesinha_recomeco (3 linhas, na linguagem dos próprios docs)

App web de listas compartilhadas para casal ("Shared Couple Lists App" / "Mesinha - Listas
Compartilhadas"), nomeado para Mateus & Amanda no `manifest.json`. Gerencia despesas, lembretes/
calendário, galeria de fotos ("mural") e sincronização entre dispositivos via Supabase, com
opção de backup no Google Drive. Empacotado como PWA (manifest, ícones, service worker) e há
indícios de wrapper Android via TWA/Bubblewrap (ver §3 e §6).

Fonte: `README.md:1-4` ("Shared Couple Lists App"), `public/manifest.json:1-4` ("Mesinha - Listas
Compartilhadas... para casais - Mateus & Amanda"), `.git/logs/HEAD` linha 1 ("recreated project"
para Cloudflare e Bubblewrap).

---

## 2. Mapa do que existe

| Item / doc | Caminho | O que decide / contém | Estado |
|---|---|---|---|
| README raiz | `README.md` | Nome do produto ("Shared Couple Lists App"), origem no Figma, `npm i` / `npm run dev` | Canônico, mas raso — 11 linhas, sem stack real, sem menção a pnpm/Supabase/deploy que o resto do repo usa |
| package.json | `package.json` | Nome interno `@figma/my-make-file`, stack (React 18, Vite 6, Tailwind 4, MUI, Radix, Dexie, Supabase JS, PWA plugin), scripts apenas `build`/`dev` | Canônico técnico. Sem script de teste/lint |
| ATTRIBUTIONS.md | `ATTRIBUTIONS.md` | Créditos shadcn/ui e Unsplash | Canônico, trivial |
| guidelines/Guidelines.md | `guidelines\Guidelines.md` | Template de guidelines de design do Figma Make | **Vazio de conteúdo real** — é o texto-modelo comentado, nunca preenchido (linhas 1-61 são o placeholder padrão) |
| COMO_USAR.md | `COMO_USAR.md` | Passo a passo de configuração OAuth Google Drive + Client ID hardcoded (`305705048348-...`) | Rascunho operacional, com segredo/Client ID exposto em texto puro |
| RESOLVER_PAGINA_BRANCA.md | `RESOLVER_PAGINA_BRANCA.md` | Troubleshooting do fluxo OAuth Google Drive (redirect URI) | Rascunho operacional, sobreposto/duplicado com COMO_USAR.md |
| CONFIGURAR_AGORA.txt | `CONFIGURAR_AGORA.txt` | Nota pontual pedindo cadastro de 1 URI OAuth específica de um preview do Figma Site | Efêmero/obsoleto — referencia um domínio de preview temporário (`3601c913-...figma.site`), provavelmente já expirado |
| GERAR_FAVICON.md | `GERAR_FAVICON.md` | Passo a passo para gerar ícones PNG do favicon a partir de imagem do casal | Rascunho operacional; refere `IconGenerator.tsx`, cuja existência não foi confirmada nesta varredura |
| manifest.json | `public/manifest.json` (duplicado em `dist/manifest.json`) | Nome final do produto, cores de marca (`#F8F6F3` bg, `#81D8D0` theme), ícones PWA | Canônico e é a fonte mais confiável do nome/marca real do produto |
| privacy.html | `public/privacy.html` (duplicado em `dist/privacy.html`) | Política de privacidade — existe, conteúdo não lido nesta varredura | Presença confirmada pelo commit `docs: add privacy policy page` (linha 30 do log) |
| useNotifications.ts | `src/app/hooks/useNotifications.ts` | Implementação de push via **Web Push/VAPID + Supabase Edge Function** (`make-server-19717bce`), não Firebase/FCM | Canônico técnico — **contradiz** a premissa "FCM aparece no último commit" do bloco de contexto de entrada (ver §5) |
| syncApi.ts / localDB.ts / DataCacheContext.tsx | `src/app/utils/syncApi.ts`, `src/app/utils/localDB.ts`, `src/app/contexts/DataCacheContext.tsx` | Sincronização local (Dexie/IndexedDB) + remota (Supabase) | Canônico técnico, não lido em detalhe (fora do escopo de varredura superficial) |
| supabase/config.toml | `supabase/config.toml` | Configuração local do Supabase CLI (evidência de uso real de Supabase, não só dependência no package.json) | Canônico |
| .git/logs/HEAD | `.git\logs\HEAD` | Histórico de 27 commits, autor único (`HexerVoodoom`, e-mail do usuário), sempre em `main` | Canônico — única fonte de "linha do tempo" confiável no repo (sem CHANGELOG) |

**Não encontrados nesta varredura:** `CLAUDE.md`/`AGENTS.md` na raiz do repo, pasta `docs/`,
pasta `.github/` (logo, sem CI), `wrangler.toml`/`vercel.json` na raiz (só `supabase/config.toml`),
arquivos de teste (`*.test.*`), `.env`/`.env.example`, TODO/FIXME/BACKLOG no código-fonte.

---

## 3. A linhagem

O nome "recomeço" e a mensagem do commit inicial — **"Initial commit for Cloudflare and Bubblewrap
recreated project"** (`.git/logs/HEAD:1`) — confirmam que este repo é uma refundação técnica de
um projeto anterior, mas **os docs não explicam por quê** (não há changelog, migration note, ou
seção "por que recomeçar" em nenhum `.md` do repo).

Varredura superficial (só README/package.json) de repos com nome parecido em
`C:\Users\spera\Desktop\desktop\`:

- `Mesinha\README.md` — idêntico ao README atual do `mesinha_recomeco` ("Shared Couple Lists
  App", origem Figma). Provavelmente o bundle Figma que precedeu diretamente este repo.
- `Mesinha_app\README.md` e `MESINHA_APP\README.md` — **conteúdo idêntico entre si**: "Couple
  App", stack React 18 + Vite + Tailwind v4 + MUI + Supabase + Google Drive backup, deploy via
  Cloudflare Pages/Wrangler, e menção a **deploy automatizado via "Google Antigravity"** (CLI
  própria, não presente no `mesinha_recomeco` atual). Documentação bem mais completa que a do
  repo atual (`.env.example`, arquivos `CONFIGURACAO_GOOGLE.md`, `INSTRUCOES_BACKUP.md`,
  `SISTEMA_DE_LOGIN.md`, `ARMAZENAMENTO_DE_DADOS.md` citados, não confirmados como existentes).
- `Mesinha---o-Jogo` e `mesinha_android` — README não encontrado nesses caminhos exatos (ou pasta
  não existe com esse nome exato); não confirmados nesta varredura.

**Vazio/lacuna:** nenhum documento do `mesinha_recomeco` diz explicitamente o que do
`Mesinha_app`/`MESINHA_APP` foi descartado e por quê (ex.: por que abandonar "Google Antigravity"
como pipeline de deploy, por que os docs de configuração detalhados não foram trazidos para o
novo repo). Isso é lacuna, não decisão registrada.

---

## 4. Estado técnico

- **Stack:** React 18.3.1 + TypeScript, Vite 6.3.5, Tailwind CSS 4.1.12, Radix UI, MUI 7, Dexie
  (IndexedDB local), Supabase JS 2.98, `vite-plugin-pwa`. (`package.json:1-93`)
- **Scripts disponíveis:** apenas `build` e `dev` (`package.json:6-9`). **Sem script de teste, sem
  lint configurado no package.json.**
- **Gerenciador de pacotes:** pnpm (`pnpm-workspace.yaml` na raiz), embora o README diga `npm i`.
- **Deploy:** evidências apontam Cloudflare (Pages/Workers) — mensagem de commit "Trigger
  Cloudflare build" (linha 13 do log) e commit inicial menciona "Cloudflare and Bubblewrap". Não
  há `wrangler.toml` na raiz do repo atual nesta varredura — **lacuna**: mecanismo de deploy atual
  não está documentado no repo, só inferível pelo histórico de commits.
- **Bubblewrap:** citado só no commit inicial (empacotamento Android/TWA). Não há
  `twa-manifest.json`/`android/` confirmados nesta varredura — **lacuna**.
- **Backend/dados:** Supabase (`supabase/config.toml`, `@supabase/supabase-js`, Edge Function
  `make-server-19717bce` usada por push notifications). Local-first via Dexie.
- **Notificações push:** Web Push padrão com chave VAPID hardcoded no código-fonte
  (`src/app/hooks/useNotifications.ts:7`) — **não é Firebase Cloud Messaging (FCM)**, apesar do
  bloco de contexto do run mencionar "Firebase/FCM aparece no último commit". Ver contradição §5.
- **Testes:** nenhum arquivo `*.test.*` encontrado em `src/`. **Sem cobertura de teste
  identificável.**
- **CI:** pasta `.github/` **não existe** no repo. Sem pipeline de CI configurado.
- **Quão parado está:** 27 entradas no `.git/logs/HEAD`, autor único, todas em `main`. Primeiro
  commit em timestamp `1778038303` (≈ maio/2026), último em `1783297777` (≈ início de
  junho/2026) — **repo parado há aproximadamente 2,5 meses** em relação à data de hoje
  (2026-08-24). Atividade concentrada em uma janela curta (~1 mês) e depois silêncio total.

---

## 5. Contradições e desatualizações

1. **README raiz vs. realidade do projeto** — `README.md:1-10` descreve um "code bundle" genérico
   do Figma Make, instrução `npm i`/`npm run dev`, sem mencionar Supabase, sincronização,
   notificações push, PWA ou deploy. `manifest.json:1-9` e o código (`useNotifications.ts`,
   `syncApi.ts`, `supabase/config.toml`) mostram um produto bem mais maduro. O README está
   **desatualizado/raso** frente ao estado real do código.

2. **Gerenciador de pacotes: npm vs pnpm** — `README.md:8` instrui `npm i`; a raiz do repo tem
   `pnpm-workspace.yaml`, indicando pnpm como gerenciador esperado. Comando de instalação
   documentado pode estar errado.

3. **Guidelines.md vazio apresentado como se existisse** — `guidelines/Guidelines.md` é
   literalmente o texto-modelo do Figma Make, nunca preenchido (todo o conteúdo entre `<!--` e
   `-->`, linhas 3-61). Não há guidelines de design/produto reais no repo, apesar do arquivo
   existir e sugerir que existem.

4. **FCM vs. Web Push/VAPID** — o bloco de contexto de entrada do run afirma "Firebase/FCM aparece
   no último commit". A busca por `firebase|FCM|VAPID` no código encontrou apenas Web Push nativo
   com chave VAPID via Supabase Edge Function (`src/app/hooks/useNotifications.ts:6-7`), sem
   qualquer referência a Firebase. **Contradição a esclarecer com quem abriu o run** — ou a
   premissa está errada, ou há um commit/arquivo com FCM não capturado nesta varredura superficial
   (nenhum `firebase.json`/SDK do Firebase encontrado nos caminhos varridos).

5. **CONFIGURAR_AGORA.txt aponta para domínio de preview efêmero** — `CONFIGURAR_AGORA.txt:13`
   referencia `https://3601c913-7a74-42c7-903d-a102ec598374-v3-figmaiframepreview.figma.site/...`,
   um domínio de preview do Figma Make, tipicamente temporário. Documento provavelmente obsoleto
   frente ao domínio de produção atual (não identificado nesta varredura).

6. **Client ID OAuth do Google exposto em texto puro** em três arquivos de doc
   (`COMO_USAR.md:10,126`, `RESOLVER_PAGINA_BRANCA.md:35,123`, `CONFIGURAR_AGORA.txt:9`) — mesmo
   Client ID repetido. Client ID OAuth público não é segredo crítico por si só, mas indica prática
   de documentação que mistura instrução operacional com credencial specific ao ambiente do dono.

---

## 6. Pendências já declaradas pelo projeto

- Nenhum `TODO`/`FIXME`/`BACKLOG`/`XXX` encontrado em `src/` nesta varredura.
- `GERAR_FAVICON.md:1-4` declara pendência operacional explícita: "Os arquivos SVG dos ícones já
  foram criados, mas os arquivos PNG ainda precisam ser gerados com a imagem do casal fornecida"
  — não confirmado se já foi resolvida (arquivos PNG existem em `public/`? não verificado).
- Mensagens de commit funcionam como o único rastro de "issues resolvidas": vários commits de
  correção de bugs de sincronização (`fix: sync problems...`, `fix: stop sync from duplicating
  items when remote fetch fails`, `fix: drop createdAt sort that was timing out items query in
  production`) sugerem que **sincronização Supabase/local foi historicamente instável** — não há
  registro de que essas classes de bug estejam formalmente fechadas/testadas.
- Não há rastreador de issues (GitHub Issues, board) apontado nem encontrado nesta varredura.

---

## 7. Lacunas para o briefing (o que as fontes NÃO respondem)

- **Usuários reais:** confirma-se apenas que é para "Mateus & Amanda" (hardcoded no manifest e no
  código — `'Amanda' | 'Mateus'` como tipo literal em `useNotifications.ts:16`). Não há indicação
  de uso além desse casal, nem de intenção de generalizar para outros usuários.
- **Métrica de sucesso:** nenhum doc menciona o que "sucesso" significa para este recomeço
  (estabilidade de sync? lançamento na Play Store via TWA? retenção de uso diário?).
- **Modelo de negócio:** nenhuma menção — projeto trata-se, pelos próprios docs do predecessor
  (`Mesinha_app/README.md:115,119`), como "uso pessoal privado", sem indicação de mudança.
- **Restrição regulatória / dados pessoais:** existe `privacy.html` (conteúdo não lido), mas
  nenhum doc trata explicitamente de LGPD ou de como dados de casal/família são tratados,
  retidos ou excluídos. Dado que o app guarda despesas financeiras e fotos, essa lacuna é
  relevante para qualquer decisão de escopo.
- **Donos por disciplina:** commit log mostra autor único (`HexerVoodoom`); não há indicação de
  divisão de responsabilidade entre produto/design/engenharia — provavelmente é um projeto de
  pessoa única, mas isso não está declarado em nenhum doc.
- **Estado da marca/design system:** `guidelines/Guidelines.md` está vazio (é o placeholder do
  Figma Make). Existe um `default_shadcn_theme.css` e cores no `manifest.json`
  (`#F8F6F3`/`#81D8D0`), mas nenhum documento consolida a marca ("Mesinha") de forma canônica.
- **Motivo do recomeço:** por que abandonar o pipeline "Google Antigravity" e a documentação mais
  extensa do `Mesinha_app`/`MESINHA_APP` em favor de um repo mais enxuto e com menos docs — não
  respondido em nenhuma fonte.
- **Estado do wrapper Android/Bubblewrap:** mencionado só no commit inicial; sem confirmação de
  que existe pipeline ativo de publicação Android hoje.

---

## As 3 leituras que mais economizam tempo

1. **`.git/logs/HEAD`** (`C:\Users\spera\Desktop\desktop\mesinha_recomeco\.git\logs\HEAD`) — a
   única linha do tempo confiável do projeto: mostra que é obra de 1 autor, ~1 mês de atividade
   intensa (maio-junho/2026) e depois ~2,5 meses de silêncio, e revela a instabilidade histórica
   de sincronização via mensagens de commit.
2. **`public/manifest.json`** — a fonte mais confiável do nome real do produto, marca e
   público-alvo declarado (Mateus & Amanda), mais confiável que o `README.md` genérico.
3. **`Mesinha_app/README.md`** (ou `MESINHA_APP/README.md`, conteúdo idêntico, em
   `C:\Users\spera\Desktop\desktop\`) — o doc mais completo de toda a linhagem: explica stack,
   deploy, segurança e aponta para docs satélites (`CONFIGURACAO_GOOGLE.md`,
   `INSTRUCOES_BACKUP.md`, `SISTEMA_DE_LOGIN.md`, `ARMAZENAMENTO_DE_DADOS.md`) que, se existirem,
   valem revisão antes de decidir o que recriar no `mesinha_recomeco`.
