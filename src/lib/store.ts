import { create } from "zustand";
import { persist, createJSONStorage, type StateStorage } from "zustand/middleware";
import { get, set, del } from "idb-keyval";
import { createDemoProject } from "./demo";
import { layoutCount } from "./layouts";

export const uid = () => Math.random().toString(36).slice(2, 10);

export type BubbleType = "sprechen" | "denken" | "schrei" | "erzaehler";
export interface Bubble { id: string; type: BubbleType; speakerId?: string; textDe: string; textEn: string; x: number; y: number }
export type PanelFx = "keiner" | "magie" | "speedlines" | "screentone";
export interface Panel {
  id: string; description: string; image?: string; shotType: string;
  bw: boolean; fx: PanelFx; fxColor: string; eyeColor?: string; bubbles: Bubble[];
  /** Character ids appearing in this panel. */
  cast: string[];
}
export type PageLayout = string;
export interface MangaPage { id: string; layout: PageLayout; panels: Panel[] }
export interface Volume { id: string; title: string; pages: MangaPage[] }
export type RefKind = "Front" | "Seite" | "Rücken" | "Mimik" | "Outfit" | "Pose";
export type RefUse = "manga" | "anime" | "beide";
export interface RefImage { id: string; src: string; kind: RefKind; use: RefUse; note: string }
/** `code` is the stable, human-readable character ID (e.g. CHR-001) used in prompts, panels and shots. */
export interface Character { id: string; code: string; name: string; role: string; description: string; eyeColor: string; refImages: RefImage[] }
export type JobStatus = "entwurf" | "in_pruefung" | "bereit" | "provider_fehlt";
export const jobStatusLabel: Record<JobStatus, string> = {
  entwurf: "Entwurf", in_pruefung: "In Prüfung", bereit: "Auftrag bereit", provider_fehlt: "Provider fehlt",
};
export interface Shot {
  id: string; description: string; duration: number; camera: string; shotSize: string;
  fight: string; subtitleDe: string; subtitleEn: string; jobPrompt: string; jobStatus: JobStatus;
  cast: string[];
  /** Panel this shot was converted from; keeps re-conversion stable. */
  sourcePanelId?: string;
}
export interface Scene {
  id: string; title: string; sourcePageId?: string; bw: boolean; eyeColor: string; magicColor: string;
  isFight: boolean; shots: Shot[];
}
export interface VoiceTrack { id: string; characterId?: string; lang: "DE" | "EN"; label: string; fileName?: string }
export interface Episode { id: string; title: string; synopsis: string; scenes: Scene[]; voiceTracks: VoiceTrack[] }
export interface Season { id: string; title: string; episodes: Episode[] }
export interface Project {
  id: string; title: string; logline: string; genre: string; updatedAt: number;
  bible: { world: string; magic: string; themes: string; timeline: string };
  cover: { titleDe: string; titleEn: string; subtitle: string; image?: string; accent: string };
  characters: Character[]; volumes: Volume[]; seasons: Season[];
}

export const newPanel = (p: Partial<Panel> = {}): Panel => ({
  id: uid(), description: "", shotType: "Halbtotale", bw: true, fx: "keiner", fxColor: "#38d6f0", bubbles: [], cast: [], ...p,
});
export const newPage = (layout: PageLayout = "3"): MangaPage => ({
  id: uid(), layout, panels: Array.from({ length: layoutCount(layout) }, () => newPanel()),
});
export const newShot = (p: Partial<Shot> = {}): Shot => ({
  id: uid(), description: "", duration: 3, camera: "Statisch", shotSize: "Halbtotale", fight: "",
  subtitleDe: "", subtitleEn: "", jobPrompt: "", jobStatus: "entwurf", cast: [], ...p,
});
export const newScene = (p: Partial<Scene> = {}): Scene => ({
  id: uid(), title: "Neue Szene", bw: true, eyeColor: "#e8364a", magicColor: "#38d6f0", isFight: false, shots: [], ...p,
});
export const newProject = (title: string): Project => ({
  id: uid(), title, logline: "", genre: "", updatedAt: Date.now(),
  bible: { world: "", magic: "", themes: "", timeline: "" },
  cover: { titleDe: title, titleEn: title, subtitle: "Band 1", accent: "#e8364a" },
  characters: [], volumes: [{ id: uid(), title: "Band 1", pages: [newPage("3")] }],
  seasons: [{ id: uid(), title: "Staffel 1", episodes: [{ id: uid(), title: "Episode 1", synopsis: "", scenes: [], voiceTracks: [] }] }],
});

/** Convert a manga page into an anime scene: one shot per panel, bubbles become subtitles. Deterministic, no AI. */
export function pageToScene(page: MangaPage, index: number, chars: Character[]): Scene {
  const camFor = (s: string) => (/nah|close/i.test(s) ? "Langsamer Zoom rein" : /total|weit/i.test(s) ? "Schwenk" : "Statisch");
  const sayer = (b: Bubble) => chars.find((c) => c.id === b.speakerId)?.name;
  return newScene({
    title: `Storyboard Seite ${index + 1}`,
    sourcePageId: page.id,
    eyeColor: chars[0]?.eyeColor ?? "#e8364a",
    isFight: page.panels.some((p) => p.fx === "speedlines"),
    shots: page.panels.map((p) =>
      newShot({
        description: p.description,
        shotSize: p.shotType,
        camera: camFor(p.shotType),
        duration: Math.max(2, p.bubbles.length * 2 + 1),
        subtitleDe: p.bubbles.map((b) => (sayer(b) ? `${sayer(b)}: ` : "") + b.textDe).filter(Boolean).join(" / "),
        subtitleEn: p.bubbles.map((b) => (sayer(b) ? `${sayer(b)}: ` : "") + b.textEn).filter(Boolean).join(" / "),
        fight: p.fx === "speedlines" ? "Schneller Schlagabtausch" : "",
        cast: [...p.cast],
        sourcePanelId: p.id,
        jobPrompt: `${p.bw ? "Schwarzweiß-Manga-Stil" : "Farbe"}; ${p.description}${p.fx === "magie" ? "; farbiger Magieeffekt" : ""}${
          p.cast.length ? "; Figuren: " + p.cast.map((id) => chars.find((c) => c.id === id)?.code).filter(Boolean).join(", ") : ""}`,
      }),
    ),
  });
}

/** Returns all bubbles with missing German or English text. */
export function findEmptyBubbles(project: Project) {
  const out: { volume: string; page: number; panel: number; bubbleId: string; missing: string[] }[] = [];
  project.volumes.forEach((v) => v.pages.forEach((pg, pi) => pg.panels.forEach((pn, ni) => pn.bubbles.forEach((b) => {
    const missing = [!b.textDe.trim() && "DE", !b.textEn.trim() && "EN"].filter(Boolean) as string[];
    if (missing.length) out.push({ volume: v.title, page: pi + 1, panel: ni + 1, bubbleId: b.id, missing });
  }))));
  return out;
}

export const nextCharCode = (chars: Character[]) => {
  const n = chars.reduce((m, c) => Math.max(m, Number(c.code?.replace(/\D/g, "")) || 0), 0) + 1;
  return `CHR-${String(n).padStart(3, "0")}`;
};

export interface Issue { level: "fehler" | "warnung"; area: "Manga" | "Anime" | "Figuren"; message: string }
/** Full project check: empty bubbles, missing images, missing references, incomplete shots. */
export function validateProject(p: Project): Issue[] {
  const out: Issue[] = [];
  findEmptyBubbles(p).forEach((e) => out.push({ level: "fehler", area: "Manga", message: `${e.volume} S.${e.page} Panel ${e.panel}: Sprechblase ohne ${e.missing.join("+")}` }));
  p.volumes.forEach((v) => v.pages.forEach((pg, pi) => pg.panels.forEach((pn, ni) => {
    if (!pn.image) out.push({ level: "warnung", area: "Manga", message: `${v.title} S.${pi + 1} Panel ${ni + 1}: kein Bild` });
    if (pn.cast.some((id) => !p.characters.some((c) => c.id === id))) out.push({ level: "fehler", area: "Manga", message: `${v.title} S.${pi + 1} Panel ${ni + 1}: verweist auf gelöschte Figur` });
  })));
  p.characters.forEach((c) => {
    if (!c.refImages.some((r) => r.use !== "anime")) out.push({ level: "warnung", area: "Figuren", message: `${c.code} ${c.name}: kein Manga-Referenzbild` });
    if (!c.refImages.some((r) => r.use !== "manga")) out.push({ level: "warnung", area: "Figuren", message: `${c.code} ${c.name}: kein Anime-Referenzbild` });
  });
  p.seasons.forEach((s) => s.episodes.forEach((e) => e.scenes.forEach((sc) => sc.shots.forEach((sh, i) => {
    const w = `${e.title} / ${sc.title} / Shot ${i + 1}`;
    if (!sh.description.trim()) out.push({ level: "fehler", area: "Anime", message: `${w}: keine Beschreibung` });
    if (sc.isFight && !sh.fight.trim()) out.push({ level: "warnung", area: "Anime", message: `${w}: Kampfchoreografie fehlt` });
    if (!sh.cast.length) out.push({ level: "warnung", area: "Anime", message: `${w}: keine Figuren zugeordnet` });
  }))));
  return out;
}

/** Brings stored data from older app versions up to the current model. */
export function migrateProject(p: any): Project {
  p.characters = (p.characters ?? []).map((c: any, i: number) => ({
    ...c,
    code: c.code ?? `CHR-${String(i + 1).padStart(3, "0")}`,
    refImages: (c.refImages ?? []).map((r: any) => (typeof r === "string" ? { id: uid(), src: r, kind: "Front", use: "beide", note: "" } : r)),
  }));
  p.volumes?.forEach((v: any) => v.pages.forEach((pg: any) => pg.panels.forEach((pn: any) => {
    pn.cast ??= [];
    // Repair the shipped demo translation without overwriting user-written dialogue.
    if (p.id === "demo-project" && pn.id === "demo-pn3") {
      const bubble = pn.bubbles?.find((b: any) => b.id === "demo-b3");
      if (bubble?.textDe === "Du kommst spät, Klingenträger." && !bubble.textEn?.trim()) {
        bubble.textEn = "You're late, swordbearer.";
      }
    }
  })));
  const pageById = new Map<string, any>();
  p.volumes?.forEach((v: any) => v.pages.forEach((pg: any) => pageById.set(pg.id, pg)));
  p.seasons?.forEach((s: any) => s.episodes.forEach((e: any) => e.scenes.forEach((sc: any) => sc.shots.forEach((sh: any, i: number) => {
    sh.cast ??= [];
    // v3: link converted shots to their source panel (by position) so re-conversion updates instead of duplicating.
    const src = sc.sourcePageId ? pageById.get(sc.sourcePageId) : undefined;
    if (sh.sourcePanelId === undefined && src && src.panels.length === sc.shots.length) sh.sourcePanelId = src.panels[i].id;
    if (sh.jobStatus === "wartet_auf_provider") sh.jobStatus = "provider_fehlt";
  }))));
  return p as Project;
}

const idbStorage: StateStorage = {
  getItem: async (k) => (await get(k)) ?? null,
  setItem: async (k, v) => set(k, v),
  removeItem: async (k) => del(k),
};

interface State {
  projects: Project[];
  syncBases: Record<string, { revision: number; fingerprint: string }>;
  hydrated: boolean;
  addProject: (title: string) => string;
  deleteProject: (id: string) => void;
  update: (id: string, fn: (p: Project) => void) => void;
  resetDemo: () => void;
  /** Restore from backup: "ersetzen" replaces all, "zusammenfuehren" overwrites same IDs and adds the rest. */
  restoreProjects: (incoming: Project[], mode: "ersetzen" | "zusammenfuehren") => void;
}

export const useStudio = create<State>()(
  persist(
    (setS) => ({
      projects: [createDemoProject()],
      syncBases: {},
      hydrated: false,
      addProject: (title) => {
        const p = newProject(title);
        setS((s) => ({ projects: [p, ...s.projects] }));
        return p.id;
      },
      deleteProject: (id) => setS((s) => ({ projects: s.projects.filter((p) => p.id !== id) })),
      update: (id, fn) =>
        setS((s) => ({
          projects: s.projects.map((p) => {
            if (p.id !== id) return p;
            const copy = structuredClone(p);
            fn(copy);
            copy.updatedAt = Date.now();
            return copy;
          }),
        })),
      restoreProjects: (incoming, mode) => setS((s) => ({
        projects: mode === "ersetzen" ? incoming
          : [...incoming, ...s.projects.filter((p) => !incoming.some((i) => i.id === p.id))],
      })),
      resetDemo: () => setS((s) => ({ projects: [createDemoProject(), ...s.projects.filter((p) => !p.id.startsWith("demo"))] })),
    }),
    {
      name: "mangaforge-studio",
      storage: createJSONStorage(() => idbStorage),
      skipHydration: true,
      version: 5,
      migrate: (state: any) => ({ ...state, syncBases: state?.syncBases ?? {}, projects: (state?.projects ?? []).map(migrateProject) }),
      partialize: (s) => ({ projects: s.projects, syncBases: s.syncBases }),
      onRehydrateStorage: () => () => useStudio.setState({ hydrated: true }),
    },
  ),
);

export const useProject = (id: string) => useStudio((s) => s.projects.find((p) => p.id === id));

export type ConvertMode = { kind: "neu"; season: number; episode: number } | { kind: "aktualisieren"; sceneId: string };

/** All scenes (anywhere in the project) converted from the given manga page. */
export function scenesFromPage(p: Project, pageId: string) {
  return p.seasons.flatMap((s, si) => s.episodes.flatMap((e, ei) =>
    e.scenes.map((sc) => ({ sc, si, ei, label: `${s.title} · ${e.title} · ${sc.title}` })).filter((x) => x.sc.sourcePageId === pageId)));
}

/**
 * Converts a page into a scene inside the (mutable) project draft.
 * "aktualisieren" keeps scene/shot IDs, titles, colours and manual animation edits (camera, duration, fight, status)
 * for panels that still exist; refreshed fields come from the page. A changed job prompt resets the status to "entwurf".
 * Running it twice in a row yields the same result (idempotent). Returns the scene id.
 */
export function convertPageInto(d: Project, pageId: string, mode: ConvertMode): string {
  const vi = d.volumes.findIndex((v) => v.pages.some((pg) => pg.id === pageId));
  if (vi < 0) throw new Error("Seite nicht gefunden");
  const pi = d.volumes[vi].pages.findIndex((pg) => pg.id === pageId);
  const fresh = pageToScene(d.volumes[vi].pages[pi], pi, d.characters);
  if (mode.kind === "neu") {
    d.seasons[mode.season].episodes[mode.episode].scenes.push(fresh);
    return fresh.id;
  }
  const target = scenesFromPage(d, pageId).find((x) => x.sc.id === mode.sceneId)?.sc;
  if (!target) throw new Error("Szene gehört nicht zu dieser Seite");
  target.isFight = fresh.isFight;
  target.shots = fresh.shots.map((n) => {
    const old = target.shots.find((o) => o.sourcePanelId === n.sourcePanelId);
    if (!old) return n;
    return { ...n, id: old.id, camera: old.camera, duration: old.duration, fight: old.fight || n.fight,
      jobStatus: old.jobPrompt === n.jobPrompt ? old.jobStatus : "entwurf" };
  }).concat(target.shots.filter((o) => !o.sourcePanelId)); // manually added shots are kept
  return target.id;
}