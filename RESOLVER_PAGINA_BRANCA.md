# 🔧 Resolver: Página Branca no Google Drive

## ❓ Problema

Quando você clica em "Conectar com Google Drive", uma janela popup abre, você autoriza, mas chega em uma página branca.

A URL fica assim:
```
https://...figma.site/oauth-callback.html#access_token=ya29...
```

## ✅ Solução

O problema é que a **URI de redirecionamento** não foi adicionada no Google Cloud Console.

### Passo a Passo:

#### 1️⃣ Copie a URI Correta

No app:
1. Vá em **Configurações** (⚙️)
2. **Configurações Avançadas de Backup**
3. Expanda a seção azul **"Como configurar Google Drive"**
4. Copie a **"URI Atual"** que aparece lá

Ou use esta URI padrão:
```
https://stack-chrome-89765457.figma.site/oauth-callback.html
```

#### 2️⃣ Adicione no Google Cloud Console

1. Acesse: https://console.cloud.google.com/apis/credentials

2. Procure por: `305705048348-jbfvtamh0llghkfiuntt9bqlc48vhukc.apps.googleusercontent.com`

3. Clique no **ícone de lápis** (editar)

4. Role até **"URIs de redirecionamento autorizados"**

5. Clique em **"+ ADICIONAR URI"**

6. Cole a URI copiada:
   ```
   https://stack-chrome-89765457.figma.site/oauth-callback.html
   ```

7. **IMPORTANTE:** Adicione também estas URIs alternativas:
   ```
   http://localhost:5173/oauth-callback.html
   ```
   
   E se o app estiver em outro domínio, adicione também:
   ```
   https://SEU-DOMINIO/oauth-callback.html
   ```

8. Clique em **SALVAR** no final da página

#### 3️⃣ Aguarde 5 minutos

O Google precisa de alguns minutos para propagar as mudanças.

#### 4️⃣ Tente Novamente

1. No app, vá em Configurações
2. Clique em **"Conectar com Google Drive"** novamente
3. Autorize no popup
4. Agora deve funcionar! ✅

---

## 🔍 Como Verificar se Funcionou

Quando funcionar corretamente, você verá:

1. **No popup:** Uma mensagem "✅ Sucesso! Autenticação concluída! Fechando..."
2. **No app:** Ícone verde "Conectado ao Google Drive"
3. **Em Modo de Sincronização:** Poderá ativar "Local + Google Drive"

---

## 🆘 Ainda não funcionou?

### Problema: Popup ainda fica em branco

**Causa:** URI não foi adicionada corretamente

**Solução:**
1. Verifique se salvou as mudanças no Google Cloud Console
2. Aguarde 5-10 minutos
3. Limpe o cache do navegador
4. Tente novamente

### Problema: "Failed to open popup"

**Causa:** Navegador está bloqueando popups

**Solução:**
1. Habilite popups para este site
2. No Chrome: ícone de bloqueio na barra de endereço → Configurações do site → Popups → Permitir

### Problema: Erro "redirect_uri_mismatch"

**Causa:** URI no Google Cloud Console está diferente

**Solução:**
1. Confira se a URI está **exatamente igual** (incluindo https/http)
2. Não pode ter espaços extras
3. Tem que terminar com `/oauth-callback.html`

---

## 📝 Checklist Final

Antes de tentar conectar, confirme:

- [ ] URI adicionada no Google Cloud Console
- [ ] URI termina com `/oauth-callback.html`
- [ ] Clicou em SALVAR no Google Cloud Console
- [ ] Aguardou pelo menos 5 minutos
- [ ] Popups estão habilitados no navegador
- [ ] Client ID está correto: `305705048348-jbfvtamh0llghkfiuntt9bqlc48vhukc.apps.googleusercontent.com`

---

## 💡 Dica

Adicione **todas as URIs possíveis** no Google Cloud Console de uma vez:

```
https://stack-chrome-89765457.figma.site/oauth-callback.html
http://localhost:5173/oauth-callback.html
https://87b30230-7959-40b8-883f-ace28edb6be1-v3-figmaiframepreview.figma.site/oauth-callback.html
```

Assim funciona em qualquer lugar onde o app rodar!
