# Bloco de contexto — `mesinha_recomeco` (run `mesinha-recomeco-01`)

> Fonte única da verdade do run. Preenchido pelo `alpha-briefer` a partir das 3 fontes
> (respostas do usuário · docs apontados · repositório atual), nesta ordem.
> Campo sem fonte → `[a definir]`. **Nada aqui foi preenchido por inferência de setor.**
> ⚠️ **O dono não respondeu nenhuma pergunta ainda** (dormindo em 2026-08-24). Fonte 1 está
> vazia: tudo abaixo vem de docs e do repositório. Ver §Perguntas no fim.

| Meta | Valor |
|---|---|
| Resolvido em | 2026-08-24 |
| Modo do run | validar o que já existe |
| Fontes usadas | Repo `C:\Users\spera\Desktop\desktop\mesinha_recomeco` (working tree em HEAD local de 04/07, **atrás do `origin/main`**) · `dossie-contexto.md` do `alpha-curador-de-contexto` (com 3 correções aplicadas, abaixo) · **nenhuma resposta do dono** |
| Lacunas abertas | §1 estágio/intenção · §2 alvo real do "recomeço" · §4 métrica-norte (integral) · §5 prazo e orçamento · §6 postura LGPD · §7 estado do DS (parcial) · §8 wrapper Android e deploy · §10 fora de escopo (integral) |

### Correções ao dossiê que têm precedência (verificadas contra `origin`)

1. **O projeto NÃO está parado há 2,5 meses.** `origin/main` está em **2026-07-15**
   (`fix(lembretes): notificações duplicadas — disparar no máximo 1x por dia por lembrete (#24)`).
   O HEAD local (04/07) é que está desatualizado. Pausa real: **~5–6 semanas**.
2. **Firebase/FCM existe**, ao contrário do que o dossiê afirmou: `android/app/google-services.json`,
   referência em `src/app/App.tsx` e branch `docs/release-guide` com `RELEASE.md` cobrindo
   "signing, Firebase, versioning and deploy". Nada disso está no working tree local — por isso o
   dossiê não viu. Push fica registrado como **híbrido / a confirmar** (§8).
3. **Há um esforço de release Android/Play Store em voo**, visível nas branches
   `feat/auto-publish-play`, `release/v1-new-app`, `release/v2-closed` (idas e vindas de
   versionCode 1↔2), `backup/pwa-pre-android-20260630`, `chore/code-improvements`.
   **Nenhum doc explica.** É a pergunta nº1.

---

## §1 Organização

**Projeto pessoal de autor único**, sem organização por trás, sem receita e sem terceiros
declarados. Estágio: **produto em uso real por seus dois únicos usuários**, com um esforço de
distribuição (Play Store) inacabado.

- Autor único em todo o histórico: `HexerVoodoom` / `mateus.sprnd@gmail.com` (`.git/logs/HEAD`).
- "aplicativo privado para uso pessoal de um casal" (`public/privacy.html:29`).
- Sem `docs/`, sem `.github/`, sem `CLAUDE.md`/`AGENTS.md`, sem rastreador de issues declarado.

`[a definir]` — se o dono considera isto um projeto pessoal permanente ou o embrião de um produto
para outros casais. **Muda tudo no §3 e no §4.**

## §2 Alvo do run

**Validar o estado real do "Mesinha" — app de listas compartilhadas de um casal (despesas,
lembretes, mural de fotos) — após ~5–6 semanas de pausa, com um release Android/Play Store
em voo e inacabado.**

O que o produto é, com evidência:
- `public/manifest.json:2-4` — "Mesinha - Listas Compartilhadas… para casais - Mateus & Amanda",
  `background_color #F8F6F3`, `theme_color #81D8D0`.
- Módulos no código: despesas/itens e "top 3" (`src/app/utils/api.ts`), lembretes com destinatário
  por pessoa (`api.ts:28-29`), mural de mídia (`src/app/components/MuralGrid.tsx`,
  `PhotoViewModal.tsx`), backup opcional Google Drive (`COMO_USAR.md`).
- PWA + sync Supabase + cache local Dexie (`supabase/config.toml`, `src/app/utils/syncApi.ts`,
  `localDB.ts`, `contexts/DataCacheContext.tsx`).

⚠️ **O "recomeço" do nome não está explicado em lugar nenhum.** Commit inicial:
"Initial commit for Cloudflare and Bubblewrap recreated project". As branches sugerem
Play Store; nenhum doc confirma. **Pergunta nº1.**

## §3 Usuário(s)

**Exatamente duas pessoas nomeadas e hardcoded: Amanda e Mateus.** Não são "um casal" genérico:
o código trata os dois como perfis distintos, com campos próprios.

- Tipo literal `'Amanda' | 'Mateus'` em `src/app/App.tsx:13,23,25,48`, `utils/api.ts:144,401`.
- Campos **por pessoa**, não compartilhados: `reminderForMateus` / `reminderForAmanda`
  (`api.ts:28-29`), `top3Mateus` / `top3Amanda` (`api.ts:32-37`,
  `components/AddItemModal.tsx:30-35`).
- Cada item carrega autoria (`createdBy`, `utils/seedData.ts:8`) e a UI mostra o parceiro
  (`DataCacheContext.tsx:93`).
- "O acesso é feito por dois perfis fixos" (`privacy.html:41-43`).

⚠️ **Proibição explícita para todo agente deste run:** **não trate Amanda e Mateus como um único
usuário "o casal".** O modelo de dados já os separa; qualquer proposta de UX, notificação ou
métrica que colapse os dois em um perfil está errada por construção e contradiz o schema atual.

`[a definir]` — **em que os dois divergem de verdade** (quem usa mais, qual módulo cada um usa,
device/OS de cada um, quem sofre com notificação duplicada). Não há uma linha de evidência sobre
isso no repo. Sem essa resposta a squad **não** pode priorizar por usuário. **Pergunta nº4.**

Condição de uso conhecida: **mobile, portrait, standalone** (`manifest.json:8-9`), local-first
com Dexie — logo, tolerância a rede ruim é requisito de projeto, não hipótese.

## §4 Métrica-norte + métricas de entrada

`[a definir]` — **integralmente.** Nenhum doc, comentário ou commit do repo declara o que é
sucesso. Não há analytics de nenhum tipo, e isso é afirmado por escrito:
"O app não usa ferramentas de analytics, publicidade ou rastreamento de comportamento"
(`privacy.html:62-63`). Portanto, **não existe instrumentação para medir nada hoje** — qualquer
métrica proposta neste run exige decisão prévia do dono (e reabre §6, porque medir é coletar).

Únicos proxies factuais disponíveis: mensagens de commit sobre bugs de sincronização e o
`#24` de notificações duplicadas. **Pergunta nº3.**

## §5 Restrições duras

Documentadas (herdadas do que já está construído, não escolhidas neste run):

| Restrição | Evidência |
|---|---|
| Stack fixa React 18 + Vite 6 + Tailwind 4 + Supabase + Dexie | `package.json` |
| pnpm como gerenciador (apesar do README dizer `npm i`) | `pnpm-workspace.yaml` vs `README.md:8` |
| PWA instalável, portrait, standalone | `public/manifest.json:8-9`, `vite-plugin-pwa` |
| Local-first: dado precisa funcionar offline e sincronizar depois | `utils/localDB.ts`, `syncApi.ts` |
| **Sem CI, sem testes, sem lint** — scripts são só `build` e `dev` | `package.json:6-9`; nenhum `*.test.*`; sem `.github/` |
| Autor único: capacidade de execução é de uma pessoa | `.git/logs/HEAD` |

**Orçamento, prazo e janela de trabalho: `[a definir]`.** Se há data-alvo de publicação na Play
Store, ela é a restrição dominante do run e nenhum agente a conhece. **Pergunta nº2.**

## §6 Restrição regulatória / política

**Só o que está documentado.** Nenhuma norma é afirmada aqui.

**Documentado:**
- Existe política de privacidade publicada, com data: `public/privacy.html`,
  "Última atualização: 16 de junho de 2026" (`:26`).
- Declara **quais dados**: conteúdo digitado, títulos, comentários, datas, tags, lembretes, itens;
  **fotos, vídeos e áudios** do mural com nome de quem criou; preferências (`:36-39`).
- Declara **onde vivem**: banco gerenciado **Supabase**, hospedagem **Cloudflare Pages** (`:48-50`).
- Declara **quem acessa**: "apenas pelas pessoas que têm o link e os perfis do app" (`:50`).
- Declara **não** compartilhar com terceiros, **não** usar analytics/publicidade (`:62-63`).
- Declara exclusão: item a item no app; exclusão total **por e-mail** a
  `mateus.sprnd@gmail.com` (`:66-74`).
- Permissões: câmera, microfone, galeria, notificações — só sob ação do usuário (`:53-58`).

**Exposição factual registrada (fato do código, não juízo jurídico):**
- **A autenticação é o nome do parceiro em texto puro.** `src/app/utils/api.ts:144-149`:
  perfil `Amanda` entra com a senha `Mateus`, e vice-versa — comparação literal no cliente.
  Combinado a "os dados são acessíveis por quem tem o link" (`privacy.html:50`), o controle de
  acesso efetivo a **despesas financeiras e fotos/vídeos privados de duas pessoas identificáveis
  pelo nome** é adivinhável por qualquer pessoa que conheça o casal.
- Client ID OAuth do Google em texto puro em três docs (`COMO_USAR.md:10,126`,
  `RESOLVER_PAGINA_BRANCA.md:35,123`, `CONFIGURAR_AGORA.txt:9`).

**`[a definir]` — endereçado ao dono (§9):** nenhum documento do projeto trata de LGPD, base
legal, retenção ou o que muda quando o app deixa de ser link privado e passa a estar **listado
na Play Store**. A squad **não afirmará** que norma se aplica. **Pergunta nº5 e nº6.**

## §7 Marca e voz

**Estado do design system: `rascunho`.** Não é `inexistente` — e não é canônico.

- **Existem tokens de verdade**, escritos à mão e coerentes: `src/styles/theme.css:3-42` define
  paleta própria em hex (`--background #FEFDFB`, `--foreground #2B2A28`, `--primary #4D989B`,
  `--secondary/--muted #E9E4DF`, `--accent #D7EFED`, `--ring #4D989B`), `--radius 0.75rem`,
  `--font-size 18px`. Também `src/styles/fonts.css`, `globals.css`, `tailwind.css`.
- **Mas há contaminação de default**: no mesmo `:root`, `--chart-1..5` e todo o bloco `--sidebar-*`
  seguem em `oklch()` do tema padrão shadcn, e o bloco `.dark` (`theme.css:44+`) é **inteiramente
  o default cinza do shadcn** — o dark mode não recebeu a marca. `default_shadcn_theme.css`
  segue na raiz como resíduo.
- **Marca no manifest diverge dos tokens**: `manifest.json` usa `#F8F6F3`/`#81D8D0`;
  `theme.css` usa `#FEFDFB`/`#4D989B`. Duas verdades de cor no mesmo produto.
- **Não há documento de marca.** `guidelines/Guidelines.md` é o placeholder comentado do Figma
  Make, nunca preenchido. `README.md` é o boilerplate genérico do Figma, não descreve o produto.

Voz: `[a definir]`. Só há evidência indireta — pt-BR, primeira pessoa, informal e afetivo
(`privacy.html:29`, "mural de memórias compartilhadas"). Público de letramento digital alto o
bastante para instalar PWA, mas são duas pessoas específicas, não um segmento.

**Não abre gate de marca** (tokens existem). Abre **dívida de consolidação**: unificar as duas
paletas, decidir o dark mode e escrever a origem canônica. Se o run mirar Play Store, isso vira
requisito de store listing (ícone, splash, screenshots), não vaidade.

## §8 Stack e ambiente

| Camada | O que é | Evidência |
|---|---|---|
| Front | React 18.3 + TypeScript + Vite 6.3 + Tailwind 4.1 + Radix + MUI 7 + shadcn/ui | `package.json`, `src/app/components/ui/*` |
| Estado/local | Dexie (IndexedDB), `DataCacheContext` | `src/app/utils/localDB.ts`, `contexts/DataCacheContext.tsx` |
| Backend | Supabase (DB + Edge Function `make-server-19717bce`) | `supabase/config.toml`, `src/app/utils/syncApi.ts` |
| Backup | Google Drive via OAuth (Client ID em doc) | `COMO_USAR.md`, `public/oauth-callback.html` |
| Hospedagem | Cloudflare Pages | `privacy.html:48-50` + commit "Trigger Cloudflare build" |
| Push | **Híbrido / a confirmar** — Web Push/VAPID via Supabase Edge Function no working tree local (`src/app/hooks/useNotifications.ts`) **e** FCM no Android (`android/app/google-services.json`, ref. em `App.tsx` no `origin`) | ver Correção 2 |
| Android | Existe `android/`; **Bubblewrap (TWA) ou Capacitor — `[a definir]`**. Commit inicial cita Bubblewrap; a existência de `google-services.json` sugere projeto Gradle real | `.git/logs/HEAD:1`, `origin` |
| Release | Esforço em voo: branches `feat/auto-publish-play` (auto-build/auto-publish de AAB), `release/v1-new-app`, `release/v2-closed` (versionCode 1↔2), `docs/release-guide` (`RELEASE.md`) | branches do `origin` |
| CI | **Nenhuma.** Sem `.github/` | varredura |
| Testes | **Nenhum.** Sem `*.test.*`, sem script de teste | `package.json:6-9` |
| Analytics | **Nenhuma, por decisão declarada** | `privacy.html:62-63` |
| Rastreador de tarefas | **Nenhum declarado.** Há numeração de PR/issue em commit (`#24`) → possivelmente GitHub Issues/PRs, **a confirmar**. ⚠️ `alpha-delivery-ops` **não age** enquanto isto for `[a definir]` | `origin/main` |

⚠️ **Higiene de repo, pré-requisito para qualquer trabalho:** o working tree local está **11 dias
atrás do `origin/main`** e foi exatamente isso que produziu duas conclusões erradas no dossiê.
Nenhum agente deste run deve ler o disco local como verdade sem `git fetch` primeiro.

## §9 Donos por disciplina

**Dono singular.** Todas as disciplinas na mesma pessoa; toda pendência escala para o mesmo lugar.

| Disciplina | Dono |
|---|---|
| Produto | Mateus (`HexerVoodoom`, `mateus.sprnd@gmail.com`) |
| Design | Mateus |
| Tech | Mateus |
| Negócio | Mateus |
| Jurídico | Mateus — e ele **não é jurista**; ver §6. Contato público de privacidade é o dele (`privacy.html:74`) |

Consequência operacional: **não há segunda opinião interna neste run.** Divergência entre agentes
não tem árbitro além do dono, e ele responde em lote. Amanda é **usuária, não decisora** — nada no
repo indica que ela decide escopo; não a trate como stakeholder sem confirmação (Pergunta nº4).

## §10 Fora de escopo

`[a definir]` — nada foi declarado fora de escopo pelo dono.

**Fora de escopo assumido por default até o dono dizer o contrário** (declarado, não inferido do
setor — decorre do que o próprio repo já afirma):

1. **Generalizar o app para outros casais / multi-tenant.** Os perfis são hardcoded e a política
   diz "uso pessoal de um casal". Reabrir isso é outro produto.
2. **Introduzir analytics/telemetria.** `privacy.html:62-63` promete o contrário por escrito;
   mexer aqui exige reescrever a política antes.
3. **Monetização de qualquer forma.**
4. **Reescrita de stack** (trocar Supabase, sair de React/Vite).
5. **iOS / App Store.**

---

# Perguntas para o dono (responder antes da Fase 0)

Oito perguntas. Cada uma tem default assumido — se você não responder, o run segue com o default
**declarado como suposição** no artefato. Perguntas 1 e 2 são as que mais mudam o resto.

### 1. O que é o "recomeço", e qual é o alvo dele? ⭐ redefine todo o resto
As branches (`feat/auto-publish-play`, `release/v1-new-app`, `release/v2-closed`) apontam para
Play Store, mas nenhum doc explica.
- **(a) Publicar na Play Store como app novo** — é a hipótese que a evidência mais apoia.
- **(b) Refundação técnica** — limpar herança Figma/docs perdidos, estabilizar sync, e a Play
  Store é consequência, não meta.
- **(c) Trocar PWA por Android nativo/wrapper** de vez, aposentando a distribuição por link.
- **(d) Outra coisa** — descreva em uma linha.

**Default se não responder:** (a). **Muda o quê:** em (a), o run vira gate de publicação —
release engineering, política de dados de store, ícones/screenshots, assinatura. Em (b), vira
auditoria de qualidade e dívida técnica, e a Play Store sai do escopo deste run. Em (c), entra
decisão de arquitetura de distribuição. **São três squads diferentes.**

### 2. Há data-alvo? ⭐
- (a) Sim, data específica — qual?  (b) "Assim que estiver bom", sem data.
- (c) Sem prazo, é hobby.

**Default:** (b). **Muda o quê:** com data, o run corta escopo agressivamente e prioriza só o
caminho crítico de release. Sem data, cabe a auditoria completa (sync, testes, DS, segurança).

### 3. O que conta como sucesso deste run?
Não há métrica em lugar nenhum e não há analytics instalada.
- (a) App publicado e instalável na Play Store.
- (b) Zero bug de sync/notificação por N semanas de uso real.
- (c) Repo pronto para eu voltar depois de meses sem reaprender tudo (docs, CI, testes).
- (d) Todos os três, nesta ordem de prioridade — diga a ordem.

**Default:** (a) como métrica-norte, (b) como métrica de entrada. **Muda o quê:** define o critério
de aceite de todo gate do run e quais agentes lideram.

### 4. Amanda e Mateus usam o app de forma diferente?
O código já os separa (`reminderForMateus`/`reminderForAmanda`, `top3Mateus`/`top3Amanda`), mas
nada diz **como** divergem.
- (a) Sim, e são bem diferentes — quem usa o quê? (uma linha por pessoa).
- (b) Usam praticamente igual; a separação é só de autoria/destinatário.
- (c) Um usa muito mais que o outro — qual, e o que o outro evita?

**Default:** (b). **Muda o quê:** se (a) ou (c), o run precisa validar as duas jornadas separadas e
Amanda entra como voz a consultar. Se (b), uma jornada só e a squad encolhe. Além disso: **Amanda
opina em escopo, ou você decide sozinho?**

### 5. A senha do app é o nome do parceiro. Isso muda com a Play Store? ⭐
`src/app/utils/api.ts:144-149` compara literalmente `Amanda`/`Mateus` no cliente, guardando
despesas e fotos privadas.
- (a) É intencional e fica assim — app privado, risco aceito conscientemente.
- (b) Precisa mudar **antes** de publicar (auth de verdade no Supabase).
- (c) Não sabia / quero avaliar o risco antes de decidir.

**Default:** (c) — a squad registra a exposição e **não** implementa nada sem sua decisão.
**Muda o quê:** em (b), auth vira bloqueador do release e o run ganha uma frente de segurança.
Em (a), a squad para de levantar o assunto e registra o risco aceito, com sua assinatura.

### 6. Postura sobre LGPD e dados pessoais
Existe `privacy.html` (16/06/2026), mas nenhum doc trata de base legal, retenção ou do que muda ao
sair de link privado para app listado publicamente. **A squad não vai afirmar norma que você não
declarou.**
- (a) Uso estritamente pessoal, sem terceiros — não quero tratar LGPD neste run.
- (b) Quero a exposição mapeada (que dado, onde vive, quem acessa, o que a Play Store exige no
  Data Safety form), sem parecer jurídico.
- (c) Quero avaliação jurídica de verdade — vai precisar de alguém de fora.

**Default:** (b). **Muda o quê:** (b) adiciona um mapa de dados + preenchimento do Data Safety;
(c) abre dependência externa e trava o release; (a) tira a frente do run inteiro.

### 7. Push: Web Push/VAPID, FCM, ou os dois?
Existem os dois traços no repo (`useNotifications.ts` com VAPID + Supabase Edge Function;
`android/app/google-services.json` + FCM no `origin`), e o último commit foi justamente
`fix(lembretes): notificações duplicadas`.
- (a) FCM é o caminho no Android; Web Push fica só para o PWA no navegador.
- (b) Web Push é o caminho; o Firebase é resíduo a remover.
- (c) Não sei mais / era o que eu estava resolvendo quando parei.

**Default:** (c) → a squad **audita antes de propor**. **Muda o quê:** se (a) ou (b), a squad
remove o caminho morto e fecha a classe de bug de duplicação; em (c), a auditoria de notificação
vira item de escopo próprio.

### 8. Wrapper Android e rastreador de tarefas
- Wrapper: **(a) Bubblewrap/TWA · (b) Capacitor · (c) não lembro** — muda quem consegue mexer
  em código nativo e o que dá para fazer com push e permissões.
- Rastreador: **(a) GitHub Issues · (b) nenhum, é tudo commit · (c) outro** — `alpha-delivery-ops`
  fica **inativo** enquanto isso for indefinido; nenhum agente cria issue em rastreador não
  declarado.

**Default:** wrapper (c) → a squad inspeciona `android/` e reporta; rastreador (b) → nada é
aberto em lugar nenhum e as pendências ficam neste arquivo.

---

## Lacunas abertas — para quem, e o que exatamente se pede

| Lacuna | Onde | Quem responde | O que exatamente se pede |
|---|---|---|---|
| Motivo e alvo do recomeço | §2 | Mateus | Uma das 4 opções da Pergunta 1 |
| Prazo / data-alvo | §5 | Mateus | Data ou "sem data" (Pergunta 2) |
| Métrica-norte | §4 | Mateus | Ordem de prioridade entre publicar / estabilidade / manutenibilidade (Pergunta 3) |
| Divergência entre Amanda e Mateus | §3 | Mateus (e Amanda, se ela opina) | Uma linha por pessoa (Pergunta 4) |
| Decisão sobre auth hardcoded | §6 | Mateus | Aceitar risco, corrigir antes do release, ou avaliar (Pergunta 5) |
| Postura LGPD / Data Safety | §6 | Mateus | Escopo do tratamento neste run (Pergunta 6) |
| Arquitetura de push | §8 | Mateus | FCM, Web Push, ou auditar (Pergunta 7) |
| Wrapper Android + rastreador | §8 | Mateus | Bubblewrap/Capacitor; rastreador declarado (Pergunta 8) |
| Fora de escopo confirmado | §10 | Mateus | Confirmar ou riscar os 5 itens assumidos |
| Unificação de paleta (`manifest` vs `theme.css`) e dark mode | §7 | Mateus | Qual das duas paletas é a canônica |

## Próximo passo único

Levar as 8 perguntas ao dono quando ele acordar — **em um bloco só**. Com as respostas de 1 e 2,
o `alpha-orquestrador` abre a Fase 0. Sem elas, o run **não** deve começar: as opções (a) e (b) da
Pergunta 1 produzem squads diferentes, e escolher errado desperdiça o run inteiro.
