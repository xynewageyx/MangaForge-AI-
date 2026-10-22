import { createFileRoute } from "@tanstack/react-router";
import { Plus, Trash2, X } from "lucide-react";
import { useProject, useStudio, uid, nextCharCode, type RefKind, type RefUse } from "@/lib/store";
import { Card, Field, ProviderNotice, ValidationList } from "@/components/studio";
import { Button } from "@/components/ui/button";
import { fileToDataUrl } from "@/lib/image";

export const Route = createFileRoute("/p/$id/figuren")({ component: Characters });

function Characters() {
  const { id } = Route.useParams();
  const p = useProject(id)!;
  const update = useStudio((s) => s.update);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl">Figuren</h2>
        <Button onClick={() => update(id, (d) => { d.characters.push({ id: uid(), code: nextCharCode(d.characters), name: "Neue Figur", role: "", description: "", eyeColor: "#e8364a", refImages: [] }); })}>
          <Plus /> Figur
        </Button>
      </div>
      {p.characters.map((c, i) => (
        <Card key={c.id} className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="shrink-0 rounded bg-secondary px-2 py-1 font-mono text-xs font-bold" title="Feste Figuren-ID">{c.code}</span>
            <span className="h-6 w-6 shrink-0 rounded-full" style={{ background: c.eyeColor, boxShadow: `0 0 10px ${c.eyeColor}` }} />
            <input className="field font-bold" value={c.name} onChange={(e) => update(id, (d) => { d.characters[i].name = e.target.value; })} />
            <button aria-label="Figur löschen" onClick={() => confirm("Figur löschen?") && update(id, (d) => { d.characters.splice(i, 1); })}>
              <Trash2 className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>
          <div className="grid grid-cols-[1fr_auto] gap-3">
            <Field label="Rolle"><input className="field" value={c.role} onChange={(e) => update(id, (d) => { d.characters[i].role = e.target.value; })} /></Field>
            <Field label="Augenfarbe"><input type="color" className="h-10 w-16" value={c.eyeColor} onChange={(e) => update(id, (d) => { d.characters[i].eyeColor = e.target.value; })} /></Field>
          </div>
          <Field label="Beschreibung / Aussehen">
            <textarea className="field" rows={3} value={c.description} onChange={(e) => update(id, (d) => { d.characters[i].description = e.target.value; })} />
          </Field>
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Referenzbilder (Manga & Anime)</span>
            {c.refImages.map((r, j) => {
              const setR = (fn: (x: typeof r) => void) => update(id, (d) => fn(d.characters[i].refImages[j]));
              return (
                <div key={r.id} className="flex gap-3 rounded border p-2">
                  <img src={r.src} alt={`${c.code} ${r.kind}`} className="h-28 w-20 shrink-0 rounded object-cover" />
                  <div className="flex-1 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <select className="field" aria-label="Ansicht" value={r.kind} onChange={(e) => setR((x) => { x.kind = e.target.value as RefKind; })}>
                        {["Front", "Seite", "Rücken", "Mimik", "Outfit", "Pose"].map((k) => <option key={k}>{k}</option>)}
                      </select>
                      <select className="field" aria-label="Verwendung" value={r.use} onChange={(e) => setR((x) => { x.use = e.target.value as RefUse; })}>
                        <option value="beide">Manga + Anime</option><option value="manga">Nur Manga</option><option value="anime">Nur Anime</option>
                      </select>
                    </div>
                    <input className="field" placeholder="Notiz (z. B. Narbe links)" value={r.note} onChange={(e) => setR((x) => { x.note = e.target.value; })} />
                    <button className="flex min-h-11 items-center gap-1 text-sm text-destructive" onClick={() => update(id, (d) => { d.characters[i].refImages.splice(j, 1); })}>
                      <X className="h-4 w-4" /> Entfernen
                    </button>
                  </div>
                </div>
              );
            })}
            <label className="flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded border border-dashed text-sm text-muted-foreground">
              <Plus className="h-4 w-4" /> Referenzbild hinzufügen
              <input type="file" accept="image/*" multiple className="sr-only" onChange={async (e) => {
                const files = Array.from(e.target.files ?? []);
                const urls = await Promise.all(files.map((f) => fileToDataUrl(f, 700)));
                update(id, (d) => { d.characters[i].refImages.push(...urls.map((src) => ({ id: uid(), src, kind: "Front" as RefKind, use: "beide" as RefUse, note: "" }))); });
                e.target.value = "";
              }} />
            </label>
            <p className="text-xs text-muted-foreground">Werden lokal gespeichert und später mit der ID {c.code} an Bild-/Video-Provider übergeben.</p>
          </div>
        </Card>
      ))}
      <ValidationList project={p} area="Figuren" />
      <ProviderNotice what="Figuren-Bildgenerierung" />
    </div>
  );
}