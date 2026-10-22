import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { ArrowLeft, Route as RouteIcon, BookOpen, Users, LayoutGrid, Clapperboard, Download } from "lucide-react";
import { useProject } from "@/lib/store";
import { ProviderStrip } from "@/components/studio";

export const Route = createFileRoute("/p/$id")({
  head: () => ({
    meta: [
      { title: "Projekt — MangaForge AI" },
      { name: "description", content: "Manga- und Anime-Projekt bearbeiten." },
      { property: "og:title", content: "Projekt — MangaForge AI" },
      { property: "og:description", content: "Manga- und Anime-Projekt bearbeiten." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProjectLayout,
});

const tabs = [
  { to: "/p/$id/ablauf", label: "Ablauf", icon: RouteIcon },
  { to: "/p/$id", label: "Story", icon: BookOpen, exact: true },
  { to: "/p/$id/figuren", label: "Figuren", icon: Users },
  { to: "/p/$id/manga", label: "Manga", icon: LayoutGrid },
  { to: "/p/$id/anime", label: "Anime", icon: Clapperboard },
  { to: "/p/$id/export", label: "Export", icon: Download },
] as const;

function ProjectLayout() {
  const { id } = Route.useParams();
  const project = useProject(id);
  if (!project) {
    return (
      <div className="p-8 text-center">
        <p>Projekt nicht gefunden.</p>
        <Link to="/" className="text-primary underline">Zur Übersicht</Link>
      </div>
    );
  }
  return (
    <div className="min-h-screen pb-24">
      <header className="sticky top-0 z-20 bg-background/95 backdrop-blur">
        <div className="flex items-center gap-3 border-b px-2 py-1">
          <Link to="/" aria-label="Zurück" className="flex h-11 w-11 items-center justify-center"><ArrowLeft className="h-5 w-5" /></Link>
          <h1 className="truncate text-lg">{project.title}</h1>
        </div>
        <ProviderStrip />
      </header>
      <main className="mx-auto max-w-3xl px-4 pt-4"><Outlet /></main>
      <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-6 border-t bg-card pb-[env(safe-area-inset-bottom)]">
        {tabs.map((t) => (
          <Link
            key={t.to}
            to={t.to}
            params={{ id }}
            activeOptions={{ exact: "exact" in t }}
            className="flex min-h-14 flex-col items-center justify-center gap-1 py-2 text-[11px] text-muted-foreground data-[status=active]:text-primary"
          >
            <t.icon className="h-5 w-5" />
            {t.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}