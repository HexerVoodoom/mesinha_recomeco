import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import webpush from "npm:web-push";
import * as kv from "./kv_store.tsx";
import { sendFcmToUser } from "./fcm.tsx";

const VAPID_PUBLIC_KEY = "BEeyyQPVJ900xV1F1Jo8Q2TNc2DK7jb9jyiqmQQX3QnUwzJYxy1j5BByQ0vJFDSbPTGacjS3oUtpOKCtxAF5WIY";
const VAPID_PRIVATE_KEY = "V9PFLTWJWHdqXPGmuJZHfJds-L0nmme4kti5dD_nF5o";

webpush.setVapidDetails("mailto:mateus.sprnd@gmail.com", VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

/**
 * Manda a notificação pelos dois canais (Web Push e FCM). Devolve `true` se
 * ALGUM canal aceitou a mensagem — quem chama pode então dizer à pessoa se a
 * notificação saiu de verdade em vez de fingir sucesso com o silêncio.
 */
async function sendPushToUser(user: string, payload: any): Promise<boolean> {
  let entregue = false;

  // 1) Web Push (Chrome / PWA instalado pelo navegador).
  const subscription = await kv.get(`push-subscription:${user}`);
  if (subscription) {
    try {
      await webpush.sendNotification(subscription, JSON.stringify(payload));
      console.log(`[Push] Sent to ${user}`);
      entregue = true;
    } catch (err: any) {
      console.error(`[Push] Failed to send to ${user}:`, err?.statusCode, err?.message);
      if (err?.statusCode === 410 || err?.statusCode === 404) {
        await kv.del(`push-subscription:${user}`);
      }
    }
  }

  // 2) FCM (app Android instalado). Ignorado se o secret não estiver configurado.
  try {
    const okFcm = await sendFcmToUser(
      user,
      String(payload?.title ?? "Mesinha"),
      String(payload?.body ?? ""),
    );
    entregue = entregue || okFcm;
  } catch (err) {
    console.error(`[FCM] Failed to send to ${user}:`, err);
  }

  return entregue;
}

// Rótulos do Calendário de Encontros (categoria "meetup"), usados nas
// notificações push. Mantidos em sincronia com MeetupCalendar.tsx no cliente.
const MEETUP_TYPE_LABELS: Record<string, string> = {
  coracao: "ficar juntos em casa 💕",
  videogame: "jogar video game 🎮 (cada um em casa)",
  pegadas: "sair 👣",
};
const MEETUP_PERIOD_LABELS: Record<string, string> = {
  manha: "de manhã",
  tarde: "à tarde",
  noite: "à noite",
};

function describeMeetup(item: any): string {
  const type = MEETUP_TYPE_LABELS[item?.meetupType] || "se ver";
  const period = MEETUP_PERIOD_LABELS[item?.meetupPeriod];
  return period ? `${type} ${period}` : type;
}

// ── Cápsula do Tempo (categoria "capsule") ───────────────────────────────────
//
// Carta/foto que só abre na data marcada (eventDate). O conteúdo é escondido
// AQUI no servidor — nunca chega ao cliente antes da hora, então não vaza via
// cache offline nem via DevTools. Depois da data, os GETs voltam a entregar
// o conteúdo normalmente.

function isCapsuleLocked(item: any): boolean {
  return (
    item?.category === "capsule" &&
    typeof item.eventDate === "string" &&
    item.eventDate > brazilNow().toISOString().slice(0, 10)
  );
}

function lockCapsule(item: any): any {
  return {
    ...item,
    comment: "",
    photo: null,
    muralContent: undefined,
    muralThumbnail: undefined,
    caption: undefined,
    capsuleLocked: true,
  };
}

function lockCapsules(items: any[]): any[] {
  return items.map((i) => (isCapsuleLocked(i) ? lockCapsule(i) : i));
}

const app = new Hono();

// Enable CORS for all routes and methods (must be first)
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length", "Content-Type"],
    maxAge: 600,
    credentials: true,
  }),
);

// Enable logger
app.use('*', logger(console.log));

// Explicit OPTIONS handler for CORS preflight
app.options("/*", (c) => {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "600",
    },
  });
});

// Global error handler
app.onError((err, c) => {
  console.error("Global error handler:", err);
  try {
    return c.json({ 
      error: "Internal server error", 
      message: err.message 
    }, 500);
  } catch (e) {
    // Fallback if JSON fails
    return new Response(JSON.stringify({ error: "Server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

// Health check endpoint
app.get("/make-server-19717bce/health", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Get items by category with pagination
app.get("/make-server-19717bce/items", async (c) => {
  try {
    const category = c.req.query("category");
    const offset = parseInt(c.req.query("offset") || "0");
    // Cap limit so a single request can't force-load an unbounded number of rows (with photos) into memory.
    const limit = Math.min(parseInt(c.req.query("limit") || "100"), 200);

    // A lista "leve" é montada dentro do Postgres (função get_items_light):
    // filtro, ordenação por createdAt e o descarte da mídia pesada (photo ->
    // marcador 'HAS_PHOTO'; muralContent só quando muralContentType === 'text';
    // imagem/vídeo/áudio carregam sob demanda via GET /items/:id/full).
    const { items, total } = await kv.getItemsLightPaged({
      offset,
      limit,
      categoryFilter: category || undefined,
    });

    return c.json({
      items: lockCapsules(items),
      total,
      hasMore: offset + limit < total
    });
  } catch (error) {
    console.error("[GET /items] Error:", error);
    return c.json({ error: "Failed to fetch items", details: error instanceof Error ? error.message : String(error) }, 500);
  }
});

// Get full details for a specific item (including muralContent)
app.get("/make-server-19717bce/items/:id/full", async (c) => {
  try {
    const itemId = c.req.param("id");
    const item = await kv.get(`item:${itemId}`);

    if (!item) {
      return c.json({ error: "Item not found" }, 404);
    }

    return c.json({ item: isCapsuleLocked(item) ? lockCapsule(item) : item });
  } catch (error) {
    console.error("Error fetching full item:", error);
    return c.json({
      error: "Failed to fetch item",
      details: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

// Get photo for a specific item
app.get("/make-server-19717bce/items/:id/photo", async (c) => {
  try {
    const itemId = c.req.param("id");
    const item = await kv.get(`item:${itemId}`);

    if (!item) {
      return c.json({ error: "Item not found" }, 404);
    }

    return c.json({ photo: isCapsuleLocked(item) ? null : (item.photo || null) });
  } catch (error) {
    console.error("Error fetching photo:", error);
    return c.json({
      error: "Failed to fetch photo",
      details: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

// Create a new item
app.post("/make-server-19717bce/items", async (c) => {
  try {
    const body = await c.req.json();
    const { title, comment, category, eventDate, photo, reminderEnabled, reminderFrequency, repeatCount, tags, createdBy } = body;
    
    console.log('[POST /items] Creating item with body:', {
      category,
      title,
      hasTop3Mateus: !!body.top3Mateus,
      hasTop3Amanda: !!body.top3Amanda,
      top3Mateus: body.top3Mateus,
      top3Amanda: body.top3Amanda,
    });
    
    if (!title || !category) {
      return c.json({ error: "Title and category are required" }, 400);
    }

    // Validate photo size (max 8MB base64)
    if (photo && photo.length > 10000000) {
      console.warn("Photo rejected: too large", photo.length);
      return c.json({ error: "Foto muito grande. Use uma imagem menor que 6MB." }, 400);
    }

    // Validate mural content size (max 8MB base64)
    if (body.muralContent && typeof body.muralContent === "string" && body.muralContent.length > 10000000) {
      console.warn("Mural content rejected: too large", body.muralContent.length);
      return c.json({ error: "Imagem do mural muito grande. Use uma foto menor que 6MB." }, 400);
    }

    // If the client sends an id that already exists (e.g. a retried/duplicated sync push),
    // upsert that same record instead of minting a new one - prevents duplicate items.
    const providedId = typeof body.id === "string" && body.id ? body.id : null;
    const existingItem = providedId ? await kv.get(`item:${providedId}`) : null;
    const itemId = existingItem ? providedId! : (providedId || crypto.randomUUID());
    const item = {
      id: itemId,
      title: String(title).substring(0, 500),
      comment: comment ? String(comment).substring(0, 2000) : "",
      category,
      eventDate: eventDate || null,
      photo: photo || null,
      reminderEnabled: reminderEnabled || false,
      reminderFrequency: reminderFrequency === null ? null : (reminderFrequency || undefined),
      repeatCount: repeatCount !== undefined ? Number(repeatCount) : undefined,
      createdBy: createdBy || "Unknown",
      createdAt: existingItem?.createdAt || new Date().toISOString(),
      status: existingItem?.status || "pending",
      tags: Array.isArray(tags) ? tags.slice(0, 20) : [],
      // Campo para vídeos curtos (categoria watch)
      videoLink: body.videoLink || undefined,
      // Campos específicos para lembretes (categoria alarm)
      reminderTime: body.reminderTime || undefined,
      reminderDays: Array.isArray(body.reminderDays) ? body.reminderDays : undefined,
      reminderForMateus: body.reminderForMateus !== undefined ? body.reminderForMateus : undefined,
      reminderForAmanda: body.reminderForAmanda !== undefined ? body.reminderForAmanda : undefined,
      reminderActive: body.reminderActive !== undefined ? body.reminderActive : true,
      // Campos específicos para Top 3
      top3Mateus: body.top3Mateus || undefined,
      top3Amanda: body.top3Amanda || undefined,
      // Campos específicos para Mural
      muralContentType: body.muralContentType || undefined,
      muralContent: body.muralContent || undefined,
      muralThumbnail: body.muralThumbnail || undefined,
      caption: body.caption ? String(body.caption).substring(0, 500) : undefined,
      viewedBy: Array.isArray(body.viewedBy) ? body.viewedBy : [],
      // Campos específicos do Calendário de Encontros (categoria meetup)
      meetupPeriod: body.meetupPeriod || undefined,
      meetupType: body.meetupType || undefined,
      // Check-in de humor (categoria mood)
      moodEmoji: body.moodEmoji || undefined,
      // Tarefas de casa (categoria chore)
      choreAssignee: body.choreAssignee || undefined,
      choreRotates: body.choreRotates !== undefined ? body.choreRotates : undefined,
      choreDoneCount: body.choreDoneCount !== undefined ? Number(body.choreDoneCount) : undefined,
      choreLastDoneBy: body.choreLastDoneBy || undefined,
      choreLastDoneAt: body.choreLastDoneAt || undefined,
    };

    await kv.set(`item:${itemId}`, item);
    console.log("Item created successfully:", itemId);

    // Send Web Push to the other user for new mural posts
    if (item.category === "mural" && item.createdBy) {
      const otherUser = item.createdBy === "Amanda" ? "Mateus" : "Amanda";
      const typeEmoji: Record<string, string> = { text: "📝", image: "🖼️", video: "🎥", audio: "🎵" };
      const emoji = typeEmoji[item.muralContentType || "text"] || "📝";
      sendPushToUser(otherUser, {
        title: "Novo no Mural! 💗",
        body: `${item.createdBy} adicionou: ${emoji} ${item.title || "Novo post"}`,
        tag: "mesinha-mural",
        url: "/",
      }).catch(console.error);
    }

    // Check-in de humor: avisa o parceiro só no PRIMEIRO check-in do dia (o id
    // é determinístico por pessoa+dia, então trocar o humor depois só atualiza
    // o mesmo item e não dispara push de novo).
    if (item.category === "mood" && !existingItem && item.createdBy) {
      const otherUser = item.createdBy === "Amanda" ? "Mateus" : "Amanda";
      const note = item.comment ? ` "${String(item.comment).slice(0, 60)}"` : "";
      sendPushToUser(otherUser, {
        title: `${item.createdBy} registrou o humor de hoje ${item.moodEmoji || "💭"}`,
        body: `${item.title}${note}`,
        tag: "mesinha-mood",
        url: "/",
      }).catch(console.error);
    }

    // Notifica o parceiro quando uma cápsula do tempo é lacrada (sem revelar o conteúdo!)
    if (item.category === "capsule" && item.createdBy && item.eventDate) {
      const otherUser = item.createdBy === "Amanda" ? "Mateus" : "Amanda";
      const [y, m, d] = String(item.eventDate).split("-");
      sendPushToUser(otherUser, {
        title: "Uma cápsula do tempo foi lacrada! 🕰️",
        body: `${item.createdBy} deixou algo pra você abrir em ${d}/${m}/${y}. Sem espiar!`,
        tag: "mesinha-capsule",
        url: "/",
      }).catch(console.error);
    }

    // Notifica o parceiro quando um dia é proposto no Calendário de Encontros
    if (item.category === "meetup" && item.createdBy && item.eventDate) {
      const otherUser = item.createdBy === "Amanda" ? "Mateus" : "Amanda";
      const commentSnippet = item.comment ? ` "${String(item.comment).slice(0, 80)}"` : "";
      sendPushToUser(otherUser, {
        title: `${item.createdBy} quer te ver! 💕`,
        body: `Marcou o dia ${item.eventDate} pra ${describeMeetup(item)}.${commentSnippet} Toca para confirmar!`,
        tag: "mesinha-meetup",
        url: "/",
      }).catch(console.error);
    }

    // Cápsula lacrada: guarda o conteúdo mas devolve a versão trancada — senão
    // o aparelho de quem escreveu fica com a carta em cache (e a mostra como
    // "aberta") e o conteúdo ainda vaza pro parceiro pelo broadcast de sync.
    return c.json({ item: isCapsuleLocked(item) ? lockCapsule(item) : item });
  } catch (error) {
    console.error("Error creating item:", error);
    return c.json({ 
      error: "Failed to create item", 
      details: error instanceof Error ? error.message : String(error) 
    }, 500);
  }
});

// Update an item
app.put("/make-server-19717bce/items/:id", async (c) => {
  try {
    const itemId = c.req.param("id");
    const body = await c.req.json();
    
    console.log('[PUT /items/:id] Updating item:', itemId, {
      hasTop3Mateus: !!body.top3Mateus,
      hasTop3Amanda: !!body.top3Amanda,
      top3Mateus: body.top3Mateus,
      top3Amanda: body.top3Amanda,
    });
    
    const existingItem = await kv.get(`item:${itemId}`);
    if (!existingItem) {
      return c.json({ error: "Item not found" }, 404);
    }

    // Validate photo size if being updated (max 2MB base64 to prevent connection issues)
    if (body.photo && body.photo.length > 3000000) {
      console.warn("Photo rejected: too large");
      return c.json({ error: "Photo too large. Maximum size is 2MB. Please compress the image." }, 400);
    }

    const updatedItem = {
      ...existingItem,
      ...body,
      id: itemId, // Ensure ID doesn't change
      repeatCount: body.repeatCount !== undefined ? Number(body.repeatCount) : existingItem.repeatCount,
      reminderFrequency: body.reminderFrequency === null ? null : (body.reminderFrequency !== undefined ? body.reminderFrequency : existingItem.reminderFrequency),
      updatedAt: new Date().toISOString(),
    };

    await kv.set(`item:${itemId}`, updatedItem);
    console.log("Item updated successfully:", itemId);

    // Notifica o dono do post quando a outra pessoa reage/curte.
    // Reação (emoji) tem prioridade: quem mandou reação nesta atualização não
    // recebe também o push genérico de like (o like acompanha a reação).
    const typeEmoji: Record<string, string> = { text: "📝", image: "🖼️", video: "🎥", audio: "🎵" };
    const postEmoji = typeEmoji[updatedItem.muralContentType || "text"] || "📝";
    const owner = updatedItem.createdBy;
    const reactionPushed = new Set<string>();

    if (body.reactions && typeof body.reactions === "object" && (owner === "Amanda" || owner === "Mateus")) {
      const oldReactions = (existingItem.reactions && typeof existingItem.reactions === "object") ? existingItem.reactions : {};
      for (const [user, emoji] of Object.entries(body.reactions)) {
        if (user === owner) continue; // ninguém reage ao próprio post
        if (typeof emoji !== "string" || !emoji) continue;
        if (oldReactions[user] === emoji) continue; // reação inalterada
        reactionPushed.add(user);
        sendPushToUser(owner, {
          title: `${user} reagiu ${emoji} ao seu post`,
          body: `${postEmoji} ${updatedItem.title || "Seu post no Mural"}`,
          tag: "mesinha-like",
          url: "/",
        }).catch(console.error);
      }
    }

    if (Array.isArray(body.likedBy) && (owner === "Amanda" || owner === "Mateus")) {
      const oldLikers: string[] = Array.isArray(existingItem.likedBy) ? existingItem.likedBy : [];
      const addedLikers = body.likedBy.filter((u: string) => u && !oldLikers.includes(u));
      for (const liker of addedLikers) {
        if (liker === owner) continue; // ninguém curte o próprio post
        if (reactionPushed.has(liker)) continue; // já avisou pela reação
        sendPushToUser(owner, {
          title: `${liker} curtiu seu post ❤️`,
          body: `${postEmoji} ${updatedItem.title || "Seu post no Mural"}`,
          tag: "mesinha-like",
          url: "/",
        }).catch(console.error);
      }
    }

    // Tarefa de casa concluída com rodízio: avisa quem herdou a vez. O push só
    // sai quando o dono realmente muda, então marcar/desmarcar sem rodízio (ou
    // editar outros campos da tarefa) não notifica ninguém.
    if (
      updatedItem.category === "chore" &&
      body.choreAssignee &&
      body.choreAssignee !== existingItem.choreAssignee &&
      (body.choreAssignee === "Amanda" || body.choreAssignee === "Mateus")
    ) {
      const doneBy = updatedItem.choreLastDoneBy || "Alguém";
      sendPushToUser(body.choreAssignee, {
        title: `Sua vez: ${updatedItem.title} 🧹`,
        body: `${doneBy} fez a última. Agora o rodízio passou pra você!`,
        tag: `mesinha-chore-${updatedItem.id}`,
        url: "/",
      }).catch(console.error);
    }

    // Notifica quem propôs o dia quando o parceiro confirma o encontro.
    if (
      updatedItem.category === "meetup" &&
      existingItem.status !== "done" &&
      updatedItem.status === "done" &&
      updatedItem.createdBy
    ) {
      sendPushToUser(updatedItem.createdBy, {
        title: "Encontro confirmado! 💕",
        body: `Vocês vão ${describeMeetup(updatedItem)} no dia ${updatedItem.eventDate}!`,
        tag: "mesinha-meetup",
        url: "/",
      }).catch(console.error);
    }

    // Cápsula ainda lacrada: guarda o conteúdo mas devolve a versão trancada.
    return c.json({ item: isCapsuleLocked(updatedItem) ? lockCapsule(updatedItem) : updatedItem });
  } catch (error) {
    console.error("Error updating item:", error);
    return c.json({ 
      error: "Failed to update item", 
      details: error instanceof Error ? error.message : String(error) 
    }, 500);
  }
});

// Delete an item
app.delete("/make-server-19717bce/items/:id", async (c) => {
  try {
    const itemId = c.req.param("id");
    await kv.del(`item:${itemId}`);
    return c.json({ success: true });
  } catch (error) {
    console.log("Error deleting item:", error);
    return c.json({ error: "Failed to delete item", details: String(error) }, 500);
  }
});

// Get couple settings
app.get("/make-server-19717bce/settings", async (c) => {
  try {
    const settings = await kv.get("settings") || {
      coupleName: "You & Partner",
      themeColor: "#81D8D0",
      notificationsEnabled: true,
    };
    return c.json({ settings });
  } catch (error) {
    console.log("Error fetching settings:", error);
    return c.json({ error: "Failed to fetch settings", details: String(error) }, 500);
  }
});

// Update couple settings
app.put("/make-server-19717bce/settings", async (c) => {
  try {
    const body = await c.req.json();
    await kv.set("settings", body);
    return c.json({ settings: body });
  } catch (error) {
    console.log("Error updating settings:", error);
    return c.json({ error: "Failed to update settings", details: String(error) }, 500);
  }
});

// Registra o token FCM do aparelho sob um perfil (Amanda/Mateus).
app.post("/make-server-19717bce/fcm-token", async (c) => {
  try {
    const body = await c.req.json();
    const profile = body?.profile;
    const token = body?.token;
    if (profile !== "Amanda" && profile !== "Mateus") {
      return c.json({ error: "Perfil invalido" }, 400);
    }
    if (!token || typeof token !== "string") {
      return c.json({ error: "Token invalido" }, 400);
    }
    await kv.set(`fcm-token:${profile}`, token);
    return c.json({ success: true });
  } catch (error) {
    console.log("Error saving fcm token:", error);
    return c.json({ error: "Falha ao registrar token", details: String(error) }, 500);
  }
});

// ===== Falas dos widgets (editáveis pelo app, lidas pelo widget nativo) =====
const WIDGET_PHRASES_KEY = "widget-phrases";
const MAX_PHRASE_LEN = 60;
const MAX_PHRASES = 60;

const DEFAULT_WIDGET_PHRASES: { dupla: any[]; amanda: string[]; mateus: string[] } = {
  dupla: [
    { corvinho: "Viram algum post novo no Mural hoje?", alpaquinha: "Vi sim! Que memória mais fofa..." },
    { corvinho: "Qual é o plano de hoje?", alpaquinha: "Jantar naquele lugar que a gente salvou!" },
    { corvinho: "Tem filme novo na lista pra maratonar?", alpaquinha: "Tem! Coloca na fila e aguarda!" },
    { corvinho: "Não esquece o lembrete das 21h!", alpaquinha: "Já ativei! Obrigada, corvinho." },
    { corvinho: "Que data especial está chegando?", alpaquinha: "Olha lá nas Datas e se prepara!" },
    { corvinho: "Bobeira do dia: qual foi a melhor?", alpaquinha: "Aquela do elevador ainda me faz rir!" },
    { corvinho: "Top 3 filmes de romance, vai lá!", alpaquinha: "La La Land, já garantido no primeiro!" },
    { corvinho: "Tem lugar novo pra visitar na lista?", alpaquinha: "Uma cachoeira novinha apareceu!" },
    { corvinho: "Comida nova pra explorar esse mês?", alpaquinha: "Aquela pizza na lista me chama demais!" },
    { corvinho: "Alguém curtiu o post do mural hoje?", alpaquinha: "Só corações e amor por aqui!" },
    { corvinho: "Já planejaram o fim de semana?", alpaquinha: "Praia, piquenique ou sofá? Difícil!" },
    { corvinho: "Série nova na lista pra ver juntos?", alpaquinha: "Adiciona lá e a gente decide!" },
    { corvinho: "Lembrete: dizer 'te amo' hoje!", alpaquinha: "Isso não precisa de lembrete!" },
    { corvinho: "Viram algum vídeo curtinho hoje?", alpaquinha: "Mandei um nos Vídeos Curtos!" },
    { corvinho: "Top 3 de sabores de sorvete, rápido!", alpaquinha: "Chocolate, morango e creme! Fácil." },
    { corvinho: "Tem jogo novo pra jogar junto?", alpaquinha: "Vamos jogar Ragnarok? Eu te curo!" },
    { corvinho: "Mural cheio de memórias boas?", alpaquinha: "Cada post é uma históriazinha!" },
    { corvinho: "Aquele restaurante novo está na lista?", alpaquinha: "Já adicionei em Comidas!" },
    { corvinho: "O aniversário de vocês está marcado?", alpaquinha: "Claro! Com lembrete e tudo!" },
    { corvinho: "Qual o plano pra próxima viagem?", alpaquinha: "Tem bastante coisa em Lugares!" },
    { corvinho: "Tem vídeo novo pra rir juntos?", alpaquinha: "Adicionei três hoje! Vai rir muito." },
    { corvinho: "Já escreveram alguma bobeira hoje?", alpaquinha: "Ainda não, mas tem história pra contar!" },
    { corvinho: "Lembrou de marcar a data importante?", alpaquinha: "Sim! Com notificação e tudo!" },
    { corvinho: "Alguém ganhou o Top 3 de hoje?", alpaquinha: "Empate! Os dois têm bom gosto." },
    { corvinho: "Que lugar faz tempo que querem ir?", alpaquinha: "Machu Picchu está na lista há séculos!" },
    { corvinho: "Stardew Valley ou Unravel Two hoje?", alpaquinha: "Precisa de uma votação rápida!" },
    { corvinho: "Quantos itens pendentes na lista?", alpaquinha: "Bastante! Mas faz parte do charme!" },
    { corvinho: "Já mandaram um post fofo no Mural?", alpaquinha: "Ainda não! Vai lá e surpreende!" },
    { corvinho: "Culinária nova na lista de comidas?", alpaquinha: "Japonesa está esperando uma chance!" },
    { corvinho: "Próximo jogo de tabuleiro: qual?", alpaquinha: "Tem ideia salva em Jogos! Olha lá." },
    { corvinho: "O mural está com saudade de vocês!", alpaquinha: "Bora adicionar uma memória nova!" },
    { corvinho: "Já conferiram os lembretes de hoje?", alpaquinha: "Sim! Tudo certo e no horário." }
  ],
  amanda: [
    "Bom dia, meu amor! Já pensei em você hoje 💕",
    "Mateus, não esquece que te amo, viu?",
    "Add aquele filme na lista que quero ver com você!",
    "Saudade de você... vem logo pra Mesinha!",
    "Você é meu lugar favorito, sabia?",
    "Topa um date hoje? Eu escolho o lugar!",
    "Lembra de beber água, meu cuidadoso preferido!",
    "Te amo mais que ontem e menos que amanhã.",
    "Guardei uma bobeira nossa pra te contar!",
    "Você faz meus dias bem melhores, Mateus.",
    "Qual nosso próximo lugar pra visitar juntos?",
    "Coloquei a gente no Top 3 de hoje 😄",
    "Obrigada por ser tão você comigo.",
    "Vamos maratonar algo hoje à noite?",
    "Pensa numa pessoa apaixonada... sou eu por você.",
    "Te mandei um beijo pelo mural, achou?",
    "Você é o melhor parceiro de mesinha do mundo.",
    "Bora marcar mais uma memória nossa hoje?",
    "Meu coração tem seu nome, Mateus 💌",
    "Comida nova ou nosso clássico? Você decide!",
    "Conta comigo sempre, viu, amor?",
    "Cada dia com você é meu favorito.",
    "Já tô pensando no nosso próximo abraço.",
    "Você merece o mundo, e eu vou te dar.",
    "Vem fazer nada comigo, que é tudo com você.",
    "Anota aí: encontro marcado, eu e você.",
    "Te escolho de novo, todo santo dia.",
    "Seu sorriso é meu app favorito 😊",
    "Faz um carinho virtual em mim? Te amo!",
    "Tamo juntos nessa mesinha, pra sempre."
  ],
  mateus: [
    "Bom dia, Amanda! Você é minha alegria 💙",
    "Amanda, tô aqui torcendo por você sempre.",
    "Separei um lugar lindo pra gente visitar!",
    "Você deixa tudo mais leve, sabia?",
    "Te amo do jeitinho que você é.",
    "Bora um date? Hoje eu cuido de tudo.",
    "Lembra que você é incrível, viu?",
    "Mal posso esperar pra te ver de novo.",
    "Add um jogo pra gente jogar juntos!",
    "Você é meu sorriso favorito, Amanda.",
    "Guardei uma memória nossa no mural 💌",
    "Conta comigo pra qualquer bobeira.",
    "Meu dia melhora quando penso em você.",
    "Qual filme a gente vê hoje, princesa?",
    "Você é o meu lugar de paz.",
    "Te escolhi e escolho todo dia.",
    "Saudade já... volta logo pra Mesinha!",
    "Obrigado por existir do meu lado.",
    "Você é o melhor que me aconteceu.",
    "Coloquei a gente no Top 3 de sempre.",
    "Vem cá receber um abraço apertado.",
    "Seu nome é meu lembrete favorito 💙",
    "Topa criar mais uma memória hoje?",
    "Você merece todo o carinho do mundo.",
    "Tô planejando uma surpresa... aguarda!",
    "Com você até o nada vira aventura.",
    "Te amo mais a cada mesinha nossa.",
    "Você é forte, linda e minha inspiração.",
    "Manda um oi que meu dia já ganha cor.",
    "Pra sempre eu e você, combinado?"
  ],
};

function mergedWidgetPhrases(stored: any) {
  return {
    dupla: Array.isArray(stored?.dupla) && stored.dupla.length ? stored.dupla : DEFAULT_WIDGET_PHRASES.dupla,
    amanda: Array.isArray(stored?.amanda) && stored.amanda.length ? stored.amanda : DEFAULT_WIDGET_PHRASES.amanda,
    mateus: Array.isArray(stored?.mateus) && stored.mateus.length ? stored.mateus : DEFAULT_WIDGET_PHRASES.mateus,
  };
}

// Lida pelo widget nativo (sem edição). Sempre retorna listas completas.
app.get("/make-server-19717bce/widget-phrases", async (c) => {
  try {
    const stored = await kv.get(WIDGET_PHRASES_KEY);
    return c.json(mergedWidgetPhrases(stored));
  } catch (error) {
    console.log("Error fetching widget phrases:", error);
    return c.json(DEFAULT_WIDGET_PHRASES);
  }
});

// Atualiza a lista de um personagem. Mateus edita "mateus" (Corvinho); Amanda edita "amanda" (Alpaquinha).
app.put("/make-server-19717bce/widget-phrases/:list", async (c) => {
  try {
    const list = c.req.param("list");
    if (list !== "amanda" && list !== "mateus") {
      return c.json({ error: "Lista invalida" }, 400);
    }
    const body = await c.req.json();
    const profile = body?.profile;
    const allowed =
      (list === "amanda" && profile === "Amanda") ||
      (list === "mateus" && profile === "Mateus");
    if (!allowed) {
      return c.json({ error: "Sem permissao para editar esta lista" }, 403);
    }
    if (!Array.isArray(body?.phrases)) {
      return c.json({ error: "phrases deve ser uma lista" }, 400);
    }
    const phrases = body.phrases
      .map((p: any) => String(p ?? "").trim())
      .filter((p: string) => p.length > 0)
      .slice(0, MAX_PHRASES)
      .map((p: string) => p.substring(0, MAX_PHRASE_LEN));
    if (phrases.length === 0) {
      return c.json({ error: "Adicione pelo menos uma frase" }, 400);
    }
    const stored = (await kv.get(WIDGET_PHRASES_KEY)) || {};
    const merged: any = mergedWidgetPhrases(stored);
    merged[list] = phrases;
    await kv.set(WIDGET_PHRASES_KEY, merged);
    return c.json({ success: true, list, count: phrases.length });
  } catch (error) {
    console.log("Error updating widget phrases:", error);
    return c.json({ error: "Falha ao salvar frases", details: String(error) }, 500);
  }
});

// Backup stats - Just return statistics without data
app.get("/make-server-19717bce/backup/stats", async (c) => {
  try {
    console.log('[GET /backup/stats] Getting backup statistics...');

    // Count only - never loads item values (including photos) into memory.
    const totalItems = await kv.countByPrefix("item:");
    console.log(`[GET /backup/stats] Found ${totalItems} items`);

    const stats = {
      totalItems,
      lastChecked: new Date().toISOString(),
    };

    console.log('[GET /backup/stats] Stats retrieved successfully');
    return c.json({ stats });
  } catch (error) {
    console.error("[GET /backup/stats] Stats error:", error);
    return c.json({
      error: "Failed to get stats",
      details: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

// Backup - Export all data
app.get("/make-server-19717bce/backup", async (c) => {
  try {
    console.log('[GET /backup] Starting backup export...');

    // Fetch all items with photos, in bounded batches so peak memory per query stays small
    // even as the dataset grows (a single getByPrefix("item:") call was OOM-ing the function).
    const BATCH_SIZE = 200;
    const total = await kv.countByPrefix("item:");
    const items: any[] = [];
    for (let offset = 0; offset < total; offset += BATCH_SIZE) {
      const { items: batch } = await kv.getByPrefixPaged("item:", {
        offset,
        limit: BATCH_SIZE,
        orderByJsonField: "createdAt",
        ascending: false,
      });
      // Cápsulas ainda lacradas saem do backup sem o conteúdo, igual a todos
      // os outros caminhos de leitura: o export é baixado pelo cliente, então
      // deixar a carta passar aqui furaria o lacre (é o único jeito de a
      // promessa "nem via DevTools" ser verdade). O conteúdo continua intacto
      // no banco e volta pro export assim que a cápsula abre.
      items.push(...lockCapsules(batch));
    }
    console.log(`[GET /backup] Found ${items.length} items`);

    // Fetch settings
    const settings = await kv.get("settings") || {
      coupleName: "You & Partner",
      themeColor: "#81D8D0",
      notificationsEnabled: true,
    };

    // Create backup object
    const backup = {
      version: "1.0.0",
      exportDate: new Date().toISOString(),
      data: {
        settings,
        items: items || [],
      },
      stats: {
        totalItems: items.length,
      }
    };

    console.log('[GET /backup] Backup created successfully');
    return c.json(backup);
  } catch (error) {
    console.error("[GET /backup] Backup error:", error);
    return c.json({
      error: "Failed to create backup",
      details: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

// Save push subscription for a user
app.post("/make-server-19717bce/push-subscription", async (c) => {
  try {
    const { profile, subscription } = await c.req.json();
    if (!profile || !subscription) return c.json({ error: "Missing profile or subscription" }, 400);
    if (profile !== "Amanda" && profile !== "Mateus") return c.json({ error: "Invalid profile" }, 400);
    await kv.set(`push-subscription:${profile}`, subscription);
    console.log(`[Push] Subscription saved for ${profile}`);
    return c.json({ success: true });
  } catch (error) {
    console.error("[POST /push-subscription] Error:", error);
    return c.json({ error: "Failed to save subscription" }, 500);
  }
});

// Remove push subscription for a user
app.delete("/make-server-19717bce/push-subscription", async (c) => {
  try {
    const { profile } = await c.req.json();
    if (!profile) return c.json({ error: "Missing profile" }, 400);
    await kv.del(`push-subscription:${profile}`);
    return c.json({ success: true });
  } catch (error) {
    console.error("[DELETE /push-subscription] Error:", error);
    return c.json({ error: "Failed to remove subscription" }, 500);
  }
});

// ── Pergunta do Dia (categoria "question") ───────────────────────────────────
//
// Uma pergunta por dia, igual para os dois (item com id determinístico
// `question-<data>`). Cada um responde sem ver a resposta do outro — o
// servidor só revela quando os DOIS responderam. O banco de perguntas é
// alimentado por vocês (KV `question-bank`); quando acaba, cai nas padrão.

const QUESTION_BANK_KEY = "question-bank";
const MAX_QUESTION_LEN = 200;

const DEFAULT_QUESTIONS: string[] = [
  "Qual foi a melhor coisa que aconteceu com você essa semana?",
  "O que eu faço que mais te deixa feliz?",
  "Se a gente pudesse viajar pra qualquer lugar amanhã, pra onde?",
  "Qual foi a primeira coisa que você pensou de mim?",
  "O que você quer que a gente faça mais vezes?",
  "Qual música te lembra da gente?",
  "O que te deu orgulho de você mesmo esse mês?",
  "Qual a bobeira nossa que você mais lembra?",
  "O que você quer estar fazendo daqui 5 anos?",
  "Qual foi o dia mais feliz da sua vida até agora?",
  "O que eu poderia fazer pra facilitar sua semana?",
  "Que comida você comeria pra sempre sem enjoar?",
  "Qual medo seu você gostaria de perder?",
  "O que você mais admira em mim?",
  "Se a gente ganhasse na loteria hoje, qual a primeira coisa?",
  "Qual filme você quer rever comigo?",
  "O que te faz sentir mais amado?",
  "Qual foi a coisa mais engraçada que você viu essa semana?",
  "Que hábito nosso você quer manter pra sempre?",
  "Qual lugar da nossa cidade é o nosso lugar?",
  "O que você gostaria de aprender comigo?",
  "Qual foi a maior surpresa boa que te dei?",
  "Que tradição você quer criar com a gente?",
  "O que você faria num dia livre perfeito?",
  "Qual foto nossa é a sua favorita?",
  "O que você quer me contar mas não achou hora?",
  "Que presente você lembra com carinho?",
  "Qual sua parte favorita do nosso dia a dia?",
  "O que te deixa mais tranquilo quando o dia foi ruim?",
  "Se você pudesse reviver um dia nosso, qual seria?",
];

// Escolha estável por data: a mesma pergunta para os dois, sem sortear duas
// vezes coisas diferentes. Prioriza as perguntas escritas por vocês que ainda
// não foram usadas; quando todas foram, cai nas padrão ainda não usadas; e se
// tudo já rodou, recomeça (sem repetir a de ontem quando dá pra evitar).
function pickQuestionForDay(bank: string[], usedQuestions: string[], dateStr: string): string {
  const used = new Set(usedQuestions);
  const freshCustom = bank.filter((q) => !used.has(q));
  const freshDefault = DEFAULT_QUESTIONS.filter((q) => !used.has(q));
  // Quando tudo já rodou, recomeça — mas tirando a de ontem do sorteio: sem
  // isso, uma virada de mês (o seed pula de 20260831 pra 20260901) pode cair
  // no mesmo índice e repetir a pergunta dois dias seguidos.
  const yesterday = usedQuestions[usedQuestions.length - 1];
  const all = bank.length ? bank : DEFAULT_QUESTIONS;
  const recycled = all.length > 1 ? all.filter((q) => q !== yesterday) : all;
  const pool = freshCustom.length ? freshCustom
    : freshDefault.length ? freshDefault
    : recycled;
  // Índice derivado da data => determinístico (Math.random daria respostas
  // diferentes se dois requests chegassem juntos).
  const seed = dateStr.split("-").join("");
  return pool[Number(seed) % pool.length];
}

// Esconde a resposta do outro enquanto os dois não responderam.
function shapeQuestion(item: any, profile: string | null) {
  const answerAmanda = item?.answerAmanda ?? null;
  const answerMateus = item?.answerMateus ?? null;
  const revealed = !!answerAmanda && !!answerMateus;
  return {
    id: item.id,
    question: item.title,
    date: item.eventDate,
    revealed,
    answerAmanda: revealed || profile === "Amanda" ? answerAmanda : (answerAmanda ? "__HIDDEN__" : null),
    answerMateus: revealed || profile === "Mateus" ? answerMateus : (answerMateus ? "__HIDDEN__" : null),
  };
}

// Pergunta de hoje — cria na primeira chamada do dia (mesma para os dois).
app.get("/make-server-19717bce/question-of-the-day", async (c) => {
  try {
    const profile = c.req.query("profile") || null;
    const todayStr = brazilNow().toISOString().slice(0, 10);
    const itemId = `question-${todayStr}`;
    let item = await kv.get(`item:${itemId}`);

    if (!item) {
      const bank: string[] = (await kv.get(QUESTION_BANK_KEY)) || [];
      const usedQuestions: string[] = (await kv.get("question-used")) || [];
      const question = pickQuestionForDay(bank, usedQuestions, todayStr);
      item = {
        id: itemId,
        title: question,
        comment: "",
        category: "question",
        eventDate: todayStr,
        photo: null,
        reminderEnabled: false,
        createdBy: "Mesinha",
        createdAt: new Date().toISOString(),
        status: "pending",
        tags: [],
        answerAmanda: null,
        answerMateus: null,
      };
      await kv.set(`item:${itemId}`, item);
      // Guarda as últimas 60 usadas para não repetir tão cedo.
      await kv.set("question-used", [...usedQuestions, question].slice(-60));
    }

    return c.json(shapeQuestion(item, profile));
  } catch (error) {
    console.error("[GET /question-of-the-day] Error:", error);
    return c.json({ error: "Failed to fetch question", details: String(error) }, 500);
  }
});

// Responde a pergunta de hoje. Quando o segundo responde, avisa os dois que
// as respostas foram reveladas.
app.post("/make-server-19717bce/question-of-the-day/answer", async (c) => {
  try {
    const { profile, answer } = await c.req.json();
    if (profile !== "Amanda" && profile !== "Mateus") {
      return c.json({ error: "Invalid profile" }, 400);
    }
    if (typeof answer !== "string" || !answer.trim()) {
      return c.json({ error: "Escreve uma resposta primeiro!" }, 400);
    }

    const todayStr = brazilNow().toISOString().slice(0, 10);
    const itemId = `question-${todayStr}`;
    const item = await kv.get(`item:${itemId}`);
    if (!item) {
      return c.json({ error: "A pergunta de hoje ainda não foi criada" }, 404);
    }

    const field = profile === "Amanda" ? "answerAmanda" : "answerMateus";
    const wasRevealed = !!item.answerAmanda && !!item.answerMateus;
    const updated = {
      ...item,
      [field]: answer.trim().substring(0, 1000),
      updatedAt: new Date().toISOString(),
    };
    const nowRevealed = !!updated.answerAmanda && !!updated.answerMateus;
    if (nowRevealed) updated.status = "done";
    await kv.set(`item:${itemId}`, updated);

    const other = profile === "Amanda" ? "Mateus" : "Amanda";
    if (nowRevealed && !wasRevealed) {
      // Os dois responderam: libera a revelação para ambos.
      const payload = {
        title: "Respostas reveladas! 💬",
        body: `Os dois responderam "${item.title}". Corre ver!`,
        tag: "mesinha-question",
        url: "/",
      };
      // A resposta JÁ foi gravada: uma falha no push não pode virar 500 (o
      // cliente mostraria erro e a revelação nunca apareceria, já que numa
      // nova tentativa `wasRevealed` seria true e o push não sairia de novo).
      await Promise.all([
        sendPushToUser("Amanda", payload),
        sendPushToUser("Mateus", payload),
      ]).catch(console.error);
    } else if (!nowRevealed) {
      // Primeiro a responder: chama o outro (sem entregar a resposta).
      sendPushToUser(other, {
        title: `${profile} já respondeu a pergunta de hoje 💭`,
        body: `"${item.title}" — responde pra liberar as duas respostas!`,
        tag: "mesinha-question",
        url: "/",
      }).catch(console.error);
    }

    return c.json(shapeQuestion(updated, profile));
  } catch (error) {
    console.error("[POST /question-of-the-day/answer] Error:", error);
    return c.json({ error: "Failed to answer", details: String(error) }, 500);
  }
});

// Banco de perguntas escritas por vocês (o que nenhum app comercial consegue).
app.get("/make-server-19717bce/question-bank", async (c) => {
  try {
    const bank: string[] = (await kv.get(QUESTION_BANK_KEY)) || [];
    const used: string[] = (await kv.get("question-used")) || [];
    const usedSet = new Set(used);
    return c.json({
      questions: bank,
      pending: bank.filter((q) => !usedSet.has(q)).length,
      defaultsCount: DEFAULT_QUESTIONS.length,
    });
  } catch (error) {
    console.error("[GET /question-bank] Error:", error);
    return c.json({ error: "Failed to fetch bank", details: String(error) }, 500);
  }
});

app.post("/make-server-19717bce/question-bank", async (c) => {
  try {
    const { profile, question } = await c.req.json();
    if (profile !== "Amanda" && profile !== "Mateus") {
      return c.json({ error: "Invalid profile" }, 400);
    }
    if (typeof question !== "string" || !question.trim()) {
      return c.json({ error: "Escreve a pergunta primeiro!" }, 400);
    }
    const text = question.trim().substring(0, MAX_QUESTION_LEN);
    const bank: string[] = (await kv.get(QUESTION_BANK_KEY)) || [];
    if (bank.includes(text)) {
      return c.json({ error: "Essa pergunta já está no banco" }, 409);
    }
    const updated = [...bank, text].slice(-300);
    await kv.set(QUESTION_BANK_KEY, updated);

    const other = profile === "Amanda" ? "Mateus" : "Amanda";
    sendPushToUser(other, {
      title: `${profile} escreveu uma pergunta nova 💭`,
      body: "Ela vai aparecer numa Pergunta do Dia em breve!",
      tag: "mesinha-question-bank",
      url: "/",
    }).catch(console.error);

    return c.json({ success: true, count: updated.length });
  } catch (error) {
    console.error("[POST /question-bank] Error:", error);
    return c.json({ error: "Failed to add question", details: String(error) }, 500);
  }
});

app.delete("/make-server-19717bce/question-bank", async (c) => {
  try {
    const { question } = await c.req.json();
    const bank: string[] = (await kv.get(QUESTION_BANK_KEY)) || [];
    await kv.set(QUESTION_BANK_KEY, bank.filter((q) => q !== question));
    return c.json({ success: true });
  } catch (error) {
    console.error("[DELETE /question-bank] Error:", error);
    return c.json({ error: "Failed to remove question", details: String(error) }, 500);
  }
});

// ── Jogos: baralho de cartas escrito por vocês ───────────────────────────────
//
// Verdade / Desafio / "O que você prefere". O Couple Tree usa esses jogos como
// isca, mas com conteúdo genérico que fica repetitivo — aqui as cartas são
// escritas pelos dois e as padrão são só o ponto de partida.

type CardType = "verdade" | "desafio" | "prefere";
const CARD_DECK_KEY = "card-deck";
const MAX_CARD_LEN = 240;

const DEFAULT_CARDS: Record<CardType, string[]> = {
  verdade: [
    "Qual foi a primeira coisa que você reparou em mim?",
    "Qual mentirinha boba você já me contou?",
    "Qual foi o momento que você percebeu que gostava de mim?",
    "O que você faz escondido que eu não sei?",
    "Qual foi a coisa mais boba pela qual você ficou com ciúmes?",
    "Que música você canta pensando na gente?",
    "Qual foi o encontro nosso mais estranho?",
    "O que você mais tem vontade de fazer comigo e não falou ainda?",
  ],
  desafio: [
    "Manda um áudio cantando a nossa música.",
    "Faz a melhor imitação minha.",
    "Manda uma foto do que você tá vendo agora.",
    "Escreve uma declaração de 3 palavras no Mural.",
    "Conta uma bobeira nossa como se fosse notícia de jornal.",
    "Desenha a gente dois em 30 segundos e manda.",
    "Manda um áudio dizendo 3 coisas que você ama em mim.",
    "Faz um elogio que você nunca me fez antes.",
  ],
  prefere: [
    "Praia ou montanha, pra sempre?",
    "Jantar fora chique ou pizza no sofá?",
    "Viajar muito e trabalhar muito, ou viver devagar e simples?",
    "Morar na cidade grande ou no interior?",
    "Maratona de série ou noite de jogo?",
    "Acordar cedo juntos ou dormir até tarde juntos?",
    "Um mês de férias sozinho ou uma semana comigo?",
    "Cachorro ou gato pra chamar de nosso?",
  ],
};

function normalizeDeck(stored: any): Record<CardType, string[]> {
  return {
    verdade: Array.isArray(stored?.verdade) ? stored.verdade : [],
    desafio: Array.isArray(stored?.desafio) ? stored.desafio : [],
    prefere: Array.isArray(stored?.prefere) ? stored.prefere : [],
  };
}

// Devolve as cartas de vocês E as padrão, marcadas — o cliente sorteia.
app.get("/make-server-19717bce/cards", async (c) => {
  try {
    const deck = normalizeDeck(await kv.get(CARD_DECK_KEY));
    return c.json({ custom: deck, defaults: DEFAULT_CARDS });
  } catch (error) {
    console.error("[GET /cards] Error:", error);
    return c.json({ error: "Failed to fetch cards", details: String(error) }, 500);
  }
});

app.post("/make-server-19717bce/cards", async (c) => {
  try {
    const { profile, type, text } = await c.req.json();
    if (profile !== "Amanda" && profile !== "Mateus") {
      return c.json({ error: "Invalid profile" }, 400);
    }
    if (type !== "verdade" && type !== "desafio" && type !== "prefere") {
      return c.json({ error: "Tipo de carta inválido" }, 400);
    }
    if (typeof text !== "string" || !text.trim()) {
      return c.json({ error: "Escreve a carta primeiro!" }, 400);
    }

    const card = text.trim().substring(0, MAX_CARD_LEN);
    const deck = normalizeDeck(await kv.get(CARD_DECK_KEY));
    if (deck[type as CardType].includes(card)) {
      return c.json({ error: "Essa carta já está no baralho" }, 409);
    }
    deck[type as CardType] = [...deck[type as CardType], card].slice(-200);
    await kv.set(CARD_DECK_KEY, deck);

    const other = profile === "Amanda" ? "Mateus" : "Amanda";
    sendPushToUser(other, {
      title: `${profile} escreveu uma carta nova 🃏`,
      body: "Tem carta nova esperando no baralho de vocês!",
      tag: "mesinha-cards",
      url: "/",
    }).catch(console.error);

    return c.json({ success: true, count: deck[type as CardType].length });
  } catch (error) {
    console.error("[POST /cards] Error:", error);
    return c.json({ error: "Failed to add card", details: String(error) }, 500);
  }
});

app.delete("/make-server-19717bce/cards", async (c) => {
  try {
    const { type, text } = await c.req.json();
    if (type !== "verdade" && type !== "desafio" && type !== "prefere") {
      return c.json({ error: "Tipo de carta inválido" }, 400);
    }
    const deck = normalizeDeck(await kv.get(CARD_DECK_KEY));
    deck[type as CardType] = deck[type as CardType].filter((card) => card !== text);
    await kv.set(CARD_DECK_KEY, deck);
    return c.json({ success: true });
  } catch (error) {
    console.error("[DELETE /cards] Error:", error);
    return c.json({ error: "Failed to remove card", details: String(error) }, 500);
  }
});

// ── Jardim: sequência (streak), progresso e retrospectiva ────────────────────
//
// Tudo derivado dos itens que já existem (nenhuma escrita nova): a "floresta"
// do Couple Tree traduzida pro Mesinha. O digest usa uma projeção de três
// campos por linha (categoria/autor/data), então o custo de Disk IO é baixo, e
// o resultado é cacheado em KV por dia.
//
// A sequência tem CONGELAMENTO de 1 dia por design: a pesquisa sobre streaks é
// explícita que a ausência de proteção é o que produz pico de uso seguido de
// abandono na primeira falha. Aqui, pular um dia não zera nada.

const STREAK_FREEZE_DAYS = 1;

/** Janela de varredura do jardim (cobre a retrospectiva do ano + a sequência). */
const GARDEN_WINDOW_DAYS = 430;

/** Piso entre dois cálculos do jardim, mesmo com itens novos. */
const GARDEN_MIN_RECOMPUTE_MS = 30 * 60 * 1000;

// Dia (calendário de Brasília) de um createdAt em UTC. Fatiar o ISO direto
// jogaria tudo que foi feito depois das 21h pro dia seguinte — a sequência e a
// retrospectiva ficariam um dia adiantadas em relação ao `todayStr` do resto
// do app (que já é o de Brasília).
function dayStr(iso: string): string {
  const t = new Date(String(iso)).getTime();
  if (Number.isNaN(t)) return String(iso).slice(0, 10);
  return new Date(t + BRAZIL_OFFSET_MS).toISOString().slice(0, 10);
}

function computeStreak(activeDays: Set<string>, todayStr: string): { current: number; longest: number; frozen: boolean } {
  const sorted = [...activeDays].sort();
  if (sorted.length === 0) return { current: 0, longest: 0, frozen: false };

  const dayMs = 24 * 60 * 60 * 1000;
  const toDate = (s: string) => new Date(`${s}T00:00:00Z`).getTime();

  // Maior sequência histórica (tolerando o congelamento de 1 dia).
  let longest = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    const gapDays = Math.round((toDate(sorted[i]) - toDate(sorted[i - 1])) / dayMs);
    if (gapDays <= STREAK_FREEZE_DAYS + 1) {
      run += 1;
      longest = Math.max(longest, run);
    } else {
      run = 1;
    }
  }

  // Sequência atual: conta pra trás a partir de hoje, aceitando um buraco.
  const today = toDate(todayStr);
  const last = toDate(sorted[sorted.length - 1]);
  const sinceLast = Math.round((today - last) / dayMs);
  if (sinceLast > STREAK_FREEZE_DAYS + 1) return { current: 0, longest, frozen: false };

  let current = 1;
  for (let i = sorted.length - 1; i > 0; i--) {
    const gapDays = Math.round((toDate(sorted[i]) - toDate(sorted[i - 1])) / dayMs);
    if (gapDays <= STREAK_FREEZE_DAYS + 1) current += 1;
    else break;
  }
  // "Congelado" = hoje ainda não teve atividade, mas a sequência segue viva.
  return { current, longest, frozen: sinceLast >= 1 };
}

app.get("/make-server-19717bce/garden", async (c) => {
  try {
    const todayStr = brazilNow().toISOString().slice(0, 10);
    const cacheKey = `garden:${todayStr}`;
    const cached = await kv.get(cacheKey);

    // Cache quentinho: nem chega a contar os itens. `countByPrefix` é um
    // COUNT(*) exato sobre todas as linhas `item:` — barato perto da varredura
    // do digest, mas não de graça, e o piso de tempo já decidiu que não vamos
    // recalcular mesmo que o total tenha mudado.
    if (
      cached && typeof cached.computedAt === "number" &&
      Date.now() - cached.computedAt < GARDEN_MIN_RECOMPUTE_MS
    ) {
      return c.json(cached);
    }

    // Fora do piso de tempo, o cache do dia ainda vale enquanto o total de
    // itens não muda (ninguém postou nada desde o último cálculo).
    const totalNow = await kv.countByPrefix("item:");
    if (cached && cached.totalItems === totalNow) return c.json(cached);

    // Só os últimos ~14 meses: cobre a retrospectiva do ano inteiro e a
    // sequência atual, e impede que a varredura cresça pra sempre junto com o
    // histórico. O `total` real continua vindo do countByPrefix (barato).
    const since = new Date(Date.now() - GARDEN_WINDOW_DAYS * 24 * 60 * 60 * 1000)
      .toISOString();
    const digest = await kv.getActivityDigest(5000, since);

    const activeDays = new Set<string>();
    // Contado à parte porque é o número exibido dentro da retrospectiva do
    // ano. Usar o total da janela faria ele ENCOLHER quando dias antigos
    // saíssem dos 430 dias; restrito ao ano corrente, o número é estável e
    // ainda por cima bate com o título do card.
    const activeDaysThisYear = new Set<string>();
    const byCategory: Record<string, number> = {};
    const byPerson: Record<string, number> = {};
    const byMonthThisYear: Record<string, number> = {};
    const currentYear = todayStr.slice(0, 4);

    for (const row of digest) {
      if (!row?.createdAt) continue;
      const day = dayStr(row.createdAt);
      activeDays.add(day);
      const category = row.category || "outro";
      byCategory[category] = (byCategory[category] || 0) + 1;
      if (row.createdBy === "Amanda" || row.createdBy === "Mateus") {
        byPerson[row.createdBy] = (byPerson[row.createdBy] || 0) + 1;
      }
      if (day.slice(0, 4) === currentYear) {
        activeDaysThisYear.add(day);
        const month = day.slice(0, 7);
        byMonthThisYear[month] = (byMonthThisYear[month] || 0) + 1;
      }
    }

    const streak = computeStreak(activeDays, todayStr);

    // O recorde é persistido à parte porque o digest só enxerga a janela
    // recente: sem isso, uma sequência boa de 18 meses atrás sairia da janela
    // e o "recorde" DIMINUIRIA de um dia pro outro — que é pior do que não ter
    // recorde nenhum.
    const storedLongest = Number(await kv.get("garden-longest-streak")) || 0;
    const longest = Math.max(streak.longest, streak.current, storedLongest);
    if (longest > storedLongest) {
      await kv.set("garden-longest-streak", longest);
    }
    streak.longest = longest;
    // O progresso do jardim usa a contagem REAL de itens, não o tamanho do
    // digest: a varredura é limitada à janela de GARDEN_WINDOW_DAYS, então
    // derivar o nível dela faria o jardim ENCOLHER (nível e "momentos
    // plantados" caindo) conforme o histórico antigo saísse da janela.
    const totalItems = totalNow;

    // Nível do jardim: cresce rápido no começo e desacelera, pra nunca ficar
    // "travado" nem inflacionar quando o histórico já é grande.
    const level = Math.max(1, Math.floor(Math.sqrt(totalItems / 3)) + 1);
    const nextLevelAt = Math.pow(level, 2) * 3;

    const busiestMonth = Object.entries(byMonthThisYear)
      .sort((a, b) => b[1] - a[1])[0] || null;

    const result = {
      date: todayStr,
      totalItems: totalNow,
      computedAt: Date.now(),
      streak,
      level,
      nextLevelAt,
      itemsCounted: totalItems,
      activeDays: activeDaysThisYear.size,
      byCategory,
      byPerson,
      thisYear: {
        year: currentYear,
        total: Object.values(byMonthThisYear).reduce((a, b) => a + b, 0),
        byMonth: byMonthThisYear,
        busiestMonth: busiestMonth ? { month: busiestMonth[0], count: busiestMonth[1] } : null,
      },
    };

    await kv.set(cacheKey, result);
    return c.json(result);
  } catch (error) {
    console.error("[GET /garden] Error:", error);
    return c.json({ error: "Failed to compute garden", details: String(error) }, 500);
  }
});

// ── Cutucada (nudge): push imediato "tô pensando em você" ────────────────────
//
// Um toque manda uma notificação instantânea pro outro. Rate limit no servidor
// (1 cutucada a cada 3 min por pessoa) para nunca virar spam — excesso de
// notificação é a reclamação nº 1 contra apps de casal concorrentes.

const NUDGE_COOLDOWN_MS = 3 * 60 * 1000;
const NUDGE_MAX_LEN = 90;

app.post("/make-server-19717bce/nudge", async (c) => {
  try {
    const { from, message } = await c.req.json();
    if (from !== "Amanda" && from !== "Mateus") {
      return c.json({ error: "Invalid profile" }, 400);
    }

    const lastKey = `nudge-last:${from}`;
    const last = await kv.get(lastKey);
    const now = Date.now();
    if (typeof last === "number" && now - last < NUDGE_COOLDOWN_MS) {
      const waitSec = Math.ceil((NUDGE_COOLDOWN_MS - (now - last)) / 1000);
      return c.json({
        error: `Calma, coração! Espera ${waitSec}s pra cutucar de novo.`,
        retryAfterSec: waitSec,
      }, 429);
    }

    const to = from === "Amanda" ? "Mateus" : "Amanda";
    const body = typeof message === "string" && message.trim()
      ? message.trim().substring(0, NUDGE_MAX_LEN)
      : "tá pensando em você agora 💭";

    // A trava de 3 min é gravada só DEPOIS de a notificação sair. Gravada
    // antes (como estava), uma cutucada que não chegou ainda deixava a pessoa
    // 3 minutos travada — e a retentativa tomava 429 em vez de tentar de novo.
    let entregue = false;
    try {
      entregue = await sendPushToUser(to, {
        title: `💌 ${from} te cutucou!`,
        body,
        tag: "mesinha-nudge",
        url: "/",
      });
    } catch (err) {
      console.error("[POST /nudge] Push failed:", err);
      return c.json({ error: "Não deu pra cutucar agora. Tenta de novo!" }, 500);
    }

    if (!entregue) {
      // Nenhum canal aceitou (sem token FCM, sem inscrição de push, ou os dois
      // recusaram). Antes disso a resposta era 200 e o widget dizia "enviada!"
      // numa cutucada que não chegava em ninguém.
      console.error(`[POST /nudge] Nenhum canal entregou para ${to}`);
      return c.json({
        error: `O ${to === "Amanda" ? "celular da Amanda" : "celular do Mateus"} não recebeu — pede pra abrir o app e ligar as notificações 🔔`,
      }, 502);
    }

    await kv.set(lastKey, now);

    return c.json({ success: true, to });
  } catch (error) {
    console.error("[POST /nudge] Error:", error);
    return c.json({ error: "Failed to send nudge", details: String(error) }, 500);
  }
});

// ── "Neste dia": posts do mural na mesma data em anos anteriores ─────────────
//
// Busca por faixa de data usa o índice idx_kv_items_createdat (uma query por
// ano, range curto de 1 dia), e o resultado é cacheado em KV por dia — o custo
// de Disk IO é de no máximo algumas queries pequenas por dia.

app.get("/make-server-19717bce/memories/on-this-day", async (c) => {
  try {
    const todayStr = brazilNow().toISOString().slice(0, 10);
    const cacheKey = `on-this-day:${todayStr}`;
    const cached = await kv.get(cacheKey);
    if (cached) return c.json(cached);

    const [year, month, day] = todayStr.split("-").map(Number);
    const memories: any[] = [];
    for (let back = 1; back <= 4; back++) {
      // createdAt é UTC, mas o "dia" é o de Brasília: o dia D vai de
      // D 03:00Z a D+1 03:00Z. Comparar com a data pura (D..D+1 em UTC) jogava
      // os posts feitos depois das 21h pro dia seguinte — a memória de uma
      // noite de aniversário só apareceria um dia atrasada.
      const start = new Date(Date.UTC(year - back, month - 1, day) - BRAZIL_OFFSET_MS).toISOString();
      const end = new Date(Date.UTC(year - back, month - 1, day + 1) - BRAZIL_OFFSET_MS).toISOString();
      const rows = await kv.getMuralLightByDateRange(start, end);
      for (const row of rows) {
        // Posts de texto guardam o conteúdo em muralContent (pequeno) — busca o
        // valor completo só para eles; mídia pesada nunca sai do banco aqui.
        if (row.muralContentType === "text" && row.id) {
          const full = await kv.get(`item:${row.id}`);
          row.muralContent = typeof full?.muralContent === "string"
            ? full.muralContent.substring(0, 500)
            : null;
        }
        memories.push({ ...row, yearsAgo: back });
      }
    }

    const result = { date: todayStr, memories };
    await kv.set(cacheKey, result);
    return c.json(result);
  } catch (error) {
    console.error("[GET /memories/on-this-day] Error:", error);
    return c.json({ error: "Failed to fetch memories", details: String(error) }, 500);
  }
});

// ── Compartilhamento de localização em tempo real (aba "Mapa") ───────────────
//
// Estado efêmero (não é um "item"): cada perfil tem no máximo uma sessão de
// compartilhamento ativa por vez, guardada em `location:<profile>` com um
// `expiresAt` de 1h a partir do início. O cliente também transmite as
// atualizações de posição via Supabase Realtime Broadcast (baixa latência);
// este endpoint é a fonte de verdade persistida — usada no primeiro load do
// mapa e como fallback caso o broadcast realtime seja perdido.

const LOCATION_SHARE_DURATION_MS = 60 * 60 * 1000; // 1 hora

function isLocationFresh(loc: any): boolean {
  return !!loc && typeof loc.expiresAt === "string" && new Date(loc.expiresAt).getTime() > Date.now();
}

// Inicia (ou reinicia) uma sessão de compartilhamento de 1h para o perfil e
// notifica o parceiro para que ele também ative o mapa.
app.post("/make-server-19717bce/location/start", async (c) => {
  try {
    const { profile, lat, lng } = await c.req.json();
    if (profile !== "Amanda" && profile !== "Mateus") {
      return c.json({ error: "Invalid profile" }, 400);
    }
    const now = new Date();
    const expiresAt = new Date(now.getTime() + LOCATION_SHARE_DURATION_MS).toISOString();
    const location = {
      profile,
      lat: typeof lat === "number" ? lat : null,
      lng: typeof lng === "number" ? lng : null,
      updatedAt: now.toISOString(),
      expiresAt,
    };
    await kv.set(`location:${profile}`, location);

    const otherUser = profile === "Amanda" ? "Mateus" : "Amanda";
    sendPushToUser(otherUser, {
      title: `${profile} quer compartilhar a localização! 📍`,
      body: "Abre o Mapa no app pra ver em tempo real (e compartilhar a sua também) por 1h.",
      tag: "mesinha-location",
      url: "/",
    }).catch(console.error);

    return c.json({ location });
  } catch (error) {
    console.error("[POST /location/start] Error:", error);
    return c.json({ error: "Failed to start location sharing", details: String(error) }, 500);
  }
});

// Atualiza a posição atual — só é aceito enquanto a sessão de 1h não expirou.
app.put("/make-server-19717bce/location", async (c) => {
  try {
    const { profile, lat, lng } = await c.req.json();
    if (profile !== "Amanda" && profile !== "Mateus") {
      return c.json({ error: "Invalid profile" }, 400);
    }
    if (typeof lat !== "number" || typeof lng !== "number") {
      return c.json({ error: "lat/lng inválidos" }, 400);
    }
    const existing = await kv.get(`location:${profile}`);
    if (!isLocationFresh(existing)) {
      return c.json({ error: "Sessão de compartilhamento expirada ou inexistente" }, 410);
    }
    const location = { ...existing, lat, lng, updatedAt: new Date().toISOString() };
    await kv.set(`location:${profile}`, location);
    return c.json({ location });
  } catch (error) {
    console.error("[PUT /location] Error:", error);
    return c.json({ error: "Failed to update location", details: String(error) }, 500);
  }
});

// Estado atual dos dois — usado ao abrir o Mapa (o realtime cobre o resto).
app.get("/make-server-19717bce/location", async (c) => {
  try {
    const [amanda, mateus] = await Promise.all([
      kv.get("location:Amanda"),
      kv.get("location:Mateus"),
    ]);
    return c.json({
      Amanda: isLocationFresh(amanda) ? amanda : null,
      Mateus: isLocationFresh(mateus) ? mateus : null,
    });
  } catch (error) {
    console.error("[GET /location] Error:", error);
    return c.json({ error: "Failed to fetch locations", details: String(error) }, 500);
  }
});

// Para de compartilhar (usuário tocou em "Parar" ou fechou a tela do mapa).
app.delete("/make-server-19717bce/location", async (c) => {
  try {
    const { profile } = await c.req.json();
    if (profile !== "Amanda" && profile !== "Mateus") {
      return c.json({ error: "Invalid profile" }, 400);
    }
    await kv.del(`location:${profile}`);
    return c.json({ success: true });
  } catch (error) {
    console.error("[DELETE /location] Error:", error);
    return c.json({ error: "Failed to stop location sharing", details: String(error) }, 500);
  }
});

// ── Cron endpoint: dispara Web Push para lembretes do horário atual ──────────
//
// Chamado a cada minuto por pg_cron ou serviço externo.
// Protegido com Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>
// ou com o header X-Cron-Secret: <CRON_SECRET>.
//
// Setup Supabase (rodar no SQL Editor UMA VEZ):
//
//   -- Habilita as extensões necessárias
//   create extension if not exists pg_cron;
//   create extension if not exists pg_net;
//
//   -- Agenda a chamada a cada minuto
//   select cron.schedule(
//     'mesinha-reminders',
//     '* * * * *',
//     $$
//     select net.http_post(
//       url := 'https://oubdmmaqxnutbbxiqeow.supabase.co/functions/v1/make-server-19717bce/trigger-reminders',
//       headers := jsonb_build_object(
//         'Content-Type', 'application/json',
//         'X-Cron-Secret', 'mesinha-cron-2024'
//       ),
//       body := '{}',
//       timeout_milliseconds := 55000
//     )
//     $$
//   );
//
// Para cancelar: select cron.unschedule('mesinha-reminders');

const CRON_SECRET = Deno.env.get("CRON_SECRET") || "mesinha-cron-2024";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

// Fuso horário do Brasil (UTC-3, sem horário de verão desde 2019)
const BRAZIL_OFFSET_MS = -3 * 60 * 60 * 1000;

function brazilNow(): Date {
  return new Date(Date.now() + BRAZIL_OFFSET_MS);
}

// Estado do dia para o widget nativo "Encontro hoje?": devolve se HOJE (fuso
// de Brasília, igual ao resto do app) está confirmado no Calendário de
// Encontros e, se estiver, o tipo (coração/video game/pegadas) pra escolher o
// ícone certo — sem expor a lista inteira de itens ao widget.
app.get("/make-server-19717bce/meetup-today", async (c) => {
  try {
    const todayStr = brazilNow().toISOString().slice(0, 10);
    const { items } = await kv.getItemsLightPaged({
      offset: 0,
      limit: 50,
      categoryFilter: "meetup",
    });
    const todayItem = items.find((item: any) => item.eventDate === todayStr && item.status === "done");
    return c.json({
      date: todayStr,
      confirmed: !!todayItem,
      type: todayItem?.meetupType || null,
      period: todayItem?.meetupPeriod || null,
    });
  } catch (error) {
    console.error("[GET /meetup-today] Error:", error);
    return c.json({
      error: "Failed to check meetup status",
      details: error instanceof Error ? error.message : String(error),
    }, 500);
  }
});

// Mês inteiro para os widgets nativos de calendário: devolve os dias do mês
// (fuso de Brasília) que têm encontro no Calendário de Encontros, com tipo e
// status (confirmado ou só proposto) — sem expor os itens completos. Sem o
// parâmetro `month` usa o mês atual; o widget semanal pede um mês específico
// quando a semana cai na virada do mês.
app.get("/make-server-19717bce/meetup-month", async (c) => {
  try {
    const requestedMonth = c.req.query("month");
    const monthStr = /^\d{4}-\d{2}$/.test(requestedMonth || "")
      ? requestedMonth!
      : brazilNow().toISOString().slice(0, 7); // "YYYY-MM"
    const { items } = await kv.getItemsLightPaged({
      offset: 0,
      limit: 100,
      categoryFilter: "meetup",
    });
    const days = items
      .filter((item: any) =>
        typeof item.eventDate === "string" && item.eventDate.startsWith(monthStr)
      )
      .map((item: any) => ({
        date: item.eventDate,
        type: item.meetupType || null,
        period: item.meetupPeriod || null,
        confirmed: item.status === "done",
      }))
      .sort((a: any, b: any) => a.date.localeCompare(b.date));
    return c.json({ month: monthStr, days });
  } catch (error) {
    console.error("[GET /meetup-month] Error:", error);
    return c.json({
      error: "Failed to list month meetups",
      details: error instanceof Error ? error.message : String(error),
    }, 500);
  }
});

app.post("/make-server-19717bce/trigger-reminders", async (c) => {
  // Validar autorização
  const authHeader = c.req.header("Authorization") || "";
  const cronSecret = c.req.header("X-Cron-Secret") || "";
  const isServiceRole = SERVICE_ROLE_KEY && authHeader === `Bearer ${SERVICE_ROLE_KEY}`;
  const isCronSecret = cronSecret === CRON_SECRET;
  if (!isServiceRole && !isCronSecret) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const now = brazilNow();
  const dayByIndex = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  const todayDay = dayByIndex[now.getDay()];
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  // Buscar itens de lembrete ativos. limit baixo (50) porque alarmes são poucos
  // e o cron roda a cada minuto — queries grandes aqui desperdiçam Disk IO.
  // Versão "light" basta: todos os campos de lembrete são pequenos e mantidos.
  const { items: allItems } = await kv.getItemsLightPaged({
    offset: 0,
    limit: 50,
    categoryFilter: "alarm",
  });

  const alarmItems = allItems.filter((item: any) =>
    item.category === "alarm" &&
    item.reminderActive !== false &&
    item.reminderTime &&
    Array.isArray(item.reminderDays) &&
    item.reminderDays.length > 0
  );

  const fired: string[] = [];
  // Data local (Brasília) usada na trava de "já disparou hoje".
  const todayStr = now.toISOString().slice(0, 10);

  for (const item of alarmItems) {
    // Verificar se hoje é um dos dias configurados
    if (!item.reminderDays.includes(todayDay)) continue;

    // Verificar horário (margem de 1 minuto)
    const [h, m] = item.reminderTime.split(":").map(Number);
    const minutesDiff = Math.abs((h * 60 + m) - (currentHour * 60 + currentMinute));
    if (minutesDiff > 1) continue;

    // Trava anti-duplicação: a margem de ±1min faz o mesmo lembrete casar em
    // até 3 execuções do cron (ex.: 08:09, 08:10 e 08:11) — sem a trava, a
    // notificação chegava 2-4x. Dispara no máximo 1x por dia por lembrete.
    const lastFiredKey = `reminder-last-fired:${item.id}`;
    if ((await kv.get(lastFiredKey)) === todayStr) continue;
    await kv.set(lastFiredKey, todayStr);

    // Disparar para os usuários configurados
    const payload = {
      title: `⏰ Lembrete: ${item.title}`,
      body: item.comment || `Hora do seu lembrete!`,
      tag: `reminder-${item.id}`,
      url: "/",
    };

    const sends: Promise<void>[] = [];
    if (item.reminderForMateus) sends.push(sendPushToUser("Mateus", payload));
    if (item.reminderForAmanda) sends.push(sendPushToUser("Amanda", payload));
    await Promise.all(sends);

    fired.push(item.title);
    console.log(`[Reminders] Fired "${item.title}" at ${item.reminderTime} for day ${todayDay}`);
  }

  // Lembrete diário do Calendário de Encontros: se hoje tem um encontro
  // confirmado, avisa os dois às 08:00 (Brasília) — só uma vez por dia,
  // mesma trava anti-duplicação (margem de ±1min) usada pros alarmes acima.
  const MEETUP_REMINDER_MINUTES = 8 * 60; // 08:00
  const nowMinutes = currentHour * 60 + currentMinute;
  if (Math.abs(nowMinutes - MEETUP_REMINDER_MINUTES) <= 1) {
    const meetupReminderKey = "meetup-reminder-last-fired";
    if ((await kv.get(meetupReminderKey)) !== todayStr) {
      const { items: meetupItems } = await kv.getItemsLightPaged({
        offset: 0,
        limit: 50,
        categoryFilter: "meetup",
      });
      const todayMeetup = meetupItems.find((item: any) => item.eventDate === todayStr && item.status === "done");
      if (todayMeetup) {
        const payload = {
          title: "Hoje é dia de encontro! 💕",
          body: `Vocês combinaram ${describeMeetup(todayMeetup)}.`,
          tag: "mesinha-meetup-today",
          url: "/",
        };
        await Promise.all([
          sendPushToUser("Amanda", payload),
          sendPushToUser("Mateus", payload),
        ]);
        console.log(`[Reminders] Meetup reminder fired for ${todayStr}`);
      }
      await kv.set(meetupReminderKey, todayStr);
    }

    // Cápsulas do tempo que abrem HOJE: avisa os dois (junto do horário das
    // 08:00, com trava própria de 1x por dia).
    const capsuleReminderKey = "capsule-reminder-last-fired";
    if ((await kv.get(capsuleReminderKey)) !== todayStr) {
      // Varre TODAS as páginas de cápsulas: a listagem vem ordenada por
      // createdAt DESC, e cápsula é escrita com muita antecedência — cortar nas
      // 50 mais recentes deixaria de fora justamente as mais antigas, que são
      // as que estão abrindo hoje. A projeção é leve (sem mídia) e isso roda
      // uma vez por dia, às 08:00.
      const opening: any[] = [];
      const CAPSULE_PAGE = 100;
      for (let offset = 0; ; offset += CAPSULE_PAGE) {
        const { items: page, total } = await kv.getItemsLightPaged({
          offset,
          limit: CAPSULE_PAGE,
          categoryFilter: "capsule",
        });
        for (const item of page as any[]) {
          if (item.eventDate === todayStr) opening.push(item);
        }
        if (page.length === 0 || offset + CAPSULE_PAGE >= total) break;
      }
      for (const capsule of opening) {
        const payload = {
          title: "Uma cápsula do tempo abriu! 🎉",
          body: `"${capsule.title}" pode ser aberta hoje. Corre lá na Cápsula!`,
          tag: `mesinha-capsule-open-${capsule.id}`,
          url: "/",
        };
        await Promise.all([
          sendPushToUser("Amanda", payload),
          sendPushToUser("Mateus", payload),
        ]);
        console.log(`[Reminders] Capsule opened: "${capsule.title}"`);
      }
      await kv.set(capsuleReminderKey, todayStr);
    }
  }

  const brazilTimeStr = `${String(currentHour).padStart(2,"0")}:${String(currentMinute).padStart(2,"0")} (Brasília)`;
  console.log(`[Reminders] Checked ${alarmItems.length} alarms at ${brazilTimeStr}. Fired: ${fired.length}`);
  return c.json({ checked: alarmItems.length, fired, time: brazilTimeStr });
});

// Serve the application
Deno.serve(app.fetch);