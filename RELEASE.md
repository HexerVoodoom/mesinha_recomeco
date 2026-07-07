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
- O **APK/AAB do Android nunca é gerado automaticamente** — precisa disparar
  manualmente (ver seção 3).

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
- **Nunca dispara sozinho** — sempre manual: GitHub → Actions →
  **Build Release AAB** → **Run workflow** (branch `main`).
- Requer os 4 secrets da seção 1 já configurados.
- Resultado: artifact `mesinha-release-aab` (contém `app-release.aab`).
- **Antes de disparar, confira/atualize a versão** (seção 4) — a Play Store
  rejeita reenviar o mesmo `versionCode`.

---

## 4. Versionamento

Arquivo: `android/app/build.gradle.kts`

```kotlin
defaultConfig {
    applicationId = "com.mesinha.app"
    minSdk = 26
    targetSdk = 35   // compileSdk também em 35
    versionCode = 2  // <- incremente a CADA envio novo à Play Store (inteiro, sempre +1)
    versionName = "2.0" // <- string livre, só cosmética (ex: "2.1", "2.1.0")
}
```

**Fluxo pra nova versão:**
1. Edite `versionCode` (incrementa) e `versionName` (à vontade) em
   `android/app/build.gradle.kts`.
2. Commit + PR + merge em `main` (siga o padrão de commits do repo:
   `chore(android): bump version to N (versionCode N, versionName "X.Y")`).
3. Dispare o workflow **Build Release AAB** (seção 3b).
4. Baixe o `.aab` do artifact e suba na faixa de teste/produção desejada no
   Play Console.

---

## 5. Play Console

- **Pacote:** `com.mesinha.app`
- **Faixas configuradas:** Teste interno e Teste fechado (ambas já testadas
  e funcionando com a chave de upload atual).
- **Categorias de assets da ficha da loja:** ícone (512×512), gráfico de
  destaque (1024×500) e capturas de tela — só as de **smartphone são
  obrigatórias** (2 a 8, 9:16, entre 320-3840px por lado). Tablet
  7"/10" e as demais categorias são opcionais (o app não tem layout dedicado
  pra tablet — é um container de largura fixa de celular).
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
- **Login:** senhas fixas no código (`PASSWORDS` em `index.ts` e também
  hardcoded no cliente em `src/app/utils/api.ts`): Amanda = `Mateus`,
  Mateus = `Amanda` (a senha de cada um é o nome do parceiro).

---

## 7. Widgets de tela inicial (Android)

Três widgets, todos 2×4, fundo azul-tiffany translúcido, responsivos a 1×4:

| Widget | Provider | Personagem(ns) | Fonte das frases |
|---|---|---|---|
| Mesinha · Conversa | `MesinhaWidgetProvider.kt` | Corvinho + Alpaquinha | Fixo (não editável pelo app) |
| Mesinha · Recado da Amanda | `AlpaquinhaWidgetProvider.kt` | Alpaquinha | Editável pela Amanda em Configurações |
| Mesinha · Recado do Mateus | `CorvinhoWidgetProvider.kt` | Corvinho | Editável pelo Mateus em Configurações |

- Frase muda **1×/dia** (índice determinístico por dia-do-ano, ver
  `Dialogues.kt` / `Dialogues.dailyIndex`).
- **Autocura:** o alarme diário usa `setAndAllowWhileIdle` + `RTC_WAKEUP`
  (resiste a Doze); além disso, toda vez que o app abre
  (`MainActivity.refreshWidgets()`), ele força os 3 widgets a atualizar —
  então mesmo se o alarme for morto pela bateria, abrir o app resolve.
- **Falas editáveis:** `PhraseRepository.kt` busca de
  `GET /make-server-19717bce/widget-phrases` (cacheado em
  SharedPreferences, throttle de 3h). Editor no app web:
  `src/app/components/WidgetPhrasesEditor.tsx`, dentro de
  `src/app/pages/Settings.tsx`. Cada pessoa só edita a lista do seu
  personagem (`PUT /widget-phrases/:list`, valida que o perfil bate com a
  lista).
- Falas embutidas (`Dialogues.kt` no Android e `public/widget-phrases.json`
  no repo) servem só de **reserva** — usadas no primeiro uso do widget ou
  quando offline, antes do primeiro fetch bem-sucedido.

---

## 8. App Android — estrutura de arquivos

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
│       │   ├── Dialogues.kt                # falas de reserva + índice diário
│       │   ├── PhraseRepository.kt         # busca/cacheia falas do backend
│       │   ├── WidgetScheduler.kt          # alarme diário (Doze-proof)
│       │   ├── WidgetCommon.kt             # helper de clique (abre o app)
│       │   ├── BootReceiver.kt             # reagenda alarmes após reiniciar
│       │   ├── FcmSupport.kt               # canal de notificação + registro de token
│       │   └── MesinhaMessagingService.kt  # recebe push do FCM
│       └── res/
│           ├── layout/          # 3 widgets (+ variante compacta do duplo)
│           ├── xml/             # *_info.xml (tamanho/config de cada widget)
│           ├── drawable/        # personagens (corvinho/alpaquinha), balões, fundo
│           └── mipmap-*/        # ícone do launcher (o mesmo do PWA)
├── build.gradle.kts             # plugins de nível raiz (AGP, Kotlin, google-services)
└── .gitignore                   # *.jks, *.keystore nunca vão pro git
```

**Editar a URL do PWA que a WebView abre:** constante `MESINHA_URL` em
`MainActivity.kt` (hoje: `https://mesinha-recomeco2.pages.dev/`).

---

## 9. Branches importantes

- **`main`** — produção. Todo merge aqui dispara os deploys automáticos.
- **`backup/pwa-pre-android-20260630`** — snapshot da versão só-PWA, antes de
  qualquer código Android existir. Não mexer; é a rede de segurança.
- Branches de trabalho (`release/vN-*`, `claude/*`) são de uso único —
  criadas a partir de `main`, mergeadas via PR, podem ser apagadas depois.

---

## 10. Checklist rápido — "quero soltar uma versão nova"

1. `git checkout -B release/vN origin/main`
2. Editar `android/app/build.gradle.kts` → `versionCode`/`versionName` (seção 4)
3. (Se mudou algo no app) commit das mudanças de código também
4. PR → merge em `main`
5. Se mexeu em `supabase/functions/**`: aguardar o deploy automático do
   backend (`deploy-supabase.yml`)
6. Actions → **Build Release AAB** → Run workflow (branch `main`)
7. Baixar o artifact `mesinha-release-aab`
8. Play Console → app → faixa de teste desejada → criar versão → subir o `.aab`
