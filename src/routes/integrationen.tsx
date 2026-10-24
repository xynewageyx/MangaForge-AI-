import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { Card } from "@/components/studio";

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

function Integrations() {
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