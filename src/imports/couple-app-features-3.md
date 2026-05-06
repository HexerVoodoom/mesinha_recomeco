Funcionalidades e recursos do app
1) Conta, casal e acesso

Criar “Espaço do Casal” (um ambiente compartilhado)

Convidar parceiro(a) por link/código/QR

Entrar/Sair do espaço (com confirmação)

Suporte a múltiplos espaços (opcional, ex.: “Você & Amanda”, “Viagens 2026”) ou apenas 1 espaço (MVP)

Perfis mínimos: nome, avatar/emoji, cor (opcional)

2) Categorias e navegação

Categorias por ícones (menu horizontal no topo)

Navegação por swipe entre categorias (slide lateral)

Categorias padrão: Filmes, Séries, Lugares, Comidas, Atividades, Vídeos curtos, Piadas internas, Datas especiais

Reordenar categorias (drag)

Criar/editar/excluir categoria (opcional no MVP)

Estados vazios (mensagens e ilustrações discretas)

3) Listas e itens (core)

Adicionar item (FAB contextual sempre adiciona na categoria atual)

Editar item

Excluir item

Marcar como feito (sem checkbox na lista, via ação no dropdown)

Seção “Feito” separada no fim (colapsável opcional)

Metadados discretos inline antes do título: Quem criou + data

Ordenação automática: pendentes acima, feitos embaixo

Busca dentro da categoria

Comentários por item (no dropdown/expansão)

4) Dropdown/expansão do item

Ao expandir um item (accordion):

Campo/área de comentário

Ações: Editar, Excluir, Marcar como feito / Desfazer

(Opcional) Tags do item (chips)

(Opcional) Link/URL (ex.: trailer, maps, vídeo curto)

5) Filtros e ordenação

Filtrar por:

Status: Pendentes / Feitos / Todos

Criado por: Você / Parceiro(a) / Ambos

Período: hoje / 7 dias / mês / personalizado

Ordenar por:

Mais recentes

Mais antigos

(Opcional) A-Z

(Opcional) Filtrar por tags

6) Datas especiais (categoria “rica”)

Itens com campos extras:

Data do evento

Nota/descrição

Upload de foto

Thumbnail na lista

Visualização expandida com foto em estilo polaroid (borda + “fitinha”)

(Opcional) múltiplas fotos por data especial

7) Alarmes e lembretes (toca pros 2)

Em qualquer item (ou só em Datas especiais/Atividades), adicionar:

Alarme/Notificação agendada

Horário e repetição (opcional)

Texto do lembrete (opcional)

Notificação dispara para os dois:

Para quem criou e para o parceiro(a)

Com opção de: “Marcar como feito”, “Adiar”, “Abrir item”

Confirmação de recebimento (opcional): status “visto por Amanda”

(Opcional) “alarme compartilhado” tipo: ambos precisam confirmar “ok”

8) Qualidade de vida

Desfazer após excluir (toast)

Haptics leves (check/feito, abrir dropdown)

Modo offline (usar sem internet e sincronizar depois)

Export/backup manual (PDF/JSON) opcional

Recursos necessários para uso a dois com atualizações síncronas
A) Sincronização em tempo real

Para ambos verem mudanças instantaneamente:

Banco com realtime (ex.: Firebase Firestore ou Supabase Realtime)

Subscriptions/Listeners por:

coupleSpace

categorias

itens da categoria atual

Atualização otimista (aparece na hora e confirma no servidor)

B) Identidade e permissão

Auth (Google/Apple/e-mail)

Controle de acesso por espaço

regras: só membros do casal podem ler/escrever

convite com token/código expira (opcional)

C) Conflitos de edição

Quando os dois editam ao mesmo tempo:

Estratégia simples: última edição vence

Campos de auditoria:

updatedAt, updatedBy

(Opcional) aviso: “alterado por Amanda há 2 min”

D) Offline + consistência

Cache local (SQLite/Realm ou cache do próprio Firestore)

Fila de ações offline (criar/editar/excluir/feito)

Resolução de conflitos quando voltar a internet

E) Imagens e mídia

Storage (Firebase Storage/Supabase Storage)

Geração de thumbnail (no upload)

Links assinados/seguros para acesso privado

F) Notificações para os dois (alarmes)

Para notificar ambos de forma confiável:

Push notifications (FCM no Android; APNs no iOS)

Guardar device tokens de cada usuário

Um scheduler no backend:

Cloud Functions/Edge Functions/cron

dispara push para os dois no horário

Tratamento de fuso horário (muito importante)

Permissões de notificação no app + fallback (alarme local)

G) Backup automático

Opções:

“Backup” natural = dados no servidor (realtime DB)

Backup extra (opcional):

export diário/semana para Drive (mais avançado)

export manual “Salvar cópia”