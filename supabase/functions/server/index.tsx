import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";

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
    const limit = parseInt(c.req.query("limit") || "100");

    const allItems = await kv.getByPrefix("item:");

    if (!allItems || allItems.length === 0) {
      return c.json({ items: [], total: 0, hasMore: false });
    }

    // Filter by category if specified
    let filteredItems = allItems.filter(item =>
      item?.id && item?.category && item?.title
    );

    if (category) {
      filteredItems = filteredItems.filter(item => item.category === category);
    }

    // Sort by creation date (most recent first)
    filteredItems.sort((a, b) => {
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return dateB - dateA;
    });

    const total = filteredItems.length;
    const paginatedItems = filteredItems.slice(offset, offset + limit);

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
    return c.json({ error: "Failed to fetch items" }, 500);
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

    // Validate photo size (max 2MB base64 to prevent connection issues)
    if (photo && photo.length > 3000000) {
      console.warn("Photo rejected: too large");
      return c.json({ error: "Photo too large. Maximum size is 2MB. Please compress the image." }, 400);
    }

    const itemId = crypto.randomUUID();
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
      createdAt: new Date().toISOString(),
      status: "pending",
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
      viewedBy: Array.isArray(body.viewedBy) ? body.viewedBy : [],
    };

    await kv.set(`item:${itemId}`, item);
    console.log("Item created successfully:", itemId);
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

    // Fetch all items (without photos for count)
    const items = await kv.getByPrefix("item:");
    console.log(`[GET /backup/stats] Found ${items?.length || 0} items`);

    const stats = {
      totalItems: items?.length || 0,
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

    // Fetch all items with photos
    const items = await kv.getByPrefix("item:");
    console.log(`[GET /backup] Found ${items?.length || 0} items`);

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
        totalItems: items?.length || 0,
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

// Serve the application
Deno.serve(app.fetch);