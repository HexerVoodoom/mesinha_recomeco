import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import webpush from "npm:web-push";
import * as kv from "./kv_store.tsx";

const VAPID_PUBLIC_KEY = "BEeyyQPVJ900xV1F1Jo8Q2TNc2DK7jb9jyiqmQQX3QnUwzJYxy1j5BByQ0vJFDSbPTGacjS3oUtpOKCtxAF5WIY";
const VAPID_PRIVATE_KEY = "V9PFLTWJWHdqXPGmuJZHfJds-L0nmme4kti5dD_nF5o";

webpush.setVapidDetails("mailto:mateus.sprnd@gmail.com", VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

async function sendPushToUser(user: string, payload: object): Promise<void> {
  const subscription = await kv.get(`push-subscription:${user}`);
  if (!subscription) return;
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

const app = new Hono();

// Senhas fixas
const PASSWORDS: Record<string, string> = {
  'Amanda': 'Mateus',
  'Mateus': 'Amanda'
};

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

// Login endpoint - simples validação de senha
app.post("/make-server-19717bce/login", async (c) => {
  try {
    const body = await c.req.json();
    const { profile, password } = body;

    console.log(`[POST /login] Login attempt for: ${profile} with password: ${password}`);

    if (!profile || !password) {
      return c.json({ error: "Perfil e senha são obrigatórios" }, 400);
    }

    // Validar se é Amanda ou Mateus
    if (profile !== 'Amanda' && profile !== 'Mateus') {
      return c.json({ error: "Perfil inválido" }, 400);
    }

    // Verificar senha
    const expectedPassword = PASSWORDS[profile];
    console.log(`[POST /login] Expected password for ${profile}: ${expectedPassword}`);
    
    if (expectedPassword !== password) {
      console.log(`[POST /login] Senha incorreta para ${profile}. Expected: ${expectedPassword}, Got: ${password}`);
      return c.json({ error: "Senha incorreta" }, 401);
    }

    console.log(`[POST /login] Login bem-sucedido para ${profile}`);
    
    return c.json({ 
      success: true,
      profile: profile
    });
  } catch (error) {
    console.error("[POST /login] Login error:", error);
    return c.json({ 
      error: "Erro ao fazer login", 
      details: error instanceof Error ? error.message : String(error) 
    }, 500);
  }
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

  // Buscar todos os itens de lembrete ativos
  const { items: allItems } = await kv.getByPrefixPaged("item:", {
    offset: 0,
    limit: 1000,
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