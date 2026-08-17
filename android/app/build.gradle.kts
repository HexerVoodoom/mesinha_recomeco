plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("com.google.gms.google-services")
}

android {
    namespace = "com.mesinha.app"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.mesinha.app"
        minSdk = 26
        targetSdk = 35
        // O CI de publicação automática sobrescreve esses dois via
        // `-PversionCode=N -PversionName=X` (usando o número do run do GitHub
        // Actions), garantindo um versionCode sempre novo e crescente sem
        // depender de lembrar de editar este arquivo. Builds locais/manuais
        // sem essas properties usam os valores fixos abaixo.
        versionCode = (project.findProperty("versionCode") as String?)?.toIntOrNull() ?: 2
        versionName = (project.findProperty("versionName") as String?) ?: "2.0"
    }

    // Assinatura de release. Só é configurada quando a chave de upload está
    // disponível via variáveis de ambiente (no CI, a partir dos GitHub Secrets).
    // Checa vazio além de nulo: um secret ausente chega como string vazia, e
    // aí `!= null` passaria e o build quebraria tentando assinar sem arquivo.
    val uploadKeystorePath: String? = System.getenv("ANDROID_KEYSTORE_PATH")
        ?.takeIf { it.isNotBlank() && file(it).exists() }

    signingConfigs {
        create("release") {
            if (uploadKeystorePath != null) {
                storeFile = file(uploadKeystorePath)
                storePassword = System.getenv("ANDROID_KEYSTORE_PASSWORD")
                keyAlias = System.getenv("ANDROID_KEY_ALIAS")
                keyPassword = System.getenv("ANDROID_KEY_PASSWORD")
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
            if (uploadKeystorePath != null) {
                signingConfig = signingConfigs.getByName("release")
            }
        }

        // O APK de debug usa o MESMO applicationId do release, então os dois
        // disputam a mesma instalação no aparelho. Sem esta configuração o
        // Gradle assina o debug com o keystore automático do Android — que no
        // runner do CI é gerado NOVO a cada execução. Resultado: cada APK de
        // debug saía com uma assinatura diferente, e o Android recusa
        // atualizar um app quando a assinatura muda ("app não instalado" /
        // "desinstale o anterior"). Nem debug sobre debug funcionava.
        //
        // Assinando o debug com a mesma chave de upload, todos os APKs que o
        // CI gera passam a ser intercambiáveis e atualizam por cima uns dos
        // outros. Em build local (sem os secrets) segue no keystore padrão.
        debug {
            if (uploadKeystorePath != null) {
                signingConfig = signingConfigs.getByName("release")
            }
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.appcompat:appcompat:1.7.0")

    // Firebase Cloud Messaging (notificações push no app instalado).
    implementation(platform("com.google.firebase:firebase-bom:33.5.1"))
    implementation("com.google.firebase:firebase-messaging")
}
