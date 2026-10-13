plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("com.google.gms.google-services")
}

android {
    namespace = "com.mesinha.app"
    compileSdk = 36

    defaultConfig {
        applicationId = "com.mesinha.app"
        minSdk = 26
        targetSdk = 36
        versionCode = 26
        versionName = "2.26"
    }

    // Assinatura de release: lê keystore/senhas de variáveis de ambiente (nunca versionadas).
    signingConfigs {
        create("release") {
            val ks = System.getenv("MESINHA_KEYSTORE")
            if (ks != null) {
                storeFile = file(ks)
                storePassword = System.getenv("MESINHA_STOREPASS")
                keyAlias = System.getenv("MESINHA_ALIAS")
                keyPassword = System.getenv("MESINHA_STOREPASS")
            }
        }
    }

    buildTypes {
        release {
            if (System.getenv("MESINHA_KEYSTORE") != null) {
                signingConfig = signingConfigs.getByName("release")
            }
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
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
