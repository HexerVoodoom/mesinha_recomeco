import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import webpush from "npm:web-push";
import * as kv from "./kv_store.tsx";
import { sendFcmToUser } from "./fcm.tsx";

const VAPID_PUBLIC_KEY = "BEeyyQPVJ900xV1F1Jo8Q2TNc2DK7jb9jyiqmQQX3QnUwzJYxy1j5BByQ0vJFDSbPTGacjS3oUtpOKCtxAF5WIY";
const VAPID_PRIVATE_KEY = "V9PFLTWJWHdqXPGmuJZHfJds-L0nmme4kti5dD_nF5o";

webpush.setVapidDetails("mailto:mateus.sprnd@gmail.com", VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

async function sendPushToUser(user: string, payload: any): Promise<void> {
  // 1) Web Push (Chrome / PWA instalado pelo navegador).
  const subscription = await kv.get(`push-subscription:${user}`);
  if (subscription) {
    try {
      await webpush.sendNotification(subscription, JSON.stringify(payload));
      console.log(`[Push] Sent to ${user}`);
    } catch (err: any) {
      console.error(`[Push] Failed to send to ${user}:`, err?.statusCode, err?.message);
      if (err?.statusCode === 410 || err?.statusCode === 404) {
        await kv.del(`push-subscription:${user}`);
      }
    }
  }

  // 2) FCM (app Android instalado). Ignorado se o secret não estiver configurado.
  try {
    await sendFcmToUser(
      user,
      String(payload?.title ?? "Mesinha"),
      String(payload?.body ?? ""),
    );
  } catch (err) {
    console.error(`[FCM] Failed to send to ${user}:`, err);
  }
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

    const { items: rawItems, total } = await kv.getByPrefixPaged("item:", {
      offset,
      limit,
      orderByJsonField: "createdAt",
      ascending: false,
      categoryFilter: category || undefined,
    });

    const paginatedItems = rawItems.filter(item => item?.id && item?.category && item?.title);

    // Build minimal items (no photo, no muralContent) - simplified
    const items = [];
    for (const item of paginatedItems) {
      items.push({
        id: item.id,
        title: item.title,
        comment: item.comment || "",
        category: item.category,
        eventDate: item.eventDate || null,
        photo: item.photo ? 'HAS_PHOTO' : null,
        reminderEnabled: item.reminderEnabled || false,
        reminderFrequency: item.reminderFrequency,
        repeatCount: item.repeatCount,
        createdBy: item.createdBy,
        createdAt: item.createdAt,
        status: item.status,
        tags: item.tags || [],
        videoLink: item.videoLink,
        reminderTime: item.reminderTime,
        reminderDays: item.reminderDays,
        reminderForMateus: item.reminderForMateus,
        reminderForAmanda: item.reminderForAmanda,
        reminderActive: item.reminderActive,
        isFavorite: item.isFavorite,
        top3Mateus: item.top3Mateus,
        top3Amanda: item.top3Amanda,
        muralContentType: item.muralContentType,
        // Texto é pequeno: inclui na listagem para o preview aparecer sem precisar
        // abrir o post. Mídia (imagem/vídeo/áudio) fica undefined — é base64 pesado
        // que só carrega sob demanda via GET /items/:id/full.
        muralContent: item.muralContentType === 'text' ? item.muralContent : undefined,
        muralThumbnail: item.muralThumbnail,
        viewedBy: item.viewedBy,
        updatedAt: item.updatedAt,
      });
    }

    return c.json({
      items,
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

    return c.json({ item });
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

    return c.json({ photo: item.photo || null });
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
      viewedBy: Array.isArray(body.viewedBy) ? body.viewedBy : [],
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

    return c.json({ item });
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
    return c.json({ item: updatedItem });
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
    { corvinho: "Tem jogo novo pra jogar junto?", alpaquinha: "It Takes Two ainda está esperando!" },
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
      items.push(...batch);
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
  const { items: allItems } = await kv.getByPrefixPaged("item:", {
    offset: 0,
    limit: 50,
    orderByJsonField: "createdAt",
    ascending: false,
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

  for (const item of alarmItems) {
    // Verificar se hoje é um dos dias configurados
    if (!item.reminderDays.includes(todayDay)) continue;

    // Verificar horário (margem de 1 minuto)
    const [h, m] = item.reminderTime.split(":").map(Number);
    const minutesDiff = Math.abs((h * 60 + m) - (currentHour * 60 + currentMinute));
    if (minutesDiff > 1) continue;

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

  const brazilTimeStr = `${String(currentHour).padStart(2,"0")}:${String(currentMinute).padStart(2,"0")} (Brasília)`;
  console.log(`[Reminders] Checked ${alarmItems.length} alarms at ${brazilTimeStr}. Fired: ${fired.length}`);
  return c.json({ checked: alarmItems.length, fired, time: brazilTimeStr });
});

// Serve the application
Deno.serve(app.fetch);