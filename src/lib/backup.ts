import { migrateProject, type Project } from "./store";

export const BACKUP_FORMAT = "mangaforge.backup";
export interface Backup { format: typeof BACKUP_FORMAT; version: 1; exportedAt: string; projects: Project[] }

export const buildBackup = (projects: Project[], now = new Date()): Backup => ({
  format: BACKUP_FORMAT, version: 1, exportedAt: now.toISOString(), projects: structuredClone(projects),
});

export type ParseResult = { ok: true; projects: Project[]; warnings: string[] } | { ok: false; error: string };

const isObj = (x: unknown): x is Record<string, any> => !!x && typeof x === "object" && !Array.isArray(x);
const arr = (x: unknown) => Array.isArray(x);
const str = (o: Record<string, any>, k: string) => typeof o[k] === "string" && o[k] !== "";

/** Checks one project's structure; returns a German error or null. */
function checkProject(p: any, n: number): string | null {
  const at = `Projekt ${n + 1}${isObj(p) && str(p, "title") ? ` („${p["title"]}“)` : ""}`;
  if (!isObj(p)) return `${at}: ist kein Objekt`;
  if (!str(p, "id")) return `${at}: ID fehlt`;
  if (!str(p, "title")) return `${at}: Titel fehlt`;
  if (!isObj(p["bible"]) || !isObj(p["cover"])) return `${at}: Story-Bibel oder Cover fehlt`;
  if (!arr(p["characters"]) || !arr(p["volumes"]) || !arr(p["seasons"])) return `${at}: Figuren, Bände oder Staffeln fehlen`;
  for (const v of p["volumes"]) {
    if (!isObj(v) || !arr(v["pages"])) return `${at}: Band ohne Seitenliste`;
    for (const pg of v["pages"]) {
      if (!isObj(pg) || !str(pg, "id") || !arr(pg["panels"])) return `${at}: beschädigte Seite in „${v["title"] ?? "?"}“`;
      for (const pn of pg["panels"]) if (!isObj(pn) || !str(pn, "id") || !arr(pn["bubbles"])) return `${at}: beschädigtes Panel`;
    }
  }
  for (const s of p["seasons"]) {
    if (!isObj(s) || !arr(s["episodes"])) return `${at}: Staffel ohne Episodenliste`;
    for (const e of s["episodes"]) {
      if (!isObj(e) || !arr(e["scenes"])) return `${at}: Episode ohne Szenenliste`;
      for (const sc of e["scenes"]) if (!isObj(sc) || !str(sc, "id") || !arr(sc["shots"])) return `${at}: beschädigte Szene`;
    }
  }
  for (const c of p["characters"]) if (!isObj(c) || !str(c, "id") || !str(c, "name")) return `${at}: beschädigte Figur`;
  return null;
}

/** Validates and migrates a backup file. Never throws. */
export function parseBackup(text: string): ParseResult {
  let data: unknown;
  try { data = JSON.parse(text); } catch { return { ok: false, error: "Die Datei ist kein gültiges JSON (beschädigt oder falscher Dateityp)." }; }
  if (!isObj(data)) return { ok: false, error: "Unbekanntes Dateiformat." };
  if (data["format"] === "mangaforge.storyboard") return { ok: false, error: "Das ist ein Storyboard-Export, keine Sicherung. Bitte eine Sicherungsdatei wählen." };
  if (data["format"] !== BACKUP_FORMAT) return { ok: false, error: "Keine MangaForge-Sicherung (Kennung fehlt)." };
  if (typeof data["version"] !== "number" || data["version"] > 1) return { ok: false, error: "Diese Sicherung stammt aus einer neueren App-Version." };
  if (!arr(data["projects"])) return { ok: false, error: "Die Sicherung enthält keine gültige Projektliste." };
  for (let i = 0; i < data["projects"].length; i++) {
    const err = checkProject(data["projects"][i], i);
    if (err) return { ok: false, error: err };
  }
  const ids = data["projects"].map((p: any) => p.id);
  if (new Set(ids).size !== ids.length) return { ok: false, error: "Die Sicherung enthält doppelte Projekt-IDs." };
  const projects = structuredClone(data["projects"]).map(migrateProject);
  const warnings: string[] = [];
  const imgs = projects.reduce((n: number, p: Project) => n + p.volumes.reduce((m, v) => m + v.pages.reduce((k, pg) => k + pg.panels.filter((x) => x.image).length, 0), 0), 0);
  if (projects.length > 0 && imgs === 0) warnings.push("Die Sicherung enthält keine Panelbilder.");
  return { ok: true, projects, warnings };
}

export function downloadBackup(projects: Project[]) {
  const b = buildBackup(projects);
  const blob = new Blob([JSON.stringify(b)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `MangaForge-Sicherung-${b.exportedAt.slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}