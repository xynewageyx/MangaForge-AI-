import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Trash2, AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react";
import { useProject, useStudio, uid, newPage, newPanel, type BubbleType, type PanelFx } from "@/lib/store";
import { Card, Field, PageView, ProviderNotice, ValidationList, LayoutThumb, CastPicker } from "@/components/studio";
import { LAYOUTS, layoutCount } from "@/lib/layouts";
import { Button } from "@/components/ui/button";
import { fileToDataUrl } from "@/lib/image";

export const Route = createFileRoute("/p/$id/manga")({ component: MangaEditor });

const shotTypes = ["Totale", "Halbtotale", "Amerikanisch", "Nahaufnahme", "Detail", "Vogelperspektive", "Froschperspektive"];

function MangaEditor() {
  const { id } = Route.useParams();
  const p = useProject(id)!;
  const update = useStudio((s) => s.update);
  const [vi, setVi] = useState(0);
  const [pi, setPi] = useState(0);
  const [panelId, setPanelId] = useState<string>();
  const [lang, setLang] = useState<"DE" | "EN">("DE");
  const [aiKey, setAiKey] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function saveProject() {
    setSaving(true);
    setSaveMessage("");
    try {
      const options = useStudio.persist.getOptions();
      if (!options.storage || !options.name) throw new Error("Lokaler Speicher ist nicht verfügbar.");
      const state = useStudio.getState();
      await options.storage.setItem(options.name, {
        state: { projects: state.projects, syncBases: state.syncBases },
        version: options.version ?? 0,
      });
      setSaveMessage("Projekt auf diesem Gerät gespeichert.");
    } catch (error) {
      setSaveMessage("Speichern fehlgeschlagen: " + (error instanceof Error ? error.message : "Unbekannter Fehler"));
    } finally { setSaving(false); }
  }

  const vol = p.volumes[Math.min(vi, p.volumes.length - 1)];
  const vIdx = p.volumes.indexOf(vol);
  const page = vol?.pages[Math.min(pi, vol.pages.length - 1)];
  const pgIdx = page ? vol.pages.indexOf(page) : -1;
  const nIdx = page ? page.panels.findIndex((x) => x.id === panelId) : -1;
  const panel = nIdx >= 0 ? page!.panels[nIdx] : undefined;

  async function generatePanelImage() {
    if (!panel || !page || !vol || aiBusy) return;
    const target = { volumeId: vol.id, pageId: page.id, panelId: panel.id };
    const description = panel.description.trim();
    if (!description || !aiKey) { setAiError("Bitte Bildbeschreibung und privaten Zugangsschlüssel eingeben."); return; }
    if (panel.image && !window.confirm("Dieses Panel hat bereits ein Bild. Soll die KI es durch ein neues Bild ersetzen?")) return;
    const characters = p.characters.filter((ch) => panel.cast.includes(ch.id))
      .map((ch) => [ch.code, ch.name, ch.description, "eye color " + ch.eyeColor, ...ch.refImages.filter((r) => r.use !== "anime" && r.note).map((r) => r.kind + ": " + r.note)].join(", ")).join("; ");
    const prompt = [
      panel.bw ? "Detailed black and white manga ink illustration" : "Detailed manga illustration",
      "Consistent recurring character appearance across manga panels",
      "Single panel artwork, no lettering, no speech bubbles, no text, no watermark",
      panel.shotType, description,
      characters ? "Characters: " + characters : "",
      panel.fx === "speedlines" ? "dynamic action speed lines" : "",
      panel.fx === "magie" ? "dramatic magical energy effects in " + panel.fxColor : "",
      panel.eyeColor ? "glowing eyes in " + panel.eyeColor : "",
    ].filter(Boolean).join(". ").slice(0, 1800);
    setAiBusy(true); setAiError("");
    try {
      const response = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "content-type": "application/json", "x-mangaforge-ai-key": aiKey },
        body: JSON.stringify({ prompt }),
      });
      const data = await response.json() as { image?: unknown; error?: unknown };
      if (!response.ok || typeof data.image !== "string" || !data.image.startsWith("data:image/")) {
        throw new Error(typeof data.error === "string" ? data.error : "Bildgenerierung fehlgeschlagen (HTTP " + response.status + ").");
      }
      const current = useStudio.getState().projects.find((project) => project.id === id);
      const stillExists = current?.volumes.some((volume) => volume.id === target.volumeId &&
        volume.pages.some((pg) => pg.id === target.pageId && pg.panels.some((pn) => pn.id === target.panelId)));
      if (!stillExists) throw new Error("Das ursprüngliche Panel existiert nicht mehr.");
      update(id, (draft) => {
        const selected = draft.volumes.find((volume) => volume.id === target.volumeId)
          ?.pages.find((pg) => pg.id === target.pageId)?.panels.find((pn) => pn.id === target.panelId);
        if (selected) selected.image = data.image as string;
      });
      await saveProject();
    } catch (error) {
      setAiError(error instanceof Error ? error.message : "Unbekannter Fehler bei der Bildgenerierung.");
    } finally { setAiBusy(false); }
  }

  const upPanel = (fn: (x: NonNullable<typeof panel>) => void) =>
    update(id, (d) => fn(d.volumes[vIdx].pages[pgIdx].panels[nIdx]));

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <select className="field" value={vIdx} onChange={(e) => { setVi(+e.target.value); setPi(0); }}>
          {p.volumes.map((v, i) => <option key={v.id} value={i}>{v.title}</option>)}
        </select>
        <Button variant="secondary" onClick={() => { update(id, (d) => { d.volumes.push({ id: uid(), title: `Band ${d.volumes.length + 1}`, pages: [newPage()] }); }); setVi(p.volumes.length); setPi(0); }}>
          <Plus /> Band
        </Button>
      </div>
      {vol && (
        <input className="field" value={vol.title} aria-label="Bandtitel" onChange={(e) => update(id, (d) => { d.volumes[vIdx].title = e.target.value; })} />
      )}

      <div className="flex flex-wrap items-center gap-2 rounded-md border p-2">
        <Button type="button" className="min-h-11" onClick={() => void saveProject()} disabled={saving}>
          {saving ? "Speichert …" : "Projekt jetzt speichern"}
        </Button>
        <span role="status" className="text-xs text-muted-foreground">{saveMessage || "Änderungen werden normalerweise automatisch gespeichert."}</span>
      </div>

      <ValidationList project={p} area="Manga" />

      {vol && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {vol.pages.map((pg, i) => (
            <button key={pg.id} onClick={() => { setPi(i); setPanelId(undefined); }}
              className={`shrink-0 rounded border-2 px-3 py-2 text-sm ${i === pgIdx ? "border-primary text-primary" : "border-border"}`}>
              S. {i + 1}
            </button>
          ))}
          <Button size="sm" variant="secondary" onClick={() => { update(id, (d) => { d.volumes[vIdx].pages.push(newPage()); }); setPi(vol.pages.length); }}>
            <Plus /> Seite
          </Button>
        </div>
      )}

      {page && (
        <>
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
            {LAYOUTS.map((l) => (
              <button key={l.id} aria-label={`Layout ${l.label}`} onClick={() => {
                const n = layoutCount(l.id);
                const lost = page.panels.slice(n).filter((x) => x.image || x.bubbles.length || x.description).length;
                if (lost && !confirm(`${lost} Panel(s) mit Inhalt würden entfernt. Fortfahren?`)) return;
                update(id, (d) => {
                  const pg = d.volumes[vIdx].pages[pgIdx];
                  pg.layout = l.id;
                  while (pg.panels.length < n) pg.panels.push(newPanel());
                  pg.panels = pg.panels.slice(0, n);
                });
              }} className={`flex min-w-16 shrink-0 flex-col items-center gap-1 rounded border p-2 text-[10px] ${page.layout === l.id ? "border-primary text-primary" : ""}`}>
                <LayoutThumb id={l.id} />{l.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <div className="ml-auto flex rounded border text-xs">
              {(["DE", "EN"] as const).map((l) => (
                <button key={l} onClick={() => setLang(l)} className={`px-3 py-1 ${lang === l ? "bg-primary text-primary-foreground" : ""}`}>{l}</button>
              ))}
            </div>
          </div>
          <div className="mx-auto max-w-md">
            <PageView page={page} lang={lang} chars={p.characters} activePanel={panelId} onPanel={setPanelId} highlightEmpty />
          </div>
          <div className="flex justify-between text-sm">
            <Button size="sm" variant="ghost" disabled={pgIdx === 0} onClick={() => setPi(pgIdx - 1)}><ChevronLeft /> Zurück</Button>
            <Button size="sm" variant="ghost" className="text-destructive" disabled={vol.pages.length < 2}
              onClick={() => confirm("Seite löschen?") && (update(id, (d) => { d.volumes[vIdx].pages.splice(pgIdx, 1); }), setPi(Math.max(0, pgIdx - 1)))}>
              <Trash2 /> Seite löschen
            </Button>
            <Button size="sm" variant="ghost" disabled={pgIdx >= vol.pages.length - 1} onClick={() => setPi(pgIdx + 1)}>Weiter <ChevronRight /></Button>
          </div>
          {!panel && <p className="text-center text-sm text-muted-foreground">Tippe auf ein Panel, um es zu bearbeiten.</p>}
        </>
      )}

      {panel && (
        <Card className="space-y-3">
          <h3 className="text-lg">Panel {nIdx + 1}</h3>
          <Field label="Beschreibung / Bildinhalt">
            <textarea className="field" rows={2} value={panel.description} onChange={(e) => upPanel((x) => { x.description = e.target.value; })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Einstellung">
              <select className="field" value={panel.shotType} onChange={(e) => upPanel((x) => { x.shotType = e.target.value; })}>
                {shotTypes.map((s) => <option key={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Effekt">
              <select className="field" value={panel.fx} onChange={(e) => upPanel((x) => { x.fx = e.target.value as PanelFx; })}>
                <option value="keiner">Keiner</option><option value="magie">Magieeffekt (farbig)</option>
                <option value="speedlines">Speedlines (Action)</option><option value="screentone">Rasterton</option>
              </select>
            </Field>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" checked={panel.bw} onChange={(e) => upPanel((x) => { x.bw = e.target.checked; })} /> Schwarzweiß</label>
            {panel.fx === "magie" && <label className="flex items-center gap-2">Magiefarbe <input type="color" value={panel.fxColor} onChange={(e) => upPanel((x) => { x.fxColor = e.target.value; })} /></label>}
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={!!panel.eyeColor} onChange={(e) => upPanel((x) => { x.eyeColor = e.target.checked ? p.characters[0]?.eyeColor ?? "#e8364a" : undefined; })} /> Farbige Augen
            </label>
            {panel.eyeColor && <input type="color" value={panel.eyeColor} onChange={(e) => upPanel((x) => { x.eyeColor = e.target.value; })} />}
          </div>
          <Field label="Panel-Bild (eigene Zeichnung hochladen)">
            <input type="file" accept="image/*" className="text-sm" onChange={async (e) => {
              const f = e.target.files?.[0]; if (!f) return;
              const url = await fileToDataUrl(f);
              upPanel((x) => { x.image = url; });
            }} />
          </Field>
          {panel.image && (
            <div className="space-y-2 rounded-md border p-3">
              <h4 className="font-semibold">Bild als Figurenreferenz übernehmen</h4>
              <p className="text-xs text-muted-foreground">Speichert dieses Panel-Bild zusätzlich bei der gewählten Figur. Wenn mehrere Figuren zu sehen sind, zeigt die Referenz weiterhin das ganze Panel. Das aktuelle KI-Modell kann die Bilddatei noch nicht als direkte Vorlage verwenden.</p>
              {p.characters.filter((ch) => panel.cast.includes(ch.id)).map((ch) => (
                <Button key={ch.id} type="button" size="sm" variant="secondary" className="min-h-11 w-full"
                  onClick={() => {
                    const image = panel.image;
                    if (!image) return;
                    update(id, (draft) => {
                      const character = draft.characters.find((item) => item.id === ch.id);
                      if (!character) return;
                      if (character.refImages.some((ref) => ref.src === image)) return;
                      character.refImages.push({
                        id: uid(), src: image, kind: "Front", use: "manga",
                        note: "Panelreferenz für " + character.name + ": " + panel.description.slice(0, 140),
                      });
                    });
                    setSaveMessage("Referenz für " + ch.name + " hinzugefügt. Änderungen werden automatisch gespeichert.");
                  }}>
                  Referenz für {ch.name} speichern
                </Button>
              ))}
              {panel.cast.length === 0 && <p className="text-xs text-muted-foreground">Ordne zuerst unter „Figuren im Panel“ eine Figur zu.</p>}
            </div>
          )}
          {panel.image && <Button size="sm" variant="ghost" onClick={() => upPanel((x) => { x.image = undefined; })}>Bild entfernen</Button>}
          <Field label="Figuren im Panel (feste IDs)">
            <CastPicker value={panel.cast} chars={p.characters} use="manga" onChange={(v) => upPanel((x) => { x.cast = v; })} />
          </Field>
          <div className="space-y-2 rounded-md border p-3">
            <h4 className="font-semibold">KI-Bild für dieses Panel</h4>
            <p className="text-xs text-muted-foreground">Die Beschreibung oben wird als Bildauftrag verwendet. Das Ergebnis wird automatisch diesem Panel zugeordnet und lokal im Projekt gespeichert. KI-Aufrufe können Kosten verursachen.</p>
            <label htmlFor="panel-ai-key" className="block text-sm">Privater Bild-KI-Zugangsschlüssel</label>
            <input id="panel-ai-key" type="password" autoComplete="off" className="field min-h-11"
              placeholder="Nicht dauerhaft gespeichert" value={aiKey} onChange={(e) => setAiKey(e.target.value)} />
            <Button className="min-h-11 w-full" disabled={aiBusy || !panel.description.trim() || !aiKey}
              onClick={() => void generatePanelImage()}>
              {aiBusy ? "Panel-Bild wird erzeugt …" : "KI-Bild erzeugen und ins Panel übernehmen"}
            </Button>
            <p className="text-xs text-muted-foreground">Hinweis: Das aktuelle Bildmodell verwendet Figurenbeschreibungen und Referenznotizen, aber noch keine hochgeladenen Referenzbilder. Bestehende Panel-Bilder werden nur nach Bestätigung ersetzt.</p>
            {aiError && <p role="alert" className="text-sm text-destructive">{aiError}</p>}
          </div>

          <div className="flex items-center justify-between pt-2">
            <h3 className="text-lg">Sprechblasen</h3>
            <Button size="sm" onClick={() => upPanel((x) => { x.bubbles.push({ id: uid(), type: "sprechen", textDe: "", textEn: "", x: 10, y: 10 }); })}><Plus /> Blase</Button>
          </div>
          {panel.bubbles.map((b, bi) => (
            <div key={b.id} className={`space-y-2 rounded border p-3 ${!b.textDe.trim() || !b.textEn.trim() ? "border-destructive/60" : ""}`}>
              <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
                <select className="field" value={b.type} onChange={(e) => upPanel((x) => { x.bubbles[bi].type = e.target.value as BubbleType; })}>
                  <option value="sprechen">Sprechen</option><option value="denken">Denken</option><option value="schrei">Schrei</option><option value="erzaehler">Erzähler</option>
                </select>
                <select className="field" value={b.speakerId ?? ""} onChange={(e) => upPanel((x) => { x.bubbles[bi].speakerId = e.target.value || undefined; })}>
                  <option value="">— Sprecher —</option>
                  {p.characters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <button aria-label="Blase löschen" onClick={() => upPanel((x) => { x.bubbles.splice(bi, 1); })}><Trash2 className="h-4 w-4" /></button>
              </div>
              <input className="field" placeholder="Text Deutsch" value={b.textDe} onChange={(e) => upPanel((x) => { x.bubbles[bi].textDe = e.target.value; })} />
              <input className="field" placeholder="Text English" value={b.textEn} onChange={(e) => upPanel((x) => { x.bubbles[bi].textEn = e.target.value; })} />
              <div className="grid grid-cols-2 gap-3 text-xs">
                <label>Horizontal<input type="range" min={0} max={85} value={b.x} className="w-full accent-primary" onChange={(e) => upPanel((x) => { x.bubbles[bi].x = +e.target.value; })} /></label>
                <label>Vertikal<input type="range" min={0} max={85} value={b.y} className="w-full accent-primary" onChange={(e) => upPanel((x) => { x.bubbles[bi].y = +e.target.value; })} /></label>
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}