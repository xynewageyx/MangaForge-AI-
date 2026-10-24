import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

type ImageAIEnv = {
  AI?: { run: (model: string, options: { prompt: string; steps: number }) => Promise<{ image?: string }> };
  IMAGE_AI_ENABLED?: string;
  IMAGE_AI_ACCESS_KEY?: string;
};

async function generateImage(request: Request, env: ImageAIEnv): Promise<Response> {
  const headers = { "cache-control": "no-store", "content-type": "application/json; charset=utf-8" };
  if (env.IMAGE_AI_ENABLED !== "true") {
    return Response.json({ error: "Bild-KI ist noch nicht freigeschaltet. Die öffentliche API bleibt aus Kostenschutzgründen deaktiviert." }, { status: 503, headers });
  }
  if (!env.IMAGE_AI_ACCESS_KEY || env.IMAGE_AI_ACCESS_KEY.length < 24) {
    return Response.json({ error: "Zugriffsschutz fehlt. IMAGE_AI_ACCESS_KEY muss als Cloudflare-Secret gesetzt sein." }, { status: 503, headers });
  }
  const providedKey = request.headers.get("x-mangaforge-ai-key") ?? "";
  const encoder = new TextEncoder();
  const expected = encoder.encode(env.IMAGE_AI_ACCESS_KEY);
  const provided = encoder.encode(providedKey);
  let mismatch = expected.length ^ provided.length;
  for (let i = 0; i < expected.length; i++) mismatch |= expected[i] ^ (provided[i] ?? 0);
  if (mismatch !== 0) return Response.json({ error: "Zugriff verweigert. Prüfe deinen Bild-KI-Zugangsschlüssel." }, { status: 401, headers });
  if (!env.AI) return Response.json({ error: "Cloudflare AI-Binding fehlt." }, { status: 503, headers });
  if (Number(request.headers.get("content-length") ?? 0) > 8192) {
    return Response.json({ error: "Anfrage zu groß." }, { status: 413, headers });
  }
  let input: unknown;
  try { input = await request.json(); } catch {
    return Response.json({ error: "Ungültiges JSON." }, { status: 400, headers });
  }
  const prompt = typeof input === "object" && input !== null && "prompt" in input ? (input as { prompt: unknown }).prompt : null;
  if (typeof prompt !== "string" || prompt.trim().length < 3 || prompt.length > 1800) {
    return Response.json({ error: "Beschreibung muss zwischen 3 und 1800 Zeichen enthalten." }, { status: 400, headers });
  }
  try {
    const result = await env.AI.run("@cf/black-forest-labs/flux-1-schnell", {
      prompt: prompt.trim(), steps: 4,
    });
    if (typeof result.image !== "string") throw new Error("Kein Bild zurückgegeben");
    return Response.json({ image: "data:image/jpeg;base64," + result.image }, { headers });
  } catch (error) {
    console.error("Bildgenerierung fehlgeschlagen", error);
    return Response.json({ error: "Bildgenerierung fehlgeschlagen. Bitte später erneut versuchen." }, { status: 502, headers });
  }
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    if (new URL(request.url).pathname === "/api/generate-image") {
      if (request.method !== "POST") return new Response("Method Not Allowed", { status: 405, headers: { Allow: "POST" } });
      return generateImage(request, env as ImageAIEnv);
    }
    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};