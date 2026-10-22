import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Check, ChevronLeft, ChevronRight, Plus, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useProject, useStudio, uid } from "@/lib/store";
import { ConvertPage } from "@/components/convert";
import { validatePage } from "@/lib/storyboard";
import { Card, Field, PageView, CastChips } from "@/components/studio";
import { StoryboardView, StoryboardExportButtons } from "@/components/storyboard";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Search { schritt: number; figur?: string; seite?: string; szene?: string }

export const Route = createFileRoute("/p/$id/ablauf")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    schritt: Math.min(5, Math.max(1, Number(s["schritt"]) || 1)),
    figur: typeof s["figur"] === "string" ? s["figur"] : undefined,
    seite: typeof s["seite"] === "string" ? s["seite"] : undefined,
    szene: typeof s["szene"] === "string" ? s["szene"] : undefined,
  }),
  component: Workflow,
});

const steps = ["Figur", "Seite", "Prüfung", "Anime", "Storyboard"];

function Workflow() {
  const { id } = Route.useParams();
  const search = Route.useSearch();
  const nav = useNavigate({ from: Route.fullPath });
  const p = useProject(id)!;
  const update = useStudio((s) => s.update);
  const [panelId, setPanelId] = useState<string>();
  const [epKey, setEpKey] = useState("0:0");

  // Each step is a history entry, so Android's back button walks back through the workflow.
  const go = (patch: Partial<Search>) => nav({ search: (prev: Search) => ({ ...prev, ...patch }) });
  const char = p.characters.find((c) => c.id === search.figur);
  const pages = p.volumes.flatMap((v, vi) => v.pages.map((pg, i) => ({ pg, vi, i, label: `${v.title} · Seite ${i + 1}` })));
  const loc = pages.find((x) => x.pg.id === search.seite);
  const issues = loc ? validatePage(p, loc.pg.id) : [];
  const errors = issues.filter((i) => i.level === "fehler");
  const scene = p.seasons.flatMap((s) => s.episodes.flatMap((e) => e.scenes)).find((s) => s.id === search.szene);
  const panelIdx = loc ? loc.pg.panels.findIndex((x) => x.id === panelId) : -1;
  const panel = panelIdx >= 0 ? loc!.pg.panels[panelIdx] : undefined;
  const upPanel = (fn: (x: NonNullable<typeof panel>) => void) =>
    update(id, (d) => fn(d.volumes[loc!.vi].pages[loc!.i].panels[panelIdx]));

  const can = [true, !!char, !!loc, !!loc && errors.length === 0, !!scene];
  let step = 1;
  while (step < search.schritt && can[step]) step++;

  return (
    <div className="space-y-4">
      <ol className="grid grid-cols-5 gap-1">
        {steps.map((s, i) => (
          <li key={s}>
            <button disabled={!can.slice(0, i + 1).every(Boolean)} onClick={() => go({ schritt: i + 1 })}
              className={cn("flex min-h-12 w-full flex-col items-center justify-center rounded text-[10px] disabled:opacity-40",
                step === i + 1 ? "bg-primary text-primary-foreground" : step > i + 1 ? "bg-secondary text-ok" : "bg-secondary")}>
              <span className="text-sm font-bold">{step > i + 1 ? <Check className="h-4 w-4" /> : i + 1}</span>{s}
            </button>
          </li>
        ))}
      </ol>

      {step === 1 && (
        <Card className="space-y-3">
          <h2 className="text-xl">1 · Figur auswählen</h2>
          {p.characters.map((c) => (
            <button key={c.id} onClick={() => go({ figur: c.id, schritt: 2 })}
              className={cn("flex min-h-14 w-full items-center gap-3 rounded border p-3 text-left", c.id === search.figur && "border-primary bg-primary/10")}>
              <span className="h-5 w-5 rounded-full" style={{ background: c.eyeColor, boxShadow: `0 0 8px ${c.eyeColor}` }} />
              <span className="flex-1"><b className="font-mono">{c.code}</b> {c.name}<span className="block text-xs text-muted-foreground">{c.role} · {c.refImages.length} Referenzbilder</span></span>
              <ChevronRight className="h-5 w-5" />
            </button>
          ))}
          {!p.characters.length && <Link to="/p/$id/figuren" params={{ id }} className="text-primary underline">Erst eine Figur anlegen</Link>}
        </Card>
      )}

      {step === 2 && char && (
        <Card className="space-y-3">
          <h2 className="text-xl">2 · Manga-Seite bearbeiten</h2>
          <p className="text-xs text-muted-foreground">Aktive Figur: <b>{char.code} {char.name}</b>. Tippe ein Panel an, um Figur, Bildinhalt und Dialoge zu bearbeiten.</p>
          <select className="field" value={search.seite ?? ""} onChange={(e) => { setPanelId(undefined); go({ seite: e.target.value || undefined }); }}>
            <option value="">Seite wählen …</option>
            {pages.map((x) => <option key={x.pg.id} value={x.pg.id}>{x.label}</option>)}
          </select>
          {loc && (
            <>
              <div className="mx-auto max-w-sm"><PageView page={loc.pg} lang="DE" chars={p.characters} activePanel={panelId} onPanel={setPanelId} highlightEmpty /></div>
              {panel && (
                <div className="space-y-3 rounded border p-3">
                  <h3 className="text-base">Panel {panelIdx + 1}</h3>
                  <CastChips ids={panel.cast} chars={p.characters} />
                  <label className="flex min-h-11 items-center gap-2 text-sm">
                    <input type="checkbox" className="h-5 w-5" checked={panel.cast.includes(char.id)}
                      onChange={(e) => upPanel((x) => { x.cast = e.target.checked ? [...x.cast, char.id] : x.cast.filter((c) => c !== char.id); })} />
                    {char.name} ist in diesem Panel
                  </label>
                  <Field label="Bildinhalt"><textarea className="field" rows={2} value={panel.description} onChange={(e) => upPanel((x) => { x.description = e.target.value; })} /></Field>
                  {panel.bubbles.map((b, bi) => (
                    <div key={b.id} className="space-y-2 rounded bg-muted/40 p-2">
                      <p className="text-xs text-muted-foreground">Blase {bi + 1} · {p.characters.find((c) => c.id === b.speakerId)?.name ?? "ohne Sprecher"}</p>
                      <input className="field" placeholder="Text Deutsch" value={b.textDe} onChange={(e) => upPanel((x) => { x.bubbles[bi].textDe = e.target.value; })} />
                      <input className="field" placeholder="Text English" value={b.textEn} onChange={(e) => upPanel((x) => { x.bubbles[bi].textEn = e.target.value; })} />
                    </div>
                  ))}
                  <Button variant="secondary" className="min-h-11 w-full" onClick={() => upPanel((x) => {
                    x.bubbles.push({ id: uid(), type: "sprechen", speakerId: char.id, textDe: "", textEn: "", x: 10, y: 60 });
                    if (!x.cast.includes(char.id)) x.cast.push(char.id);
                  })}><Plus /> Dialog für {char.name}</Button>
                  <Link to="/p/$id/manga" params={{ id }} className="block text-center text-xs text-muted-foreground underline">Layout, Effekte & Bild im vollen Editor</Link>
                </div>
              )}
              <Button className="min-h-12 w-full" onClick={() => go({ schritt: 3 })}>Weiter zur Prüfung <ChevronRight /></Button>
            </>
          )}
        </Card>
      )}

      {step === 3 && loc && (
        <Card className="space-y-3">
          <h2 className="text-xl">3 · Prüfung {loc.label}</h2>
          {issues.length === 0 && <p className="flex items-center gap-2 text-ok"><CheckCircle2 className="h-5 w-5" /> Seite vollständig.</p>}
          <ul className="space-y-1 text-sm">
            {issues.map((i, k) => (
              <li key={k} className={i.level === "fehler" ? "text-destructive" : "text-warn"}>{i.level === "fehler" ? "✗ Fehler" : "! Hinweis"}: {i.message.replace(`${loc.label.split(" · ")[0]} S.${loc.i + 1} `, "")}</li>
            ))}
          </ul>
          {errors.length > 0 ? (
            <div className="space-y-2">
              <p className="flex items-center gap-2 text-sm"><AlertTriangle className="h-4 w-4 text-destructive" /> Fehler blockieren die Umwandlung. Hinweise (z. B. fehlende Bilder) nicht.</p>
              <Button className="min-h-12 w-full" variant="secondary" onClick={() => go({ schritt: 2 })}><ChevronLeft /> Zurück und beheben</Button>
            </div>
          ) : (
            <Button className="min-h-12 w-full" onClick={() => go({ schritt: 4 })}>Weiter zur Anime-Szene <ChevronRight /></Button>
          )}
        </Card>
      )}

      {step === 4 && loc && (
        <Card className="space-y-3">
          <h2 className="text-xl">4 · Anime-Szene erzeugen</h2>
          <p className="text-xs text-muted-foreground">Regelbasierte Umwandlung: ein Shot pro Panel, Dialoge werden Untertitel DE/EN, Figuren-IDs und Einstellungen werden übernommen. Es wird kein Video erzeugt.</p>
          <Field label="Ziel-Episode">
            <select className="field" value={epKey} onChange={(e) => setEpKey(e.target.value)}>
              {p.seasons.flatMap((s, si) => s.episodes.map((e, ei) => <option key={e.id} value={`${si}:${ei}`}>{s.title} · {e.title}</option>))}
            </select>
          </Field>
          <ConvertPage project={p} pageId={loc.pg.id} season={Number(epKey.split(":")[0])} episode={Number(epKey.split(":")[1])}
            onDone={(sid) => go({ szene: sid, schritt: 5 })} />
        </Card>
      )}

      {step === 5 && scene && (
        <Card className="space-y-3">
          <h2 className="text-xl">5 · Storyboard</h2>
          <StoryboardExportButtons project={p} scene={scene} />
          <StoryboardView project={p} scene={scene} />
          <div className="grid grid-cols-2 gap-2">
            <Button asChild variant="secondary" className="min-h-11"><Link to="/p/$id/anime" params={{ id }}>Shots bearbeiten</Link></Button>
            <Button className="min-h-11" onClick={() => { setPanelId(undefined); nav({ search: { schritt: 1 } }); }}>Neuer Durchlauf</Button>
          </div>
        </Card>
      )}
    </div>
  );
}