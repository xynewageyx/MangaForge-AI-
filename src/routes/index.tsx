import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Trash2, PlugZap, RotateCcw, Download, Upload } from "lucide-react";
import { useStudio } from "@/lib/store";
import { downloadBackup, parseBackup } from "@/lib/backup";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Projekte — MangaForge AI" },
      { name: "description", content: "Deine Manga- und Anime-Projekte in MangaForge AI." },
      { property: "og:title", content: "Projekte — MangaForge AI" },
      { property: "og:description", content: "Manga- und Anime-Produktionsstudio für Android." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const { projects, addProject, deleteProject, resetDemo, restoreProjects, hydrated } = useStudio();
  const [title, setTitle] = useState("");
  const nav = useNavigate();
  return (
    <main className="mx-auto max-w-2xl px-4 pb-16 pt-8">
      <header className="mb-8">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-primary">Studio</p>
        <h1 className="text-4xl leading-none">MangaForge<span className="text-primary"> AI</span></h1>
        <p className="mt-2 text-sm text-muted-foreground">Manga zeichnen, zu Anime storyboarden — alles auf deinem Gerät gespeichert.</p>
      </header>

      <form
        className="mb-6 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!title.trim()) return;
          const id = addProject(title.trim());
          setTitle("");
          nav({ to: "/p/$id", params: { id } });
        }}
      >
        <input className="field" placeholder="Titel für neues Projekt" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Button type="submit"><Plus /> Neu</Button>
      </form>

      <ul className="space-y-3">
        {projects.map((p) => (
          <li key={p.id} className="flex items-stretch overflow-hidden rounded-lg border bg-card">
            <div className="w-2" style={{ background: p.cover.accent }} />
            <Link to="/p/$id" params={{ id: p.id }} className="flex-1 p-4">
              <h2 className="text-lg">{p.title}</h2>
              <p className="line-clamp-2 text-sm text-muted-foreground">{p.logline || "Noch keine Logline"}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                {p.characters.length} Figuren · {p.volumes.reduce((n, v) => n + v.pages.length, 0)} Seiten ·{" "}
                {p.seasons.reduce((n, s) => n + s.episodes.length, 0)} Episoden
              </p>
            </Link>
            <button
              aria-label="Projekt löschen"
              className="px-4 text-muted-foreground hover:text-destructive"
              onClick={() => confirm(`„${p.title}“ löschen?`) && deleteProject(p.id)}
            >
              <Trash2 className="h-5 w-5" />
            </button>
          </li>
        ))}
      </ul>

      <section className="mt-8 space-y-3 rounded-lg border bg-card p-4">
        <h2 className="text-lg font-bold">Datensicherung</h2>
        <p className="text-sm text-muted-foreground">Alle Projekte inklusive Figuren, Bilder und Anime-Szenen als JSON sichern.</p>
        <Button className="min-h-12 w-full" disabled={!hydrated} onClick={() => downloadBackup(projects)}><Download /> Sicherung herunterladen</Button>
        <label className="flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-md border p-3">
          <Upload className="h-4 w-4" /> Sicherung wiederherstellen
          <input type="file" accept=".json,application/json" className="sr-only" disabled={!hydrated}
            onChange={async (e) => {
              const file = e.currentTarget.files?.[0];
              e.currentTarget.value = "";
              if (!file) return;
              if (file.size > 100 * 1024 * 1024) { toast.error("Datei zu groß (maximal 100 MB)."); return; }
              try {
                const result = parseBackup(await file.text());
                if (!result.ok) { toast.error(result.error); return; }
                const replace = confirm("Alle vorhandenen Projekte ERSETZEN? OK = Ersetzen, Abbrechen = weitere Auswahl.");
                const mode = replace ? "ersetzen" : confirm("Stattdessen Projekte ZUSAMMENFÜHREN?") ? "zusammenfuehren" : null;
                if (!mode) return;
                restoreProjects(result.projects, mode);
                toast.success(result.projects.length + " Projekte wiederhergestellt");
                result.warnings.forEach((warning) => toast.warning(warning));
              } catch { toast.error("Sicherungsdatei konnte nicht gelesen werden."); }
            }} />
        </label>
        <p className="text-xs text-muted-foreground">Ersetzen überschreibt alle lokalen Projekte. Zusammenführen übernimmt importierte Projekte bei gleichen IDs.</p>
      </section>
      <div className="mt-8 flex flex-wrap gap-2">
        <Button variant="secondary" onClick={resetDemo}><RotateCcw /> Demo-Projekt zurücksetzen</Button>
        <Button variant="secondary" asChild><Link to="/integrationen"><PlugZap /> KI-Integrationen</Link></Button>
      </div>
    </main>
  );
}