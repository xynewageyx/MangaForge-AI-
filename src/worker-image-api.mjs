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
  if (Number(request.headers.get("content-length") || 0) > 2000000) return fail(413, "Anfrage zu groß.");
  let body;
  try {
    const raw = await request.text();
    if (raw.length > 2000000) return fail(413, "Anfrage zu groß.");
    body = JSON.parse(raw);
  } catch { return fail(400, "Ungültiges JSON."); }
  if (typeof body?.prompt !== "string" || body.prompt.trim().length < 3 || body.prompt.length > 1800) return fail(400, "Bildbeschreibung muss 3 bis 1800 Zeichen lang sein.");
  if (body.model !== undefined && !["standard", "reference"].includes(body.model)) return fail(400, "Unbekanntes Bildmodell.");
  if (body.model === "reference" && env.IMAGE_REFERENCE_ENABLED !== "true") return fail(503, "Referenzmodell ist noch nicht freigeschaltet.");
  try {
    let result;
    if (body.model === "reference") {
      if (!Array.isArray(body.references) || body.references.length < 1 || body.references.length > 4) return fail(400, "1 bis 4 Referenzbilder erforderlich.");
      const form = new FormData();
      form.append("prompt", body.prompt.trim());
      for (const [index, source] of body.references.entries()) {
        if (typeof source !== "string" || !source.startsWith("data:image/png;base64,")) return fail(400, "Referenzen müssen PNG-Bilder sein.");
        const encoded = source.slice("data:image/png;base64,".length);
        if (encoded.length > 350000) return fail(413, "Referenzbild zu groß.");
        const bytes = Uint8Array.from(atob(encoded), (char) => char.charCodeAt(0));
        form.append("input_image_" + index, new Blob([bytes], { type: "image/png" }), "reference.png");
      }
      const payload = new Response(form);
      result = await env.AI.run("@cf/black-forest-labs/flux-2-klein-4b", {
        multipart: { body: payload.body, contentType: payload.headers.get("content-type") }
      });
    } else {
      result = await env.AI.run("@cf/black-forest-labs/flux-1-schnell", { prompt: body.prompt.trim(), steps: 4 });
    }
    if (typeof result?.image !== "string") return fail(502, "Bildmodell hat kein Bild geliefert.");
    return Response.json({ image: "data:image/jpeg;base64," + result.image }, { headers });
  } catch (error) {
    console.error("Workers AI request failed", error);
    return fail(502, "Cloudflare-Bildgenerierung fehlgeschlagen. Worker-Protokolle prüfen.");
  }
}
