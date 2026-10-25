import { describe, expect, it } from "vitest";
import { createDemoProject } from "@/lib/demo";
import { pageToScene } from "@/lib/store";
import { buildStoryboard, validatePage, pageHasBlockingErrors } from "@/lib/storyboard";

describe("workflow: validation and conversion", () => {
  it("blocks page 1 when an English bubble is missing", () => {
    const p = createDemoProject();
    p.volumes[0].pages[0].panels[2].bubbles[0].textEn = "";
    expect(pageHasBlockingErrors(p, "demo-pg1")).toBe(true);
    expect(validatePage(p, "demo-pg1").some((i) => i.message.includes("Panel 3: Sprechblase ohne EN"))).toBe(true);
  });
  it("accepts the corrected demo page 1", () => {
    const p = createDemoProject();
    expect(pageHasBlockingErrors(p, "demo-pg1")).toBe(false);
    expect(validatePage(p, "demo-pg1").some((i) => i.message.includes("Panel 3: Sprechblase ohne EN"))).toBe(false);
  });
  it("unblocks the page once the bubble is filled; missing images stay warnings", () => {
    const p = createDemoProject();
    p.volumes[0].pages[0].panels[2].bubbles[0].textEn = "You're late, blade-bearer.";
    expect(pageHasBlockingErrors(p, "demo-pg1")).toBe(false);
    expect(validatePage(p, "demo-pg1").filter((i) => i.message.includes("kein Bild"))).toHaveLength(3);
  });
  it("does not include issues from other pages", () => {
    const issues = validatePage(createDemoProject(), "demo-pg1");
    expect(issues.some((i) => i.message.includes("S.2"))).toBe(false);
  });
  it("builds a timed shotlist with character codes from the converted scene", () => {
    const p = createDemoProject();
    const scene = pageToScene(p.volumes[0].pages[0], 0, p.characters);
    const sb = buildStoryboard(p, scene);
    expect(sb.shots.map((s) => s.start)).toEqual([0, 3, 6]);
    expect(sb.totalDuration).toBe(9);
    expect(sb.shots[1].cast).toEqual(["CHR-001"]);
    expect(sb.scene.sourcePage).toBe("Band 1 S.1");
    expect(sb.shots.every((s) => s.panelImage === false)).toBe(true);
  });
});