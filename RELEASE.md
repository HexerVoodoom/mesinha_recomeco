# Mesinha — Guia de Release e Continuidade do Projeto

Documento de referência com tudo que é preciso saber para criar uma nova
versão do app Android, mexer no backend, ou continuar o projeto do zero
(ex: numa sessão nova do Claude Code, ou com outro desenvolvedor).

**Nunca cole valores de senha/chave neste arquivo.** Ele é versionado no git;
guarde segredos em gerenciador de senhas, GitHub Secrets ou no KV do Supabase
(ver seção 2).

---

## 0. Visão geral do projeto

| Peça | O quê | Onde |
|---|---|---|
| App web (PWA) | React + Vite | `src/app/` |
| Backend | Supabase Edge Function (Deno + Hono) | `supabase/functions/server/` |
| Banco | Supabase Postgres, tabela KV `kv_store_19717bce` | — |
| App Android nativo | Kotlin + Gradle, WebView do PWA + 3 widgets | `android/` |
| Hospedagem do site | Cloudflare Pages | `mesinha-recomeco2.pages.dev` |
| Repositório | GitHub | `HexerVoodoom/mesinha_recomeco` |

**Como o deploy automático funciona:**
- Merge na branch **`main`** → dispara:
  - Deploy do **site** (Cloudflare Pages, automático via integração do Cloudflare)
  - Deploy do **backend** (`.github/workflows/deploy-supabase.yml`), **só se**
    o PR mexeu em `supabase/functions/**`
  - Build **e publicação** do app Android (`.github/workflows/android-release.yml`),
    **só se** o PR mexeu em `android/**` — gera o `.aab` assinado e, se o
    secret `PLAY_SERVICE_ACCOUNT_JSON` estiver configurado, já publica sozinho
    nas faixas de **Teste Interno e Teste Fechado** da Play Store (ver seção 5).
  - O APK **de debug** (`android-build.yml`) também dispara sozinho nas
    mesmas condições — é só pra testar rápido, não vai pra Play Store.

---

## 1. Assinatura do app Android (signing)

- **Nome do keystore de upload:** `mesinha` (é o `alias` dentro do keystore)
- **Onde o keystore vive:** **não está no repositório** (está no `.gitignore`:
  `*.jks`, `*.keystore`). Foi gerado numa sessão anterior e entregue ao dono
  do projeto como arquivo (`.jks`) + um `.txt` com a senha — guarde esses
  arquivos num cofre/gerenciador de senhas. Se você os perdeu, veja a seção
  "Se perder o keystore" abaixo.
- **Onde as credenciais ficam configuradas:** GitHub Secrets do repositório
  (`Settings → Secrets and variables → Actions`), 4 secrets:
  - `ANDROID_KEYSTORE_BASE64` — o keystore inteiro em base64
  - `ANDROID_KEYSTORE_PASSWORD` — senha da store
  - `ANDROID_KEY_ALIAS` — `mesinha`
  - `ANDROID_KEY_PASSWORD` — senha da chave (mesma da store, nesse projeto)
- **Onde isso é consumido:** `android/app/build.gradle.kts`
  (`signingConfigs.release`, lê das variáveis de ambiente
  `ANDROID_KEYSTORE_PATH` / `_PASSWORD` / `ANDROID_KEY_ALIAS` / `_PASSWORD`)
  e `.github/workflows/android-release.yml` (decodifica o secret base64 pra
  um arquivo temporário e exporta as env vars pro Gradle).
- Build local (sem os secrets) simplesmente não assina — não trava o build de
  debug (`android-build.yml`), só o de release.

### Se perder o keystore
Como o app já foi publicado usando **Play App Signing** (padrão do Google
Play para apps novos), perder a chave de **upload** não é catastrófico:
Play Console → app → **Integridade do app → Assinatura do app → Solicitar
redefinição da chave de upload**. Antes do app ter uma versão em produção,
essa redefinição costuma ser aprovada na hora (self-service). Depois de ir
pra produção, pode exigir revisão manual do Google (alguns dias).

---

## 2. Firebase (notificações push / FCM)

- **Projeto Firebase:** `mesinha-8890e`
- **Project number / Sender ID:** `155231442025`
- **App Android registrado:** pacote `com.mesinha.app`
- **`google-services.json`:** vive em `android/app/google-services.json`
  (sim, está commitado — os valores nele, como `api_key`, são públicos por
  design do Firebase para apps Android/iOS; não é segredo).
  - Se precisar baixar de novo: Firebase Console → ⚙️ Configurações do
    projeto → aba **Seus apps** → app Android `com.mesinha.app` →
    `google-services.json`.
- **Service Account (permite o backend ENVIAR notificações):**
  - **Não está em GitHub Secret** — está guardado no **KV store do Supabase**,
    chave `fcm-service-account` (JSON completo da conta de serviço).
  - Alternativa: se preferir usar um secret de ambiente em vez do KV, crie
    `FCM_SERVICE_ACCOUNT` nos **Secrets do Supabase Edge Functions** — o
    código em `supabase/functions/server/fcm.tsx` (`getServiceAccount()`) dá
    prioridade ao secret de env; só cai pro KV se o env não existir.
  - Pra gerar uma nova chave, se precisar: Firebase Console → ⚙️
    Configurações do projeto → aba **Contas de serviço** → **Gerar nova
    chave privada**.
- **Onde o app pede permissão:** `MainActivity.kt`
  (`requestNotificationPermissionIfNeeded`, Android 13+/`POST_NOTIFICATIONS`).
- **Como o token chega ao backend:** o PWA chama
  `window.MesinhaNative.setProfile(profile)` (ver `src/app/App.tsx`) quando
  alguém loga; a ponte nativa (`MainActivity.NativeBridge`) pega o token FCM
  atual e registra via `POST /make-server-19717bce/fcm-token`
  (`{ profile, token }`), guardado no KV como `fcm-token:<Amanda|Mateus>`.
- **Envio:** `sendPushToUser()` no `index.ts` dispara **web-push** (Chrome/PWA)
  **e** FCM (app instalado) em paralelo, para lembretes e posts novos no mural.

---

## 3. Como gerar um novo APK ou AAB

### 3a. APK de debug (pra testar rápido, instala direto no celular)
- Dispara sozinho a cada push que mexe em `android/**`, no workflow
  **`Build Android APK`** (`.github/workflows/android-build.yml`).
- Ou dispare manualmente: GitHub → Actions → **Build Android APK** → **Run workflow**.
- Resultado: artifact `mesinha-debug-apk` (contém `app-debug.apk`), baixa e
  instala direto (ativar "instalar de fontes desconhecidas").

### 3b. AAB assinado (pra subir na Play Store)
- **Dispara sozinho** a cada push em `main` que mexa em `android/**`
  (`.github/workflows/android-release.yml`), e também pode ser disparado
  manualmente: GitHub → Actions → **Build & Publish Release AAB** →
  **Run workflow**.
- Requer os 4 secrets de assinatura da seção 1.
- **`versionCode` é automático:** o workflow usa o número do run do GitHub
  Actions (`github.run_number`) como `versionCode` — sempre novo e crescente,
  nunca precisa editar `build.gradle.kts` manualmente pra evitar colisão.
  `versionName` fica como `2.<run_number>`.
- Resultado: artifact `mesinha-release-aab` (contém `app-release.aab`) —
  disponível mesmo que a publicação automática (abaixo) não esteja configurada.
- **Publicação automática na Play Store:** se o secret
  `PLAY_SERVICE_ACCOUNT_JSON` existir, o workflow já publica o `.aab` direto
  nas faixas **internal** e **closed-testing** via Google Play Developer API
  (ver seção 5). Sem esse secret, o passo de publicação é pulado e você
  baixa o `.aab` do artifact pra subir manualmente.

---

## 4. Versionamento

Arquivo: `android/app/build.gradle.kts`

```kotlin
defaultConfig {
    applicationId = "com.mesinha.app"
    minSdk = 26
    targetSdk = 35   // compileSdk também em 35
    // Sobrescrito pelo CI via -PversionCode=N -PversionName=X (github.run_number).
    // Os valores abaixo só valem pra build local/manual sem essas properties.
    versionCode = (project.findProperty("versionCode") as String?)?.toIntOrNull() ?: 2
    versionName = (project.findProperty("versionName") as String?) ?: "2.0"
}
```

**Fluxo pra nova versão (automático, desde que `PLAY_SERVICE_ACCOUNT_JSON`
esteja configurado):**
1. Faça a mudança de código desejada, PR, merge em `main`.
2. Pronto — o CI builda, assina, calcula um `versionCode` novo sozinho
   (`github.run_number`) e publica direto no Teste Interno e Teste Fechado.
3. Acompanhe em Actions → **Build & Publish Release AAB**.

**Se quiser fazer manualmente** (ex: sem o secret de publicação configurado,
ou quer promover pra faixa de Produção, que não é auto-publicada):
1. PR + merge em `main` (o build/artifact roda automaticamente).
2. Baixe o `.aab` do artifact `mesinha-release-aab`.
3. Play Console → faixa desejada → criar versão → subir o `.aab`.

Você **não precisa mais editar `versionCode`/`versionName` manualmente** pra
builds feitos pelo CI — só se quiser dar um número "bonito"/semântico
proposital, o que hoje só afeta builds locais (o CI sempre sobrescreve).

---

## 5. Play Console

- **Pacote:** `com.mesinha.app`
- **Faixas configuradas:** Teste interno e Teste fechado (ambas já testadas
  e funcionando com a chave de upload atual).
- **Publicação automática (Google Play Developer API):**
  - Requer uma **conta de serviço** com acesso ao app no Play Console:
    Play Console → **Configuração → Acesso à API** → vincular/criar projeto
    Google Cloud → criar conta de serviço → voltar no Play Console e dar a
    ela permissão de lançar versões nas faixas de teste.
  - O JSON dessa conta de serviço vai **direto** como GitHub Secret
    `PLAY_SERVICE_ACCOUNT_JSON` (`Settings → Secrets and variables →
    Actions`) — nunca precisa passar por chat/arquivo, é gerado e colado
    pelo próprio dono da conta Google.
  - O workflow `android-release.yml` usa a action `r0adkll/upload-google-play`
    pra publicar nas faixas `internal` e `closed-testing` (esse último nome
    deve bater com o identificador exato da faixa fechada configurada — se o
    Play Console usar outro nome/id, ajuste a linha `track:` no workflow).
  - Sem esse secret configurado, o workflow continua funcionando normalmente,
    só pula os passos de publicação (gera só o artifact do `.aab`).
- **Categorias de assets da ficha da loja:** ícone (512×512), gráfico de
  destaque (1024×500) e capturas de tela — só as de **smartphone são
  obrigatórias** (2 a 8, 9:16, entre 320-3840px por lado). Tablet
  7"/10" e as demais categorias são opcionais (o app não tem layout dedicado
  pra tablet — é um container de largura fixa de celular).
- **"Precisa desinstalar o app anterior pra instalar o novo"** — o Android
  recusa atualizar um app quando a **assinatura muda**. Duas causas possíveis:

  1. **APK de debug** (`android-build.yml`). *Corrigido:* o debug não tinha
     configuração de assinatura, então o Gradle usava o keystore automático do
     Android — gerado **novo a cada run do CI**. Cada APK de debug saía com uma
     assinatura diferente, e nem debug sobre debug atualizava. Agora o debug é
     assinado com a mesma chave de upload do release, e todos os APKs que o CI
     gera atualizam por cima uns dos outros.

  2. **Misturar Play Store com APK direto** — *isso não tem correção técnica.*
     Com o Play App Signing, o Google **re-assina** o app com uma chave que
     você não possui; o APK do GitHub é assinado com a chave de *upload*. São
     assinaturas diferentes para o mesmo `com.mesinha.app`, então um nunca
     atualiza o outro. A solução é **escolher um canal e ficar nele**:
     - *Só APK direto* (recomendado pra vocês dois): desinstale uma vez,
       instale pelo link da GitHub Release, e daí em diante toda atualização
       instala por cima. Sem revisão do Google, vale na hora.
     - *Só Play Store*: instale pela faixa de teste e deixe o Play atualizar.

- **Se aparecer erro de "chave de assinatura incorreta"** ao subir um AAB:
  significa que aquele app específico na Play Console já tem uma chave de
  upload diferente registrada (de um envio anterior). Ou usa a opção de
  "Solicitar redefinição da chave de upload" (seção 1), ou cria um app novo
  no Play Console (a primeira versão enviada a um app novo sempre é aceita,
  qualquer que seja a chave).

---

## 6. Backend (Supabase Edge Function)

- **Projeto Supabase:** `oubdmmaqxnutbbxiqeow`
- **Função:** `server` (única função, roteada por prefixo
  `/make-server-19717bce/...` usando Hono)
- **Deploy:** automático ao push em `main` que mexe em
  `supabase/functions/**` (`.github/workflows/deploy-supabase.yml`), via
  secret `SUPABASE_ACCESS_TOKEN` já configurado no GitHub.
- **Banco:** tabela única `kv_store_19717bce` (chave/valor JSONB). Chaves
  relevantes em uso:
  - `item:<id>` — cada item das listas (mural, lembretes, filmes, etc.)
  - `settings` — configurações do casal
  - `push-subscription:<Amanda|Mateus>` — inscrição de web-push
  - `fcm-token:<Amanda|Mateus>` — token de notificação nativa (Android)
  - `fcm-service-account` — credencial de envio do Firebase (seção 2)
  - `widget-phrases` — `{ dupla, amanda, mateus }`, as falas dos widgets
    (editável via app em Configurações; ver seção 7)
  - `location:<Amanda|Mateus>` — sessão de compartilhamento de localização
    (aba Mapa, ver seção 8): `{ lat, lng, updatedAt, expiresAt }`, dura 1h a
    partir do início e some sozinha (o `GET /location` já filtra expiradas)
- **Login:** validado apenas no cliente (`api.login` em
  `src/app/utils/api.ts`): Amanda = `Mateus`, Mateus = `Amanda` (a senha de
  cada um é o nome do parceiro). Não há endpoint de login no servidor.

---

## 7. Widgets de tela inicial (Android)

Quatro widgets. Os três de frase são 2×4, fundo azul-tiffany translúcido,
responsivos a 1×4; o quarto ("Encontro hoje?") é 1×1:

| Widget | Provider | Personagem(ns) | Fonte das frases |
|---|---|---|---|
| Mesinha · Conversa | `MesinhaWidgetProvider.kt` | Corvinho + Alpaquinha | Fixo (não editável pelo app) |
| Mesinha · Recado da Amanda | `AlpaquinhaWidgetProvider.kt` | Alpaquinha | Editável pela Amanda em Configurações |
| Mesinha · Recado do Mateus | `CorvinhoWidgetProvider.kt` | Corvinho | Editável pelo Mateus em Configurações |
| Mesinha · Encontro hoje? | `MeetupWidgetProvider.kt` | — | Calendário de Encontros (ver abaixo) |

- Frase muda **1×/dia** (índice determinístico por dia-do-ano, ver
  `Dialogues.kt` / `Dialogues.dailyIndex`).
- **Autocura:** o alarme diário usa `setAndAllowWhileIdle` + `RTC_WAKEUP`
  (resiste a Doze); além disso, toda vez que o app abre
  (`MainActivity.refreshWidgets()`), ele força os 4 widgets a atualizar —
  então mesmo se o alarme for morto pela bateria, abrir o app resolve.
- **Falas editáveis:** `PhraseRepository.kt` busca de
  `GET /make-server-19717bce/widget-phrases` (cacheado em
  SharedPreferences, throttle de 3h). Editor no app web:
  `src/app/components/WidgetPhrasesEditor.tsx`, dentro de
  `src/app/pages/Settings.tsx`. Cada pessoa só edita a lista do seu
  personagem (`PUT /widget-phrases/:list`, valida que o perfil bate com a
  lista).
- Falas de **reserva**: `Dialogues.kt` no Android (usadas no primeiro uso do
  widget ou offline) e `DEFAULT_WIDGET_PHRASES` no `index.ts` do backend
  (usadas enquanto o KV `widget-phrases` não existe). Ao mudar uma, avalie
  se a outra precisa acompanhar.
- **"Encontro hoje?" (1×1):** `MeetupRepository.kt` busca de
  `GET /make-server-19717bce/meetup-today` (cacheado em SharedPreferences,
  throttle de 20min + atualização periódica via `updatePeriodMillis` de
  30min) e devolve `{ date, confirmed, type, period }` — "hoje" já resolvido
  no fuso de Brasília no servidor. O ícone mostrado depende de `type`:
  coração cheio (`heart_full`) = "coracao" (juntos em casa), controle
  (`ic_meetup_videogame`) = "videogame" (cada um joga na sua casa), pegadas
  (`ic_meetup_footprints`) = "pegadas" (sair); sem encontro confirmado hoje,
  mostra coração vazio (`heart_empty`). O tipo e o período são escolhidos no
  app web ao propor o encontro (`MeetupCalendar.tsx`) e ficam salvos no item
  (categoria `meetup`) como `meetupType`/`meetupPeriod`.

---

## 8. Mapa (compartilhamento de localização em tempo real)

Aba "Mapa" (dentro do slider de ferramentas do `CategoryMenu`, junto com
"Encontros"): qualquer um dos dois toca em "Compartilhar minha localização
por 1h", o app pede permissão de geolocalização, começa a mandar a posição
pro servidor e notifica o parceiro pra também ativar. Enquanto os dois
estiverem compartilhando, o mapa mostra as duas posições em tempo real.

- **Frontend:**
  - `src/app/hooks/useLocationSharing.ts` — fica montado na `Home` (não só
    dentro da aba Mapa) pra continuar rodando o `navigator.geolocation.watchPosition`
    e o timer de 1h mesmo trocando de categoria dentro do app. Manda posição
    nova no máximo 1x a cada ~12s (throttle).
  - `src/app/components/MapView.tsx` — mapa em si (Leaflet + OpenStreetMap,
    sem precisar de API key), marcadores em emoji (🦙 Amanda / 🐦‍⬛ Mateus),
    auto-enquadra os dois pontos quando ambos estão compartilhando.
  - Sincronização em tempo real via o mesmo canal de broadcast do resto do
    app (`realtimeChannel.ts`, eventos `location_updated`/`location_stopped`)
    — a posição do parceiro atualiza no mapa sem precisar dar refresh.
- **Backend:** `POST /location/start` (inicia sessão de 1h + notifica o
  parceiro), `PUT /location` (atualiza lat/lng, só aceito com sessão ainda
  válida), `GET /location` (estado atual dos dois, usado no primeiro load),
  `DELETE /location` (para de compartilhar). Ver seção 6 para a chave do KV.
- **Limitação conhecida:** o compartilhamento depende do app/aba continuar
  aberto (é um `watchPosition` de JavaScript, não um serviço nativo em
  background) — se o sistema operacional suspender a aba/app, o
  compartilhamento para até reabrir. Isso é esperado num PWA/WebView sem
  serviço de localização em background nativo.
- **Android (WebView):** geolocalização dentro do WebView **não funciona por
  padrão** — precisa de `settings.setGeolocationEnabled(true)` e implementar
  `WebChromeClient.onGeolocationPermissionsShowPrompt(...)` pedindo a
  permissão nativa `ACCESS_FINE_LOCATION` (ambos em `MainActivity.kt`, mesmo
  padrão já usado pro microfone). Sem isso, `navigator.geolocation` fica
  pendurado/falha silenciosamente dentro do app instalado (funciona normal
  num navegador comum, então esse detalhe só importa pro APK/AAB nativo).

---

## 9. App Android — estrutura de arquivos

```
android/
├── app/
│   ├── build.gradle.kts        # versionCode/Name, signing, deps (Firebase)
│   ├── google-services.json    # config Firebase (commitado, não é segredo)
│   └── src/main/
│       ├── AndroidManifest.xml
│       ├── java/com/mesinha/app/
│       │   ├── MainActivity.kt            # WebView + pontes nativas (arquivo, mic, FCM)
│       │   ├── MesinhaWidgetProvider.kt    # widget "Conversa"
│       │   ├── AlpaquinhaWidgetProvider.kt # widget da Amanda
│       │   ├── CorvinhoWidgetProvider.kt   # widget do Mateus
│       │   ├── MeetupWidgetProvider.kt     # widget "Encontro hoje?" (1x1)
│       │   ├── MeetupRepository.kt         # busca/cacheia estado do dia (GET /meetup-today)
│       │   ├── Dialogues.kt                # falas de reserva + índice diário
│       │   ├── PhraseRepository.kt         # busca/cacheia falas do backend
│       │   ├── WidgetScheduler.kt          # alarme diário (Doze-proof)
│       │   ├── WidgetCommon.kt             # helper de clique (abre o app)
│       │   ├── BootReceiver.kt             # reagenda alarmes após reiniciar
│       │   ├── FcmSupport.kt               # canal de notificação + registro de token
│       │   └── MesinhaMessagingService.kt  # recebe push do FCM
│       └── res/
│           ├── layout/          # 4 widgets (+ variante compacta do duplo)
│           ├── xml/             # *_info.xml (tamanho/config de cada widget)
│           ├── drawable/        # personagens (corvinho/alpaquinha), balões, fundo, ícones de encontro
│           └── mipmap-*/        # ícone do launcher (o mesmo do PWA)
├── build.gradle.kts             # plugins de nível raiz (AGP, Kotlin, google-services)
└── .gitignore                   # *.jks, *.keystore nunca vão pro git
```

**Editar a URL do PWA que a WebView abre:** constante `MESINHA_URL` em
`MainActivity.kt` (hoje: `https://mesinha-recomeco2.pages.dev/`).

---

## 10. Branches importantes

- **`main`** — produção. Todo merge aqui dispara os deploys automáticos.
- **`backup/pwa-pre-android-20260630`** — snapshot da versão só-PWA, antes de
  qualquer código Android existir. Não mexer; é a rede de segurança.
- Branches de trabalho (`release/vN-*`, `claude/*`) são de uso único —
  criadas a partir de `main`, mergeadas via PR, podem ser apagadas depois.

---

## 11. Checklist rápido — "quero soltar uma versão nova"

**Com `PLAY_SERVICE_ACCOUNT_JSON` configurado (fluxo atual):**
1. Fazer a mudança de código, PR, merge em `main`.
2. Pronto. O CI builda, assina, versiona e publica sozinho no Teste Interno e
   Teste Fechado. Acompanhar em Actions → **Build & Publish Release AAB**.
3. Quer promover pra **Produção**? Isso continua manual — Play Console →
   Produção → criar versão → **promover** a partir de uma das faixas de teste
   (não precisa gerar `.aab` de novo).

**Sem o secret de publicação (fallback manual):**
1. PR → merge em `main` (build automático roda de qualquer forma).
2. Se mexeu em `supabase/functions/**`: aguardar o deploy automático do
   backend (`deploy-supabase.yml`).
3. Baixar o artifact `mesinha-release-aab` (Actions → **Build & Publish
   Release AAB** → run mais recente).
4. Play Console → app → faixa de teste desejada → criar versão → subir o `.aab`.
