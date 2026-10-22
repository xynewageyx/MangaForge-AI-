import { jsPDF } from "jspdf";
import { validateProject, findEmptyBubbles, jobStatusLabel, type Issue, type MangaPage, type Project, type Scene } from "./store";

/** Validation restricted to one manga page (bubbles, images, cast). */
export function validatePage(p: Project, pageId: string): Issue[] {
  const loc = p.volumes.flatMap((v) => v.pages.map((pg, i) => ({ v, pg, i }))).find((x) => x.pg.id === pageId);
  if (!loc) return [{ level: "fehler", area: "Manga", message: "Seite nicht gefunden" }];
  const prefix = `${loc.v.title} S.${loc.i + 1} `;
  const out = validateProject(p).filter((i) => i.area === "Manga" && i.message.startsWith(prefix));
  loc.pg.panels.forEach((pn, n) => {
    if (!pn.description.trim()) out.push({ level: "fehler", area: "Manga", message: `${prefix}Panel ${n + 1}: keine Beschreibung` });
    if (!pn.cast.length) out.push({ level: "warnung", area: "Manga", message: `${prefix}Panel ${n + 1}: keine Figur zugeordnet` });
  });
  return out;
}

export const pageHasBlockingErrors = (p: Project, pageId: string) => validatePage(p, pageId).some((i) => i.level === "fehler");

export interface StoryboardExport {
  format: "mangaforge.storyboard";
  version: 1;
  project: string;
  scene: { id: string; title: string; style: { bw: boolean; eyeColor: string; magicColor: string }; isFight: boolean; sourcePage?: string };
  totalDuration: number;
  characters: { id: string; code: string; name: string; eyeColor: string }[];
  shots: {
    no: number; start: number; duration: number; shotSize: string; camera: string; description: string;
    fight: string; cast: string[]; subtitleDe: string; subtitleEn: string; jobPrompt: string; jobStatus: string; panelImage: boolean;
  }[];
  note: string;
}

function findPage(p: Project, id?: string): { page: MangaPage; label: string } | undefined {
  for (const v of p.volumes) {
    const i = v.pages.findIndex((x) => x.id === id);
    if (i >= 0) return { page: v.pages[i], label: `${v.title} S.${i + 1}` };
  }
  return undefined;
}

/** Serializable storyboard / shotlist. Contains no generated media — only planning data. */
export function buildStoryboard(p: Project, scene: Scene): StoryboardExport {
  const src = findPage(p, scene.sourcePageId);
  const castIds = [...new Set(scene.shots.flatMap((s) => s.cast))];
  let t = 0;
  return {
    format: "mangaforge.storyboard",
    version: 1,
    project: p.title,
    scene: { id: scene.id, title: scene.title, style: { bw: scene.bw, eyeColor: scene.eyeColor, magicColor: scene.magicColor }, isFight: scene.isFight, sourcePage: src?.label },
    totalDuration: scene.shots.reduce((n, s) => n + s.duration, 0),
    characters: castIds.map((id) => p.characters.find((c) => c.id === id)).filter(Boolean).map((c) => ({ id: c!.id, code: c!.code, name: c!.name, eyeColor: c!.eyeColor })),
    shots: scene.shots.map((s, i) => {
      const start = t; t += s.duration;
      return {
        no: i + 1, start, duration: s.duration, shotSize: s.shotSize, camera: s.camera, description: s.description, fight: s.fight,
        cast: s.cast.map((id) => p.characters.find((c) => c.id === id)?.code ?? "GELÖSCHT"),
        subtitleDe: s.subtitleDe, subtitleEn: s.subtitleEn, jobPrompt: s.jobPrompt, jobStatus: s.jobStatus,
        panelImage: !!src?.page.panels[i]?.image,
      };
    }),
    note: "Planungsdaten. Keine Animation erzeugt – kein Video-Provider verbunden.",
  };
}

/** Storyboard PDF built from data (not a screenshot): one row per shot with source panel image if present. */
export function storyboardPdf(p: Project, scene: Scene): Blob {
  const sb = buildStoryboard(p, scene);
  const src = findPage(p, scene.sourcePageId);
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210, M = 12;
  let y = M;
  pdf.setFont("helvetica", "bold").setFontSize(16).text(`${sb.project} - ${sb.scene.title}`, M, y + 4);
  y += 10;
  pdf.setFont("helvetica", "normal").setFontSize(9).text(
    `${sb.shots.length} Shots | ${sb.totalDuration}s | ${sb.scene.style.bw ? "Schwarzweiß, Augen " + sb.scene.style.eyeColor + ", Magie " + sb.scene.style.magicColor : "Farbe"}${sb.scene.sourcePage ? " | Quelle: " + sb.scene.sourcePage : ""}`,
    M, y,
  );
  y += 4;
  pdf.text(sb.note, M, y);
  y += 6;
  sb.shots.forEach((s, i) => {
    const rowH = 46;
    if (y + rowH > 297 - M) { pdf.addPage(); y = M; }
    pdf.setDrawColor(40).rect(M, y, 60, rowH - 4);
    const img = src?.page.panels[i]?.image;
    if (img) pdf.addImage(img, "JPEG", M + 0.5, y + 0.5, 59, rowH - 5);
    else pdf.setFontSize(8).text("kein Bild", M + 22, y + rowH / 2);
    const x = M + 64;
    pdf.setFont("helvetica", "bold").setFontSize(11).text(`Shot ${s.no}  (${s.start}s - ${s.start + s.duration}s)`, x, y + 5);
    pdf.setFont("helvetica", "normal").setFontSize(9);
    const lines = [
      `${s.shotSize} | Kamera: ${s.camera} | Status: ${jobStatusLabel[s.jobStatus as keyof typeof jobStatusLabel]}`,
      `Figuren: ${s.cast.join(", ") || "-"}`,
      ...(s.fight ? [`Kampf: ${s.fight}`] : []),
      `Bild: ${s.description || "-"}`,
      `DE: ${s.subtitleDe || "-"}`,
      `EN: ${s.subtitleEn || "-"}`,
    ];
    pdf.text(lines.flatMap((l) => pdf.splitTextToSize(l, W - x - M)).slice(0, 8), x, y + 11);
    y += rowH;
  });
  return pdf.output("blob");
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

/** On Android, prefer the system share sheet (save to Files/Drive); fall back to a normal download. */
export async function deliverFile(blob: Blob, filename: string) {
  const file = new File([blob], filename, { type: blob.type });
  if (matchMedia("(pointer: coarse)").matches && navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], title: filename }); return; }
    catch (e) { if ((e as DOMException).name === "AbortError") return; }
  }
  downloadBlob(blob, filename);
}

export const safeName = (s: string) => s.replace(/[^\p{L}\p{N}_-]+/gu, "_");
export const storyboardJsonBlob = (p: Project, scene: Scene) =>
  new Blob([JSON.stringify(buildStoryboard(p, scene), null, 2)], { type: "application/json" });

export { findEmptyBubbles };