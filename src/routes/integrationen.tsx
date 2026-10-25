import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { useState } from "react";
import { Card } from "@/components/studio";
import { ReferenceLibrary } from "@/components/reference-library";

export const Route = createFileRoute("/integrationen")({
  head: () => ({
    meta: [
      { title: "Integrationen — MangaForge AI" },
      { name: "description", content: "Welche KI-Provider MangaForge AI anbinden kann und was ohne sie funktioniert." },
      { property: "og:title", content: "Integrationen — MangaForge AI" },
      { property: "og:description", content: "Bild-, Video-, Sprach- und Render-Provider für MangaForge AI." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Integrations,
});

const providers = [
  { name: "Bild-KI (Panels, Cover, Figuren)", use: "Panel-Bilder aus Beschreibung + Referenzbildern erzeugen", status: "Nicht verbunden" },
  { name: "Video-KI (Animationsaufträge)", use: "Shots aus Prompt, Kamera und Kampfchoreografie animieren", status: "Nicht verbunden" },
  { name: "Sprach-KI / TTS", use: "Sprachspuren DE/EN für Figuren erzeugen", status: "Nicht verbunden" },
  { name: "MP4-Render-Dienst", use: "Shots, Untertitel und Sprachspuren zu MP4 zusammenschneiden", status: "Nicht verbunden" },
];

const mangaStyles = [
  { id: "action", name: "Action / Kampf", prompt: "Dynamische Manga-Kampfszene, dramatische Perspektive, extreme Bewegungslinien, klare Anatomie, präzise Tuschekonturen, detaillierte Einschläge und Trümmer, schwarzweiß, keine Schrift, keine Sprechblasen" },
  { id: "fantasy", name: "Dark Fantasy", prompt: "Düsterer Fantasy-Manga, monumentale Ruinen, verwitterte Steinsäulen, detaillierte Rüstungen, bedrohliche Wolken, filmische Komposition, tiefe Schatten, feine Schraffur, schwarzweiß, keine Schrift, keine Sprechblasen" },
  { id: "romance", name: "Romantik / Alltag", prompt: "Gefühlvolle Manga-Szene, ausdrucksstarke individuelle Gesichter, subtile Mimik, natürliche Körperhaltung, detaillierte Haare, atmosphärisches Licht, ruhige Kameraperspektive, feine Rasterpunkte, schwarzweiß, keine Schrift, keine Sprechblasen" },
  { id: "horror", name: "Horror / Mystery", prompt: "Psychologischer Horror-Manga, verstörende Atmosphäre, tiefe Schwarzflächen, präzise Gesichter, unheimliche Details, dramatisches Licht, dichte Schraffur, schwarzweiß, keine Schrift, keine Sprechblasen" },
  { id: "accent", name: "Schwarzweiß + Farbeffekte", prompt: "Hochdetaillierter Schwarzweiß-Manga, dynamische Pose, kräftige Tuschelinien und Rasterpunkte, nur Augen und magische Energieeffekte leuchten in Cyan und Gold, keine weitere Farbe, keine Schrift, keine Sprechblasen" },
] as const;

function Integrations() {
  const [prompt, setPrompt] = useState("Schwarzweiß-Manga, dramatische Schatten, ein Schwertkämpfer mit rot leuchtenden Augen im Ascheregen, detailreiche Tuschezeichnung, keine Schrift");
  const [image, setImage] = useState<string | null>(null);
  const [style, setStyle] = useState<string>("accent");
  const [accessKey, setAccessKey] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  async function generate() {
    setLoading(true); setError(""); setImage(null);
    try {
      const response = await fetch("/api/generate-image", {
        method: "POST", headers: { "content-type": "application/json", "x-mangaforge-ai-key": accessKey },
        body: JSON.stringify({ prompt: `${mangaStyles.find((item) => item.id === style)?.prompt ?? ""}. Motiv: ${prompt}`.slice(0, 1800) }),
      });
      const data = await response.json() as { image?: string; error?: unknown };
      if (!response.ok || !data.image) throw new Error(typeof data.error === "string" ? data.error : `Bild-KI antwortet mit HTTP ${response.status}. Bitte Deployment und Worker-Protokolle prüfen.`);
      setImage(data.image);
    } catch (e) { setError(e instanceof Error ? e.message : "Unbekannter Fehler"); }
    finally { setLoading(false); }
  }
  return (
    <main className="mx-auto max-w-2xl space-y-4 px-4 pb-16 pt-6">
      <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground"><ArrowLeft className="h-4 w-4" /> Projekte</Link>
      <h1 className="text-3xl">KI-Integrationen</h1>
      <p className="text-sm text-muted-foreground">
        MangaForge AI ist ehrlich: Ohne verbundenen Provider wird kein Bild, keine Animation und kein MP4 erzeugt —
        auch nicht als Platzhalter. Alles Übrige (Story, Figuren, Panels, Sprechblasen, Storyboards, PDF/PNG-Export) funktioniert vollständig.
      </p>
      {providers.map((p) => (
        <Card key={p.name}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base">{p.name}</h2>
              <p className="text-sm text-muted-foreground">{p.use}</p>
            </div>
            <span className="shrink-0 rounded bg-warn/15 px-2 py-1 text-xs font-bold text-warn">{p.status}</span>
          </div>
        </Card>
      ))}
      <Card><ReferenceLibrary /></Card>
      <Card>
        <h2 className="text-base">Manga-Bildgenerator (Test)</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Der Serveranschluss für FLUX.1 schnell ist vorbereitet. Aus Schutz vor unkontrollierten
          Kosten bleibt die Generierung zunächst deaktiviert. Erst nach einer abgesicherten
          Freigabe und mit deinem privaten Zugangsschlüssel können hier echte Bilder erzeugt werden.
        </p>
        <label htmlFor="manga-style" className="mt-3 block text-sm">Manga-Zeichenstil</label>
        <select id="manga-style" value={style} onChange={(e) => setStyle(e.target.value)}
          className="mt-1 min-h-12 w-full rounded-md border bg-background px-3 text-sm">
          {mangaStyles.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
        <p className="mt-2 text-xs text-muted-foreground">
          Basierend auf deinen Referenzen: wechselnde Perspektiven, individuelle Gesichter und keine
          automatisch gezeichneten leeren Sprechblasen. Dialoge werden später separat gesetzt.
          Diese Stilvorgaben sind Text-Prompts, kein Training mit hochgeladenen Bildern.
        </p>
        <label htmlFor="image-prompt" className="mt-3 block text-sm">Bildbeschreibung</label>
        <textarea id="image-prompt" className="field mt-1 min-h-28 w-full" maxLength={1800}
          value={prompt} onChange={(e) => setPrompt(e.target.value)} />
        <label htmlFor="image-key" className="mt-3 block text-sm">Privater Bild-KI-Zugangsschlüssel</label>
        <input id="image-key" type="password" autoComplete="off" className="mt-1 min-h-11 w-full rounded-md border bg-background px-3"
          placeholder="Nur für diese Sitzung – wird nicht gespeichert" value={accessKey} onChange={(e) => setAccessKey(e.target.value)} />
        <button type="button" onClick={() => void generate()} disabled={loading || prompt.trim().length < 3 || !accessKey}
          className="mt-3 min-h-12 w-full rounded-md bg-primary px-4 py-2 font-bold text-primary-foreground disabled:opacity-50">
          {loading ? "Bild wird angefordert …" : "Bildgenerierung testen"}
        </button>
        {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
        {image && <div className="mt-3"><img src={image} alt="Erzeugtes Manga-Bild" className="w-full rounded-md" />
          <a href={image} download="mangaforge-bild.jpg" className="mt-2 inline-flex min-h-11 items-center rounded-md border px-3 py-2 text-sm">Bild herunterladen</a>
        </div>}
      </Card>
      <Card>
        <h2 className="text-base">Cloudflare Workers AI – Bildgenerierung vorbereiten</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Cloudflare Workers AI ist ein möglicher Anbieter für die spätere Bildgenerierung.
          Aktuell ist noch kein Bildmodell mit MangaForge verbunden. Modellverfügbarkeit,
          kostenlose Kontingente und Kosten hängen von deinem Cloudflare-Konto ab.
        </p>
        <div className="mt-3 space-y-2 text-sm text-muted-foreground">
          <p>1. Öffne dein Cloudflare-Dashboard und wähle Workers AI.</p>
          <p>2. Prüfe die verfügbaren Bildmodelle und die aktuellen Nutzungsgrenzen.</p>
          <p>3. Für die Anbindung verwenden wir später einen serverseitigen Worker-Endpunkt.
             API-Token gehören ausschließlich in Cloudflare-Secrets, niemals in dieses Formular oder in GitHub-Code.</p>
        </div>
        <a
          className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold"
          href="https://dash.cloudflare.com/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Cloudflare öffnen <ExternalLink className="h-4 w-4" />
        </a>
        <p className="mt-3 text-xs text-muted-foreground">
          Sicherheit: Die Schaltfläche öffnet nur Cloudflare. Sie verbindet noch keinen Provider und löst keine kostenpflichtige Generierung aus.
        </p>
      </Card>
      <Card>
        <h2 className="text-base">So wird später verbunden</h2>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
          <li>Provider wählen und dessen API-Schlüssel sicher hinterlegen (nie in der App selbst).</li>
          <li>Vorbereitete Aufträge (Status „Bereit“) werden dann serverseitig an den Provider gesendet.</li>
          <li>Ergebnisse landen direkt im jeweiligen Panel oder Shot; der Export-Status zeigt den echten Fortschritt.</li>
        </ol>
      </Card>
    </main>
  );
}