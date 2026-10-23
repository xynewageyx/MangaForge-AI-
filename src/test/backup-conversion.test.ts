import { describe, it, expect } from "vitest";
import { newProject, convertPageInto, migrateProject } from "../lib/store";
import { buildBackup, parseBackup } from "../lib/backup";

describe("MangaForge backup", () => {
  it("round-trips projects", () => {
    const p = newProject("Backup-Test");
    const result = parseBackup(JSON.stringify(buildBackup([p])));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.projects[0].title).toBe(p.title);
  });
  it("accepts a valid empty backup", () => {
    const result = parseBackup(JSON.stringify(buildBackup([])));
    expect(result.ok).toBe(true);
    if (result.ok) { expect(result.projects).toEqual([]); expect(result.warnings).toEqual([]); }
  });
  it("rejects broken JSON", () => {
    expect(parseBackup("{bad").ok).toBe(false);
  });
  it("rejects storyboard instead of backup", () => {
    expect(parseBackup(JSON.stringify({ format: "mangaforge.storyboard" })).ok).toBe(false);
  });
  it("rejects duplicate project IDs", () => {
    const p = newProject("Duplicate");
    expect(parseBackup(JSON.stringify(buildBackup([p, p]))).ok).toBe(false);
  });
  it("migrates older character data", () => {
    const p = newProject("Old");
    p.characters.push({ id: "c1", name: "Hero", role: "", description: "", eyeColor: "#ffffff" } as any);
    const migrated = migrateProject(p);
    expect(migrated.characters[0].code).toBe("CHR-001");
    expect(migrated.characters[0].refImages).toEqual([]);
  });
});

describe("Manga-to-anime conversion", () => {
  it("updates the same scene without duplicating it", () => {
    const p = newProject("Convert");
    const page = p.volumes[0].pages[0];
    const id = convertPageInto(p, page.id, { kind: "neu", season: 0, episode: 0 });
    const episode = p.seasons[0].episodes[0];
    const shotId = episode.scenes[0].shots[0].id;
    episode.scenes[0].shots[0].camera = "Crash-Zoom";
    convertPageInto(p, page.id, { kind: "aktualisieren", sceneId: id });
    convertPageInto(p, page.id, { kind: "aktualisieren", sceneId: id });
    expect(episode.scenes).toHaveLength(1);
    expect(episode.scenes[0].shots[0].id).toBe(shotId);
    expect(episode.scenes[0].shots[0].camera).toBe("Crash-Zoom");
  });
  it("resets changed panel jobs to draft", () => {
    const p = newProject("Changed");
    const page = p.volumes[0].pages[0];
    const id = convertPageInto(p, page.id, { kind: "neu", season: 0, episode: 0 });
    const shot = p.seasons[0].episodes[0].scenes[0].shots[0];
    shot.jobStatus = "bereit";
    page.panels[0].description = "Neue Bewegung";
    convertPageInto(p, page.id, { kind: "aktualisieren", sceneId: id });
    expect(p.seasons[0].episodes[0].scenes[0].shots[0].jobStatus).toBe("entwurf");
  });
});
