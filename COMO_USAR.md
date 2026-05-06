# 🚀 Como Usar - Sincronização Automática

## ⚠️ IMPORTANTE - Configuração Obrigatória

Antes de usar, você **PRECISA** adicionar a URI de redirecionamento no Google Cloud Console:

### 📋 Passo 0: Configurar URI de Redirecionamento

1. Acesse: https://console.cloud.google.com/apis/credentials
2. Encontre o Client ID: `305705048348-jbfvtamh0llghkfiuntt9bqlc48vhukc.apps.googleusercontent.com`
3. Clique em **Editar** (ícone de lápis)
4. Em **"URIs de redirecionamento autorizados"**, adicione **TODAS** estas URIs:

```
https://stack-chrome-89765457.figma.site/oauth-callback.html
http://localhost:5173/oauth-callback.html
```

**E também a URI do seu domínio atual** (veja no app em "Configurações Avançadas de Backup")

5. Clique em **Salvar**

**Sem isso, a autenticação NÃO funcionará!** ⚠️

---

## ⚡ Início Rápido (2 passos!)

Depois de configurar as URIs acima:

### 1. Conectar com Google Drive
1. Abra o app → **Configurações** (⚙️)
2. **Configurações Avançadas de Backup** → Expandir
3. Seção **Google Drive**:
   - Client ID já está preenchido ✅
   - Clique: **"Conectar com Google Drive"**
   - Autorize no popup do Google

### 2. Ativar Sincronização
1. Em **"Modo de Sincronização"**
2. Selecione: **"Local + Google Drive"**

**🎉 Pronto!** Agora tudo sincroniza automaticamente!

---

## 🔄 Como Funciona

### Salvamento Automático Inteligente
Quando você:
- ✅ Criar um item
- ✅ Editar um item
- ✅ Excluir um item
- ✅ Mudar configurações

→ **Salva localmente IMEDIATAMENTE**  
→ **Sincroniza com Google Drive após 2 segundos** (para juntar múltiplas mudanças)

### Sincronização Bidirecional
Ao abrir o app ou a cada 5 minutos:
- 🔄 **Compara** dados locais com Google Drive
- 📥 **Baixa** itens novos do Google Drive
- 📤 **Envia** itens novos para Google Drive
- ⚡ **Merge inteligente** - versão mais recente sempre vence
- 💾 **Armazena localmente** - não precisa baixar tudo toda vez!

### Como o Merge Funciona
1. Compara timestamps (updatedAt/createdAt)
2. Versão mais recente vence
3. Itens novos de qualquer lado são adicionados
4. Nada é perdido!

---

## 📍 Verificar Status

No topo de **Configurações Avançadas de Backup**:

✅ **Sincronização Ativa:** Dados sendo salvos no Google Drive
- Backup automático ao salvar itens
- Restauração automática ao abrir o app

---

## 🆘 Problemas Comuns

### "Failed to open popup"
**Solução:** Habilite popups para este site

### Dados não sincronizam
**Verifique:**
1. Modo está em **"Local + Google Drive"** ✅
2. Ícone verde mostra **"Conectado ao Google Drive"** ✅

### Não restaurou ao abrir
**Nota:** Restauração automática só acontece se não houver dados locais
- Use botão **"Restaurar"** manual se necessário

---

## 🎯 Alternativas

### Sem Google Drive
- Use modo **"Apenas Local"**
- Dados ficam só no navegador
- Use **"Restaurar do Supabase"** para recuperar dados salvos no servidor

### Backup Manual
- Botão **"Salvar Backup"** → Download .json
- Botão **"Carregar Backup"** → Upload .json

---

## 📱 Múltiplos Dispositivos

1. Configure Google Drive no primeiro dispositivo
2. No segundo dispositivo:
   - Conecte com a mesma conta Google
   - Ative **"Local + Google Drive"**
   - Dados sincronizam automaticamente! 🔄

---

**Google Client ID pré-configurado:**
```
305705048348-jbfvtamh0llghkfiuntt9bqlc48vhukc.apps.googleusercontent.com
```
