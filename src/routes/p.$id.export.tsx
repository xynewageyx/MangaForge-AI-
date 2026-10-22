import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";
import { FileDown, ImageDown, AlertTriangle } from "lucide-react";
import { useProject, findEmptyBubbles } from "@/lib/store";
import { Card, PageView, CoverView, ValidationList } from "@/components/studio";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/p/$id/export")({ component: ExportPage });

function ExportPage() {
  const { id } = Route.useParams();
  const p = useProject(id)!;
  const [vi, setVi] = useState(0);
  const [lang, setLang] = useState<"DE" | "EN">("DE");
  const [withCover, setWithCover] = useState(true);
  const [busy, setBusy] = useState("");
  const refs = useRef<(HTMLDivElement | null)[]>([]);
  const vol = p.volumes[Math.min(vi, p.volumes.length - 1)];
  const empties = findEmptyBubbles(p).filter((e) => e.volume === vol.title);
  const missingLang = empties.filter((e) => e.missing.includes(lang));

  const nodes = () => refs.current.slice(0, vol.pages.length + (withCover ? 1 : 0)).filter(Boolean) as HTMLDivElement[];
  const render = (n: HTMLDivElement) => toPng(n, { pixelRatio: 2, cacheBust: true });
  const base = `${p.title}-${vol.title}-${lang}`.replace(/\s+/g, "_");

  async function exportPng() {
    setBusy("PNG");
    try {
      const list = nodes();
      for (let i = 0; i < list.length; i++) {
        const a = document.createElement("a");
        a.href = await render(list[i]);
        a.download = `${base}-${String(i + 1).padStart(3, "0")}.png`;
        a.click();
      }
      toast.success(`${list.length} PNG-Dateien exportiert`);
    } catch (e) { toast.error("PNG-Export fehlgeschlagen"); console.error(e); }
    setBusy("");
  }
  async function exportPdf() {
    setBusy("PDF");
    try {
      const pdf = new jsPDF({ unit: "mm", format: "a4" });
      const list = nodes();
      for (let i = 0; i < list.length; i++) {
        if (i) pdf.addPage();
        pdf.addImage(await render(list[i]), "PNG", 0, 0, 210, 297);
      }
      pdf.save(`${base}.pdf`);
      toast.success("PDF exportiert");
    } catch (e) { toast.error("PDF-Export fehlgeschlagen"); console.error(e); }
    setBusy("");
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl">Manga-Export</h2>
      <ValidationList project={p} />
      <Card className="space-y-3">
        <select className="field" value={vi} onChange={(e) => setVi(+e.target.value)}>
          {p.volumes.map((v, i) => <option key={v.id} value={i}>{v.title} ({v.pages.length} Seiten)</option>)}
        </select>
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <div className="flex rounded border text-xs">
            {(["DE", "EN"] as const).map((l) => (
              <button key={l} onClick={() => setLang(l)} className={`px-3 py-1 ${lang === l ? "bg-primary text-primary-foreground" : ""}`}>{l}</button>
            ))}
          </div>
          <label className="flex items-center gap-2"><input type="checkbox" checked={withCover} onChange={(e) => setWithCover(e.target.checked)} /> Cover einfügen</label>
        </div>
        {missingLang.length > 0 && (
          <p className="flex items-start gap-2 rounded border border-destructive/60 bg-destructive/10 p-2 text-sm">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            {missingLang.length} Sprechblase(n) ohne {lang}-Text — sie erscheinen im Export leer.
          </p>
        )}
        <div className="grid grid-cols-2 gap-2">
          <Button disabled={!!busy} onClick={exportPdf}><FileDown /> {busy === "PDF" ? "Erstelle …" : "PDF"}</Button>
          <Button disabled={!!busy} variant="secondary" onClick={exportPng}><ImageDown /> {busy === "PNG" ? "Erstelle …" : "PNG je Seite"}</Button>
        </div>
      </Card>

      <p className="text-xs text-muted-foreground">Vorschau (genau so wird exportiert):</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {withCover && <div ref={(el) => { refs.current[0] = el; }}><CoverView p={p} lang={lang} /></div>}
        {vol.pages.map((pg, i) => (
          <div key={pg.id} ref={(el) => { refs.current[i + (withCover ? 1 : 0)] = el; }}>
            <PageView page={pg} lang={lang} chars={p.characters} />
          </div>
        ))}
      </div>
    </div>
  );
}