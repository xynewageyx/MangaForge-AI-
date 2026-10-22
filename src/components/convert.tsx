import { useState } from "react";
import { RefreshCw, Plus } from "lucide-react";
import { toast } from "sonner";
import { useStudio, scenesFromPage, convertPageInto, type Project } from "@/lib/store";
import { Button } from "@/components/ui/button";

/** Convert a page with an explicit choice: update an existing linked scene, or create a new one. */
export function ConvertPage({ project, pageId, season, episode, onDone }: {
  project: Project; pageId: string; season: number; episode: number; onDone?: (sceneId: string) => void;
}) {
  const update = useStudio((s) => s.update);
  const linked = scenesFromPage(project, pageId);
  const [sel, setSel] = useState("");
  const target = linked.find((x) => x.sc.id === sel) ?? linked[0];
  const run = (kind: "neu" | "aktualisieren") => {
    let id = "";
    update(project.id, (d) => {
      id = convertPageInto(d, pageId, kind === "neu" ? { kind, season, episode } : { kind, sceneId: target!.sc.id });
    });
    toast.success(kind === "neu" ? "Neue Szene angelegt" : `„${target!.sc.title}“ aktualisiert`);
    onDone?.(id);
  };
  if (!linked.length) return <Button className="min-h-12 w-full" onClick={() => run("neu")}><Plus /> Szene & Shotlist erzeugen</Button>;
  return (
    <div className="space-y-2 rounded border border-warn/60 bg-warn/10 p-3">
      <p className="text-sm">Diese Seite wurde schon umgewandelt ({linked.length}×). Was soll passieren?</p>
      {linked.length > 1 && (
        <select className="field" value={target.sc.id} onChange={(e) => setSel(e.target.value)}>
          {linked.map((x) => <option key={x.sc.id} value={x.sc.id}>{x.label}</option>)}
        </select>
      )}
      <Button className="min-h-12 w-full" onClick={() => run("aktualisieren")}><RefreshCw /> „{target.sc.title}“ aktualisieren</Button>
      <p className="text-xs text-muted-foreground">Behält Kamera, Dauer, Kampf und Status je Shot. Geänderte Panels setzen den Status auf „Entwurf“.</p>
      <Button variant="secondary" className="min-h-12 w-full" onClick={() => run("neu")}><Plus /> Trotzdem neue Szene anlegen</Button>
    </div>
  );
}