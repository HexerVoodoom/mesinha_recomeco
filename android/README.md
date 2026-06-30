# Mesinha — App Android + Widget de tela inicial

App Android nativo do Mesinha. Ele faz duas coisas:

1. **App** (`MainActivity`): abre o PWA do Mesinha dentro de uma WebView, então
   no celular você tem o ícone do Mesinha junto dos outros apps.
2. **Widget de tela inicial** (`MesinhaWidgetProvider`): um widget **2×4** com o
   **Corvinho** à esquerda, a **Alpaquinha** à direita e dois balões de fala no
   centro. As frases **mudam 1× por dia**, sorteadas de um pool de **32 pares**
   (ver `Dialogues.kt`). É a versão nativa do widget que existe dentro do app web
   (`src/app/components/CharacterDialogueWidget.tsx`) — usam a mesma fórmula de
   índice diário, então mostram a **mesma frase no mesmo dia**.

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
3. Procure por **Mesinha** ▸ arraste o widget **2×4** para a tela.
4. A frase do dia aparece e troca sozinha à meia-noite. Tocar no widget abre o app.

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

## Editar as frases

Abra `app/src/main/java/com/mesinha/app/Dialogues.kt` e edite a lista `POOL`.
Para manter o app web em sincronia, edite também o mesmo pool em
`src/app/components/CharacterDialogueWidget.tsx`.

## Versões

- Android Gradle Plugin **8.6.1**, Gradle **8.14.3**, Kotlin **2.0.21**
- `compileSdk`/`targetSdk` **34**, `minSdk` **26** (Android 8.0+)
