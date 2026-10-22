import { FileJson, FileDown } from "lucide-react";
import { toast } from "sonner";
import type { Project, Scene } from "@/lib/store";
import { jobStatusLabel } from "@/lib/store";
import { buildStoryboard, deliverFile, safeName, storyboardJsonBlob, storyboardPdf } from "@/lib/storyboard";
import { Button } from "@/components/ui/button";
import { PanelView } from "@/components/studio";

export function StoryboardExportButtons({ project, scene }: { project: Project; scene: Scene }) {
  const base = safeName(`${project.title}-${scene.title}`);
  return (
    <div className="grid grid-cols-2 gap-2">
      <Button className="min-h-11" variant="secondary" onClick={() => deliverFile(storyboardJsonBlob(project, scene), `${base}.storyboard.json`)}>
        <FileJson /> Shotlist JSON
      </Button>
      <Button className="min-h-11" variant="secondary" onClick={() => {
        try { deliverFile(storyboardPdf(project, scene), `${base}.storyboard.pdf`); }
        catch (e) { console.error(e); toast.error("PDF konnte nicht erstellt werden"); }
      }}>
        <FileDown /> Storyboard PDF
      </Button>
    </div>
  );
}

/** Read-only storyboard: source panel (or empty frame) next to the shot data. */
export function StoryboardView({ project, scene }: { project: Project; scene: Scene }) {
  const sb = buildStoryboard(project, scene);
  const page = project.volumes.flatMap((v) => v.pages).find((pg) => pg.id === scene.sourcePageId);
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        {sb.shots.length} Shots · {sb.totalDuration}s{sb.scene.sourcePage && ` · aus ${sb.scene.sourcePage}`} · {sb.note}
      </p>
      {sb.shots.map((s, i) => {
        const panel = page?.panels[i];
        return (
          <div key={s.no} className="grid grid-cols-[7rem_1fr] gap-3 rounded border bg-muted/30 p-2">
            <div className="aspect-[4/3]">
              {panel ? <div className="grid h-full"><PanelView panel={panel} lang="DE" chars={project.characters} /></div>
                : <div className="flex h-full items-center justify-center border-2 border-dashed text-[10px] text-muted-foreground">kein Panel</div>}
            </div>
            <div className="min-w-0 space-y-0.5 text-xs">
              <p className="text-sm font-bold">Shot {s.no} <span className="font-normal text-muted-foreground">{s.start}–{s.start + s.duration}s</span></p>
              <p>{s.shotSize} · {s.camera}</p>
              <p className="text-muted-foreground">{s.description || "—"}</p>
              {s.fight && <p className="text-primary">Kampf: {s.fight}</p>}
              <p>Figuren: {s.cast.join(", ") || "—"}</p>
              {s.subtitleDe && <p>DE: {s.subtitleDe}</p>}
              {s.subtitleEn && <p>EN: {s.subtitleEn}</p>}
              <p className="text-warn">{jobStatusLabel[s.jobStatus as keyof typeof jobStatusLabel]}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}