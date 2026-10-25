import type { Project } from "./store";

export function createDemoProject(): Project {
  const kai = "demo-c1", rei = "demo-c2";
  const p1 = "demo-pg1", p2 = "demo-pg2";
  return {
    id: "demo-project",
    title: "Klinge der Aschenacht",
    logline: "Ein Schwertkämpfer mit rot glühenden Augen jagt die Hexe, die seine Stadt in Asche verwandelte.",
    genre: "Dark Fantasy / Action",
    updatedAt: Date.now(),
    bible: {
      world: "Die Stadt Kurogane liegt unter ewigem Aschenregen. Laternen brennen nur mit Seelenfeuer.",
      magic: "Seelenfeuer: Magie erscheint immer farbig (Cyan) in einer sonst schwarzweißen Welt. Augen von Magiebegabten leuchten.",
      themes: "Schuld, Vergebung, der Preis von Macht.",
      timeline: "Jahr 0: Der Aschenfall\nJahr 7: Kai verlässt das Dojo\nJahr 8: Begegnung mit Rei",
    },
    cover: { titleDe: "Klinge der Aschenacht", titleEn: "Blade of the Ashen Night", subtitle: "Band 1 — Seelenfeuer", accent: "#e8364a" },
    characters: [
      { id: kai, code: "CHR-001", name: "Kai Hoshino", role: "Protagonist", description: "Wortkarg, Narbe über dem linken Auge, langes Katana.", eyeColor: "#e8364a", refImages: [] },
      { id: rei, code: "CHR-002", name: "Rei Amane", role: "Rivalin / Hexe", description: "Weißes Haar, Mantel aus Asche, spricht in Rätseln.", eyeColor: "#38d6f0", refImages: [] },
    ],
    volumes: [{
      id: "demo-v1", title: "Band 1",
      pages: [
        { id: p1, layout: "3L", panels: [
          { id: "demo-pn1", description: "Totale: Aschenregen über Kurogane, Kai steht auf einem Dach.", shotType: "Totale", bw: true, fx: "screentone", fxColor: "#38d6f0", cast: [kai], bubbles: [
            { id: "demo-b1", type: "erzaehler", textDe: "Acht Jahre nach dem Aschenfall …", textEn: "Eight years after the Ashfall…", x: 6, y: 6 } ] },
          { id: "demo-pn2", description: "Nahaufnahme: Kais rot leuchtende Augen.", shotType: "Nahaufnahme", bw: true, fx: "keiner", fxColor: "#38d6f0", eyeColor: "#e8364a", cast: [kai], bubbles: [
            { id: "demo-b2", type: "denken", speakerId: kai, textDe: "Sie ist hier.", textEn: "She's here.", x: 55, y: 10 } ] },
          { id: "demo-pn3", description: "Halbtotale: Rei erscheint in einer cyanfarbenen Flamme.", shotType: "Halbtotale", bw: true, fx: "magie", fxColor: "#38d6f0", cast: [rei], bubbles: [
            { id: "demo-b3", type: "sprechen", speakerId: rei, textDe: "Du kommst spät, Klingenträger.", textEn: "You\'re late, swordbearer.", x: 50, y: 8 } ] },
        ] },
        { id: p2, layout: "2v", panels: [
          { id: "demo-pn4", description: "Kai springt mit gezogenem Schwert, Speedlines.", shotType: "Halbtotale", bw: true, fx: "speedlines", fxColor: "#38d6f0", cast: [kai], bubbles: [
            { id: "demo-b4", type: "schrei", speakerId: kai, textDe: "HAAA!", textEn: "HAAA!", x: 10, y: 10 } ] },
          { id: "demo-pn5", description: "Klinge trifft auf Magieschild, Funken.", shotType: "Nahaufnahme", bw: true, fx: "magie", fxColor: "#38d6f0", cast: [kai, rei], bubbles: [
            { id: "demo-b5", type: "sprechen", textDe: "", textEn: "", x: 40, y: 60 } ] },
        ] },
      ],
    }],
    seasons: [{
      id: "demo-s1", title: "Staffel 1",
      episodes: [{
        id: "demo-e1", title: "Episode 1 — Aschenregen", synopsis: "Kai trifft auf Rei. Erster Kampf auf den Dächern.",
        voiceTracks: [
          { id: "demo-vt1", characterId: kai, lang: "DE", label: "Kai – Synchro DE" },
          { id: "demo-vt2", characterId: rei, lang: "EN", label: "Rei – Dub EN" },
        ],
        scenes: [{
          id: "demo-sc1", title: "Dachkampf", sourcePageId: p2, bw: true, eyeColor: "#e8364a", magicColor: "#38d6f0", isFight: true,
          shots: [
            { id: "demo-sh1", description: "Kai springt vom Dach", duration: 2, camera: "Kamerafahrt seitlich", shotSize: "Halbtotale", fight: "Sprung, Überkopfschlag", subtitleDe: "Kai: HAAA!", subtitleEn: "Kai: HAAA!", jobPrompt: "Schwarzweiß, Speedlines, Sprung mit Katana, rote Augen", jobStatus: "bereit", cast: [kai] },
            { id: "demo-sh2", description: "Klinge trifft Schild", duration: 3, camera: "Crash-Zoom", shotSize: "Nahaufnahme", fight: "Block durch Magieschild, Funken", subtitleDe: "", subtitleEn: "", jobPrompt: "Schwarzweiß, cyanfarbener Magieschild", jobStatus: "entwurf", cast: [kai, rei] },
          ],
        }],
      }],
    }],
  };
}