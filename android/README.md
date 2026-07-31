# Mesinha — App Android + Widget de tela inicial

App Android nativo do Mesinha. Ele faz duas coisas:

1. **App** (`MainActivity`): abre o PWA do Mesinha dentro de uma WebView, então
   no celular você tem o ícone do Mesinha junto dos outros apps.
2. **Widgets de tela inicial** — quatro opções no menu de widgets:
   - **Mesinha · Conversa** (`MesinhaWidgetProvider`, 2×4): Corvinho à esquerda,
     Alpaquinha à direita e dois balões de fala, mudando 1× por dia (32 pares
     de frases, ver `Dialogues.kt`).
   - **Mesinha · Recado da Amanda** (`AlpaquinhaWidgetProvider`, 2×4): só a
     Alpaquinha, com recadinhos da Amanda para o Mateus (30 frases).
   - **Mesinha · Recado do Mateus** (`CorvinhoWidgetProvider`, 2×4): só o
     Corvinho, com recadinhos do Mateus para a Amanda (30 frases).
   - **Mesinha · Encontro hoje?** (`MeetupWidgetProvider`, 1×1): coração cheio
     quando o dia de hoje está confirmado no Calendário de Encontros do app,
     vazio quando ainda não está (consulta o endpoint `/meetup-today`, que já
     resolve "hoje" no fuso de Brasília).

## Pré-requisitos

- **Android Studio** (recomendado — já traz o Android SDK), ou o **Android SDK**
  instalado e a variável `ANDROID_HOME` configurada.
- JDK 17+.

## Como abrir e gerar o APK

### Opção A — Android Studio (mais fácil)

1. `File ▸ Open` e selecione a pasta **`android/`** deste repositório.
2. Aguarde o Gradle sincronizar (ele baixa o Android Gradle Plugin e dependências).
3. **Ajuste a URL do app** em `MainActivity.kt` (constante `MESINHA_URL`) para a
   URL de produção do Mesinha.
4. `Build ▸ Build Bundle(s) / APK(s) ▸ Build APK(s)`.
5. Instale o APK gerado no celular (ou rode direto com `Run ▶`).

### Opção B — Linha de comando

```bash
cd android
# Aponte para o seu Android SDK (uma vez):
echo "sdk.dir=/caminho/para/Android/Sdk" > local.properties

./gradlew assembleDebug
# APK em: app/build/outputs/apk/debug/app-debug.apk
```

> Este projeto **não inclui** o Android SDK nem o `local.properties` (que é
> específico da sua máquina). O Android Studio cria o `local.properties`
> automaticamente ao abrir o projeto.

## Como adicionar o widget na tela

1. Instale o app no celular.
2. Pressione e segure num espaço vazio da tela inicial ▸ **Widgets**.
3. Procure por **Mesinha** ▸ arraste o widget desejado para a tela (os três de
   conversa/recado são **2×4**; o "Encontro hoje?" é **1×1**).
4. Frase do dia e coração atualizam sozinhos (frase à meia-noite; coração a
   cada ~30min ou quando alguém confirma um encontro). Tocar no widget abre o app.

## Estrutura

```
android/
├── app/
│   ├── build.gradle.kts
│   └── src/main/
│       ├── AndroidManifest.xml
│       ├── java/com/mesinha/app/
│       │   ├── Dialogues.kt              # pool de 32 frases + índice diário
│       │   ├── MesinhaWidgetProvider.kt  # o widget
│       │   ├── WidgetScheduler.kt        # alarme diário (meia-noite)
│       │   ├── BootReceiver.kt           # reagenda após reiniciar o aparelho
│       │   └── MainActivity.kt           # WebView com o PWA
│       └── res/
│           ├── layout/widget_dialogue.xml
│           ├── xml/widget_dialogue_info.xml   # tamanho 2×4
│           ├── drawable/                       # personagens + balões + fundo
│           ├── mipmap-anydpi-v26/              # ícone do app (adaptive)
│           └── values/                         # strings, cores, tema
├── build.gradle.kts
├── settings.gradle.kts
└── gradlew / gradlew.bat / gradle/wrapper/
```

## Editar as frases (SEM reinstalar o app)

As frases individuais são editadas **dentro do próprio app**: Configurações →
"Falas do Corvinho" (Mateus) / "Falas da Alpaquinha" (Amanda). Elas ficam no
backend (KV `widget-phrases`, servidas pelo endpoint `/widget-phrases`); o
widget baixa a lista nova automaticamente (no máximo 1× a cada 3h, e sempre na
virada do dia) e a guarda em cache. **Não precisa gerar nem instalar APK novo.**

As frases do widget duplo ("Conversa") são fixas, definidas no fallback do
backend (`supabase/functions/server/index.ts`, `DEFAULT_WIDGET_PHRASES`).

As frases embutidas em `app/src/main/java/com/mesinha/app/Dialogues.kt` são apenas
a **reserva** (usadas no primeiro uso ou sem internet).

## Versões

- Android Gradle Plugin **8.6.1**, Gradle **8.14.3**, Kotlin **2.0.21**
- `compileSdk`/`targetSdk` **34**, `minSdk` **26** (Android 8.0+)
