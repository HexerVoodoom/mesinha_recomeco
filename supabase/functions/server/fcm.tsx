import * as kv from "./kv_store.tsx";

// Envio de notificações via Firebase Cloud Messaging (HTTP v1).
// O service account fica no secret FCM_SERVICE_ACCOUNT (JSON). Sem ele, o envio
// é ignorado silenciosamente (o web-push continua funcionando).

interface ServiceAccount {
  client_email: string;
  private_key: string;
  project_id: string;
}

let cachedToken: { token: string; exp: number } | null = null;

function isValidSA(j: any): j is ServiceAccount {
  return !!(j && j.client_email && j.private_key && j.project_id);
}

// Prioriza o secret de env (FCM_SERVICE_ACCOUNT); se ausente, usa o KV
// (chave "fcm-service-account"). Sem nenhum dos dois, o envio via FCM é ignorado.
async function getServiceAccount(): Promise<ServiceAccount | null> {
  const raw = Deno.env.get("FCM_SERVICE_ACCOUNT");
  if (raw) {
    try {
      const j = JSON.parse(raw);
      if (isValidSA(j)) return j;
    } catch {
      // cai para o KV
    }
  }
  try {
    const stored = await kv.get("fcm-service-account");
    if (isValidSA(stored)) return stored as ServiceAccount;
  } catch {
    // ignora
  }
  return null;
}

function base64url(input: ArrayBuffer | Uint8Array | string): string {
  let bytes: Uint8Array;
  if (typeof input === "string") bytes = new TextEncoder().encode(input);
  else if (input instanceof Uint8Array) bytes = input;
  else bytes = new Uint8Array(input);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const body = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s+/g, "");
  const bin = atob(body);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
}

async function getAccessToken(sa: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.exp - 60 > now) return cachedToken.token;

  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64url(JSON.stringify({
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  }));
  const signingInput = `${header}.${claims}`;

  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(sa.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(signingInput),
  );
  const jwt = `${signingInput}.${base64url(signature)}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body:
      `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });
  if (!res.ok) {
    throw new Error(`OAuth token falhou: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  cachedToken = {
    token: data.access_token,
    exp: now + (data.expires_in ?? 3600),
  };
  return cachedToken.token;
}

/** Devolve `true` só quando o FCM aceitou a mensagem para o aparelho. */
export async function sendFcmToUser(
  user: string,
  title: string,
  body: string,
): Promise<boolean> {
  const sa = await getServiceAccount();
  if (!sa) return false; // service account ainda não configurado

  const token = await kv.get(`fcm-token:${user}`);
  if (!token || typeof token !== "string") return false;

  const accessToken = await getAccessToken(sa);
  const res = await fetch(
    `https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          token,
          notification: { title, body },
          android: {
            priority: "high",
            notification: { channel_id: "mesinha_default" },
          },
        },
      }),
    },
  );

  if (!res.ok) {
    const txt = await res.text();
    console.error(`[FCM] envio falhou para ${user}: ${res.status} ${txt}`);
    // Token inválido/expirado → remove para não tentar de novo.
    if (
      txt.includes("UNREGISTERED") ||
      txt.includes("registration-token-not-registered") ||
      txt.includes("INVALID_ARGUMENT")
    ) {
      await kv.del(`fcm-token:${user}`);
    }
    return false;
  }
  console.log(`[FCM] enviado para ${user}`);
  return true;
}
