// Runs in the outer Cloudflare Worker where env bindings are available.
export async function handleImageRequest(request, env) {
  const headers = { "cache-control": "no-store" };
  const fail = (status, error) => Response.json({ error }, { status, headers });
  if (request.method !== "POST") return new Response("Method Not Allowed", { status: 405, headers: { Allow: "POST" } });
  if (!env || env.IMAGE_AI_ENABLED !== "true") return fail(503, "Bild-KI ist nicht freigeschaltet. Prüfe IMAGE_AI_ENABLED in Production.");
  if (!env.IMAGE_AI_ACCESS_KEY || env.IMAGE_AI_ACCESS_KEY.length < 24) return fail(503, "Bild-KI-Zugangsschutz fehlt.");
  const key = request.headers.get("x-mangaforge-ai-key") || "";
  const encoder = new TextEncoder();
  const expected = encoder.encode(env.IMAGE_AI_ACCESS_KEY);
  const actual = encoder.encode(key);
  let mismatch = expected.length ^ actual.length;
  for (let i = 0; i < expected.length; i++) mismatch |= expected[i] ^ (actual[i] ?? 0);
  if (mismatch !== 0) return fail(401, "Ungültiger Bild-KI-Zugangsschlüssel.");
  if (!env.AI) return fail(503, "Cloudflare AI-Binding fehlt.");
  if (Number(request.headers.get("content-length") || 0) > 8192) return fail(413, "Anfrage zu groß.");
  let body;
  try { body = await request.json(); } catch { return fail(400, "Ungültiges JSON."); }
  if (typeof body?.prompt !== "string" || body.prompt.trim().length < 3 || body.prompt.length > 1800) return fail(400, "Bildbeschreibung muss 3 bis 1800 Zeichen lang sein.");
  try {
    const result = await env.AI.run("@cf/black-forest-labs/flux-1-schnell", { prompt: body.prompt.trim(), steps: 4 });
    if (typeof result?.image !== "string") return fail(502, "Bildmodell hat kein Bild geliefert.");
    return Response.json({ image: "data:image/jpeg;base64," + result.image }, { headers });
  } catch (error) {
    console.error("Workers AI request failed", error);
    return fail(502, "Cloudflare-Bildgenerierung fehlgeschlagen. Worker-Protokolle prüfen.");
  }
}
