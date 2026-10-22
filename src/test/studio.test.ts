import { describe, expect, it } from "vitest";
import { createDemoProject } from "@/lib/demo";
import { findEmptyBubbles, pageToScene, migrateProject, nextCharCode, validateProject } from "@/lib/store";
import { layoutCount } from "@/lib/layouts";

describe("studio rules", () => {
  it("flags bubbles missing DE or EN text", () => {
    const e = findEmptyBubbles(createDemoProject());
    expect(e.map((x) => x.missing)).toEqual([["EN"], ["DE", "EN"]]);
  });
  it("converts one manga panel into one storyboard shot", () => {
    const p = createDemoProject();
    const scene = pageToScene(p.volumes[0].pages[0], 0, p.characters);
    expect(scene.shots).toHaveLength(3);
    expect(scene.shots[1].subtitleDe).toBe("Kai Hoshino: Sie ist hier.");
  });
  it("carries panel character IDs into storyboard shots", () => {
    const p = createDemoProject();
    const scene = pageToScene(p.volumes[0].pages[0], 0, p.characters);
    expect(scene.shots[2].cast).toEqual(["demo-c2"]);
    expect(scene.shots[2].jobPrompt).toContain("CHR-002");
  });
  it("assigns the next sequential character ID", () => {
    expect(nextCharCode(createDemoProject().characters)).toBe("CHR-003");
  });
  it("migrates old string reference images and adds IDs", () => {
    const m = migrateProject({ characters: [{ id: "x", name: "A", refImages: ["data:a"] }], volumes: [], seasons: [] });
    expect(m.characters[0].code).toBe("CHR-001");
    expect(m.characters[0].refImages[0].use).toBe("beide");
  });
  it("reports panels without images", () => {
    expect(validateProject(createDemoProject()).filter((i) => i.message.includes("kein Bild"))).toHaveLength(5);
  });
  it("layout panel counts", () => {
    expect([layoutCount("3L"), layoutCount("5"), layoutCount("6")]).toEqual([3, 5, 6]);
  });
});