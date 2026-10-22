import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Trash2, PlugZap, RotateCcw } from "lucide-react";
import { useStudio } from "@/lib/store";
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
  const { projects, addProject, deleteProject, resetDemo } = useStudio();
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

      <div className="mt-8 flex flex-wrap gap-2">
        <Button variant="secondary" onClick={resetDemo}><RotateCcw /> Demo-Projekt zurücksetzen</Button>
        <Button variant="secondary" asChild><Link to="/integrationen"><PlugZap /> KI-Integrationen</Link></Button>
      </div>
    </main>
  );
}