/** Panel compositions. `areas` is a CSS grid-template-areas string; letters a..f map to panels in order. */
export interface LayoutDef { id: string; label: string; cols: string; rows: string; areas: string[] }

export const LAYOUTS: LayoutDef[] = [
  { id: "1", label: "Splash", cols: "1fr", rows: "1fr", areas: ["a"] },
  { id: "2", label: "2 Reihen", cols: "1fr", rows: "1fr 1fr", areas: ["a", "b"] },
  { id: "2v", label: "2 Spalten", cols: "1fr 1fr", rows: "1fr", areas: ["a b"] },
  { id: "3", label: "3 Reihen", cols: "1fr", rows: "1.2fr 1fr 1fr", areas: ["a", "b", "c"] },
  { id: "3L", label: "Groß oben", cols: "1fr 1fr", rows: "1.6fr 1fr", areas: ["a a", "b c"] },
  { id: "3R", label: "Groß links", cols: "1.4fr 1fr", rows: "1fr 1fr", areas: ["a b", "a c"] },
  { id: "4", label: "Raster 2×2", cols: "1fr 1fr", rows: "1fr 1fr", areas: ["a b", "c d"] },
  { id: "4W", label: "Breitbild + 3", cols: "1fr 1fr 1fr", rows: "1.3fr 1fr", areas: ["a a a", "b c d"] },
  { id: "5", label: "Action 5", cols: "1fr 1fr", rows: "1fr 1.3fr 1fr", areas: ["a b", "c c", "d e"] },
  { id: "5T", label: "Treppe", cols: "1.5fr 1fr", rows: "1fr 1fr 1fr", areas: ["a b", "c b", "d e"] },
  { id: "6", label: "Klassisch 6", cols: "1fr 1fr", rows: "1fr 1fr 1fr", areas: ["a b", "c d", "e f"] },
];

export const getLayout = (id: string) => LAYOUTS.find((l) => l.id === id) ?? LAYOUTS[3];
export const layoutCount = (id: string) => new Set(getLayout(id).areas.join(" ").split(" ")).size;
export const areaName = (i: number) => "abcdef"[i];