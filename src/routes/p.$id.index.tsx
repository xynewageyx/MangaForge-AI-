import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { useState } from "react";
import { useProject, useStudio, type Project } from "@/lib/store";
import { Card, Field, ProviderNotice, CoverView } from "@/components/studio";
import { fileToDataUrl } from "@/lib/image";

export const Route = createFileRoute("/p/$id/")({ component: StoryPage });


function StoryPage() {
  const { id } = Route.useParams();
  const p = useProject(id)!;
  const update = useStudio((s) => s.update);
  const [lang, setLang] = useState<"DE" | "EN">("DE");
  const set = (fn: (d: Project) => void) => update(id, fn);

  return (
    <div className="space-y-4">
      <Link to="/p/$id/ablauf" params={{ id }} search={{ schritt: 1 }} className="flex min-h-14 items-center justify-between rounded-lg bg-primary px-4 text-primary-foreground">
        <span><b>Geführter Ablauf</b><span className="block text-xs opacity-80">Figur → Manga-Seite → Prüfung → Anime-Szene → Storyboard</span></span>
        <ChevronRight />
      </Link>
      <Card className="space-y-3">
        <h2 className="text-xl">Projekt</h2>
        <Field label="Titel"><input className="field" value={p.title} onChange={(e) => set((d) => { d.title = e.target.value; })} /></Field>
        <Field label="Genre"><input className="field" value={p.genre} onChange={(e) => set((d) => { d.genre = e.target.value; })} /></Field>
        <Field label="Logline"><textarea className="field" rows={2} value={p.logline} onChange={(e) => set((d) => { d.logline = e.target.value; })} /></Field>
      </Card>

      <Card className="space-y-3">
        <h2 className="text-xl">Story-Bibel</h2>
        {([["world", "Welt & Schauplätze"], ["magic", "Magiesystem"], ["themes", "Themen"], ["timeline", "Zeitleiste der Handlung"]] as const).map(([k, l]) => (
          <Field key={k} label={l}>
            <textarea className="field" rows={3} value={p.bible[k]} onChange={(e) => set((d) => { d.bible[k] = e.target.value; })} />
          </Field>
        ))}
      </Card>

      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl">Cover</h2>
          <div className="flex rounded border text-xs">
            {(["DE", "EN"] as const).map((l) => (
              <button key={l} onClick={() => setLang(l)} className={`px-3 py-1 ${lang === l ? "bg-primary text-primary-foreground" : ""}`}>{l}</button>
            ))}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div id="cover-preview" className="mx-auto w-full max-w-xs"><CoverView p={p} lang={lang} /></div>
          <div className="space-y-3">
            <Field label="Titel DE"><input className="field" value={p.cover.titleDe} onChange={(e) => set((d) => { d.cover.titleDe = e.target.value; })} /></Field>
            <Field label="Titel EN"><input className="field" value={p.cover.titleEn} onChange={(e) => set((d) => { d.cover.titleEn = e.target.value; })} /></Field>
            <Field label="Untertitel"><input className="field" value={p.cover.subtitle} onChange={(e) => set((d) => { d.cover.subtitle = e.target.value; })} /></Field>
            <Field label="Akzentfarbe"><input type="color" className="h-10 w-full" value={p.cover.accent} onChange={(e) => set((d) => { d.cover.accent = e.target.value; })} /></Field>
            <Field label="Cover-Bild hochladen">
              <input type="file" accept="image/*" className="text-sm" onChange={async (e) => {
                const f = e.target.files?.[0]; if (!f) return;
                const url = await fileToDataUrl(f, 1200);
                set((d) => { d.cover.image = url; });
              }} />
            </Field>
            <ProviderNotice what="Cover-Generierung" />
          </div>
        </div>
      </Card>
    </div>
  );
}