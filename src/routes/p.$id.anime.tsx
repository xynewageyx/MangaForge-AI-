import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Trash2, Wand2, Send, Swords, Download } from "lucide-react";
import { ConvertPage } from "@/components/convert";
import { useProject, useStudio, uid, newScene, newShot, pageToScene, jobStatusLabel, type Shot, type Episode, type JobStatus } from "@/lib/store";

const statusStyle: Record<JobStatus, string> = { entwurf: "bg-secondary text-muted-foreground", in_pruefung: "bg-accent text-accent-foreground", bereit: "bg-ok/20 text-ok", provider_fehlt: "bg-warn/20 text-warn" };
import { Card, Field, ProviderNotice, CastPicker, ValidationList } from "@/components/studio";
import { StoryboardExportButtons, StoryboardView } from "@/components/storyboard";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/p/$id/anime")({ component: AnimeStudio });

const cameras = ["Statisch", "Schwenk", "Neigung", "Kamerafahrt seitlich", "Langsamer Zoom rein", "Crash-Zoom", "Kreisfahrt 360°", "Handkamera / Wackeln", "Dolly-Zoom"];
const sizes = ["Totale", "Halbtotale", "Amerikanisch", "Nahaufnahme", "Detail", "Vogelperspektive", "Froschperspektive"];

function srtTime(s: number) {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = Math.floor(s % 60), ms = Math.round((s % 1) * 1000);
  const z = (n: number, l = 2) => String(n).padStart(l, "0");
  return `${z(h)}:${z(m)}:${z(sec)},${z(ms, 3)}`;
}
export function episodeToSrt(ep: Episode, lang: "DE" | "EN") {
  let t = 0, n = 0;
  const out: string[] = [];
  ep.scenes.forEach((sc) => sc.shots.forEach((sh) => {
    const text = lang === "DE" ? sh.subtitleDe : sh.subtitleEn;
    if (text.trim()) out.push(`${++n}\n${srtTime(t)} --> ${srtTime(t + sh.duration)}\n${text}\n`);
    t += sh.duration;
  }));
  return out.join("\n");
}
function download(name: string, text: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
  a.download = name;
  a.click();
}

function AnimeStudio() {
  const { id } = Route.useParams();
  const p = useProject(id)!;
  const update = useStudio((s) => s.update);
  const [si, setSi] = useState(0);
  const [ei, setEi] = useState(0);
  const [srcPage, setSrcPage] = useState("");

  const sIdx = Math.min(si, p.seasons.length - 1);
  const season = p.seasons[sIdx];
  const eIdx = Math.min(ei, (season?.episodes.length ?? 1) - 1);
  const ep = season?.episodes[eIdx];
  const allPages = p.volumes.flatMap((v) => v.pages.map((pg, i) => ({ pg, i, label: `${v.title} · Seite ${i + 1}` })));
  const upEp = (fn: (e: Episode) => void) => update(id, (d) => fn(d.seasons[sIdx].episodes[eIdx]));
  const total = ep?.scenes.reduce((n, s) => n + s.shots.reduce((m, sh) => m + sh.duration, 0), 0) ?? 0;
  const shotCount = ep?.scenes.reduce((n, s) => n + s.shots.length, 0) ?? 0;
  const ready = ep?.scenes.reduce((n, s) => n + s.shots.filter((x) => x.jobStatus === "bereit").length, 0) ?? 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <select className="field" value={sIdx} onChange={(e) => { setSi(+e.target.value); setEi(0); }}>
          {p.seasons.map((s, i) => <option key={s.id} value={i}>{s.title}</option>)}
        </select>
        <Button variant="secondary" onClick={() => { update(id, (d) => { d.seasons.push({ id: uid(), title: `Staffel ${d.seasons.length + 1}`, episodes: [{ id: uid(), title: "Episode 1", synopsis: "", scenes: [], voiceTracks: [] }] }); }); setSi(p.seasons.length); setEi(0); }}><Plus /> Staffel</Button>
        <select className="field" value={eIdx} onChange={(e) => setEi(+e.target.value)}>
          {season?.episodes.map((e, i) => <option key={e.id} value={i}>{e.title}</option>)}
        </select>
        <Button variant="secondary" onClick={() => { update(id, (d) => { const s = d.seasons[sIdx]; s.episodes.push({ id: uid(), title: `Episode ${s.episodes.length + 1}`, synopsis: "", scenes: [], voiceTracks: [] }); }); setEi(season.episodes.length); }}><Plus /> Episode</Button>
      </div>

      {ep && (
        <>
          <Card className="space-y-3">
            <Field label="Episodentitel"><input className="field" value={ep.title} onChange={(e) => upEp((x) => { x.title = e.target.value; })} /></Field>
            <Field label="Synopsis"><textarea className="field" rows={2} value={ep.synopsis} onChange={(e) => upEp((x) => { x.synopsis = e.target.value; })} /></Field>
          </Card>

          <Card className="space-y-3">
            <h2 className="flex items-center gap-2 text-lg"><Wand2 className="h-5 w-5 text-magic" /> Manga → Storyboard</h2>
            <p className="text-xs text-muted-foreground">Wandelt eine Manga-Seite regelbasiert in eine Szene um: ein Shot pro Panel, Sprechblasen werden Untertitel, Einstellungen bestimmen die Kamera.</p>
            <div className="flex gap-2">
              <select className="field" value={srcPage} onChange={(e) => setSrcPage(e.target.value)}>
                <option value="">Seite wählen …</option>
                {allPages.map((x) => <option key={x.pg.id} value={x.pg.id}>{x.label}</option>)}
              </select>
            </div>
            {srcPage && <ConvertPage project={p} pageId={srcPage} season={si} episode={ei} />}
          </Card>

          <Card className="space-y-2">
            <h2 className="text-lg">Zeitachse <span className="text-sm font-normal text-muted-foreground">· {total}s · {shotCount} Shots</span></h2>
            <div className="flex h-12 w-full overflow-hidden rounded border">
              {ep.scenes.flatMap((sc, i) => sc.shots.map((sh, j) => (
                <div key={sh.id} title={`${sc.title} / Shot ${j + 1} (${sh.duration}s)`}
                  className={`flex items-center justify-center border-r border-background text-[10px] ${i % 2 ? "bg-accent text-accent-foreground" : "bg-secondary"} ${sc.isFight ? "ring-1 ring-inset ring-primary" : ""}`}
                  style={{ flexGrow: sh.duration, flexBasis: 0 }}>
                  {sh.duration}s
                </div>
              )))}
              {total === 0 && <div className="flex flex-1 items-center justify-center text-xs text-muted-foreground">Noch keine Shots</div>}
            </div>
          </Card>

          <ValidationList project={p} area="Anime" />
          <div className="flex items-center justify-between">
            <h2 className="text-xl">Szenen & Shotlist</h2>
            <Button size="sm" onClick={() => upEp((e) => { e.scenes.push(newScene({ eyeColor: p.characters[0]?.eyeColor ?? "#e8364a" })); })}><Plus /> Szene</Button>
          </div>

          {ep.scenes.map((sc, sci) => (
            <Card key={sc.id} className="space-y-3">
              <div className="flex items-center gap-2">
                <input className="field font-bold" value={sc.title} onChange={(e) => upEp((x) => { x.scenes[sci].title = e.target.value; })} />
                <button aria-label="Szene löschen" onClick={() => confirm("Szene löschen?") && upEp((x) => { x.scenes.splice(sci, 1); })}><Trash2 className="h-5 w-5" /></button>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <label className="flex items-center gap-2"><input type="checkbox" checked={sc.bw} onChange={(e) => upEp((x) => { x.scenes[sci].bw = e.target.checked; })} /> Schwarzweiß</label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={sc.isFight} onChange={(e) => upEp((x) => { x.scenes[sci].isFight = e.target.checked; })} /> <Swords className="h-4 w-4" /> Kampfszene</label>
                <label className="flex items-center gap-2">Augen <input type="color" value={sc.eyeColor} onChange={(e) => upEp((x) => { x.scenes[sci].eyeColor = e.target.value; })} /></label>
                <label className="flex items-center gap-2">Magie <input type="color" value={sc.magicColor} onChange={(e) => upEp((x) => { x.scenes[sci].magicColor = e.target.value; })} /></label>
              </div>
              {sc.bw && <p className="text-xs text-muted-foreground">Stilvorgabe: Schwarzweiß, nur Augen ({sc.eyeColor}) und Magie ({sc.magicColor}) farbig — wird jedem Animationsauftrag mitgegeben.</p>}

              {sc.shots.map((sh, shi) => {
                const setShot = (fn: (s: Shot) => void) => upEp((x) => fn(x.scenes[sci].shots[shi]));
                return (
                  <div key={sh.id} className="space-y-2 rounded border bg-muted/40 p-3">
                    <div className="flex items-center justify-between text-sm font-bold">
                      <span>Shot {shi + 1}</span>
                      <div className="flex items-center gap-2">
                        <span className={`rounded px-2 py-0.5 text-xs ${statusStyle[sh.jobStatus]}`}>{jobStatusLabel[sh.jobStatus]}</span>
                        <button aria-label="Shot löschen" className="flex h-10 w-10 items-center justify-center" onClick={() => upEp((x) => { x.scenes[sci].shots.splice(shi, 1); })}><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </div>
                    <textarea className="field" rows={2} placeholder="Was passiert im Shot?" value={sh.description} onChange={(e) => setShot((s) => { s.description = e.target.value; })} />
                    <div className="grid grid-cols-3 gap-2">
                      <Field label="Dauer (s)"><input type="number" min={0.5} step={0.5} className="field" value={sh.duration} onChange={(e) => setShot((s) => { s.duration = Math.max(0.5, +e.target.value || 0.5); })} /></Field>
                      <Field label="Kamera"><select className="field" value={sh.camera} onChange={(e) => setShot((s) => { s.camera = e.target.value; })}>{cameras.map((c) => <option key={c}>{c}</option>)}</select></Field>
                      <Field label="Größe"><select className="field" value={sh.shotSize} onChange={(e) => setShot((s) => { s.shotSize = e.target.value; })}>{sizes.map((c) => <option key={c}>{c}</option>)}</select></Field>
                    </div>
                    {sc.isFight && (
                      <Field label="Kampfchoreografie"><input className="field" placeholder="z. B. Ausweichen links, Konter, Klingenblock" value={sh.fight} onChange={(e) => setShot((s) => { s.fight = e.target.value; })} /></Field>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      <Field label="Untertitel DE"><input className="field" value={sh.subtitleDe} onChange={(e) => setShot((s) => { s.subtitleDe = e.target.value; })} /></Field>
                      <Field label="Untertitel EN"><input className="field" value={sh.subtitleEn} onChange={(e) => setShot((s) => { s.subtitleEn = e.target.value; })} /></Field>
                    </div>
                    <Field label="Animationsauftrag (Prompt)"><textarea className="field" rows={2} value={sh.jobPrompt} onChange={(e) => setShot((s) => { s.jobPrompt = e.target.value; })} /></Field>
                    <Field label="Figuren im Shot (feste IDs, Anime-Referenzen)">
                      <CastPicker value={sh.cast} chars={p.characters} use="anime" onChange={(v) => setShot((s) => { s.cast = v; })} />
                    </Field>
                    <div className="grid grid-cols-2 gap-2">
                      <Field label="Auftragsstatus">
                        <select className="field" value={sh.jobStatus} onChange={(e) => setShot((s) => { s.jobStatus = e.target.value as JobStatus; })}>
                          {(Object.keys(jobStatusLabel) as JobStatus[]).map((k) => <option key={k} value={k}>{jobStatusLabel[k]}</option>)}
                        </select>
                      </Field>
                      <Button className="mt-5 min-h-11" variant="secondary" onClick={() => {
                        setShot((s) => { s.jobStatus = "provider_fehlt"; });
                        toast.error("Kein Video-Provider verbunden – es wurde nichts gesendet und kein Video erzeugt.");
                      }}><Send /> An Video-KI</Button>
                    </div>
                  </div>
                );
              })}
              <details className="rounded border p-2">
                <summary className="min-h-10 cursor-pointer py-2 text-sm font-bold">Storyboard-Vorschau & Export</summary>
                <div className="space-y-3 pt-2"><StoryboardExportButtons project={p} scene={sc} /><StoryboardView project={p} scene={sc} /></div>
              </details>
              <Button size="sm" variant="secondary" onClick={() => upEp((x) => { x.scenes[sci].shots.push(newShot({ jobPrompt: sc.bw ? "Schwarzweiß, farbige Augen und Magie" : "" })); })}><Plus /> Shot</Button>
            </Card>
          ))}

          <Card className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg">Sprachspuren</h2>
              <Button size="sm" onClick={() => upEp((x) => { x.voiceTracks.push({ id: uid(), lang: "DE", label: "Neue Spur" }); })}><Plus /> Spur</Button>
            </div>
            {ep.voiceTracks.map((vt, vi) => (
              <div key={vt.id} className="space-y-2 rounded border p-3">
                <div className="grid grid-cols-[1fr_auto_auto] gap-2">
                  <input className="field" value={vt.label} onChange={(e) => upEp((x) => { x.voiceTracks[vi].label = e.target.value; })} />
                  <select className="field" value={vt.lang} onChange={(e) => upEp((x) => { x.voiceTracks[vi].lang = e.target.value as "DE" | "EN"; })}><option>DE</option><option>EN</option></select>
                  <button aria-label="Spur löschen" onClick={() => upEp((x) => { x.voiceTracks.splice(vi, 1); })}><Trash2 className="h-4 w-4" /></button>
                </div>
                <select className="field" value={vt.characterId ?? ""} onChange={(e) => upEp((x) => { x.voiceTracks[vi].characterId = e.target.value || undefined; })}>
                  <option value="">— Figur —</option>
                  {p.characters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <p className="text-xs text-muted-foreground">{vt.fileName ? `Datei vermerkt: ${vt.fileName} (wird erst mit Render-Dienst hochgeladen)` : "Keine Audiodatei zugeordnet"}</p>
                <input type="file" accept="audio/*" className="text-sm" onChange={(e) => { const f = e.target.files?.[0]; if (f) upEp((x) => { x.voiceTracks[vi].fileName = f.name; }); }} />
              </div>
            ))}
          </Card>

          <Card className="space-y-3">
            <h2 className="text-lg">Untertitel & MP4-Export</h2>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={() => download(`${ep.title}.de.srt`, episodeToSrt(ep, "DE"))}><Download /> Untertitel DE (.srt)</Button>
              <Button size="sm" variant="secondary" onClick={() => download(`${ep.title}.en.srt`, episodeToSrt(ep, "EN"))}><Download /> Subtitles EN (.srt)</Button>
            </div>
            <ul className="space-y-1 text-sm">
              <li>{shotCount > 0 ? "✓" : "✗"} Shotlist ({shotCount} Shots, {total}s)</li>
              <li>{ready === shotCount && shotCount > 0 ? "✓" : "…"} Animationsaufträge bereit: {ready}/{shotCount}</li>
              <li>✗ TTS-Sprachspuren erzeugt: 0 (kein TTS-Provider)</li>
              <li>{ep.voiceTracks.length > 0 ? "✓" : "✗"} Sprachspuren: {ep.voiceTracks.length}</li>
              <li>✗ Animierte Clips: 0/{shotCount} (kein Video-Provider)</li>
            </ul>
            <div className="rounded border border-warn/50 bg-warn/10 p-3 text-sm font-bold text-warn">MP4-Status: Blockiert — kein Video- und Render-Provider verbunden</div>
            <ProviderNotice what="Animation & MP4-Render" />
          </Card>
        </>
      )}
    </div>
  );
}