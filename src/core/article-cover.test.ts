import { describe, expect, it } from "bun:test";
import { ARTICLE_COVER_FONT, ARTICLE_COVER_IMAGE_KEY, createArticleCoverConfig, validateArticleCoverControls } from "./article-cover";
import { applyTemplateImages } from "./template";
import { drawPageToContext } from "./canvas-draw";
import { getCanvasSpec } from "./geometry";

const id = "12345678-1234-4234-8234-123456789abc";
const assetId = "87654321-4321-4321-8321-cba987654321";
const controls = { backgroundColor: "#F1F8FF", titleColor: "#123ABC", fontSize: 120, textAlign: "center", safePadding: 120 };

describe("finite article-cover contract", () => {
  it("normalizes finite controls and rejects paths, extra schema and invalid ranges", () => {
    expect(validateArticleCoverControls(controls)).toMatchObject({ backgroundColor: "#f1f8ff", titleColor: "#123abc" });
    for (const input of [{ ...controls, fontSize: 79 }, { ...controls, fontSize: 201 }, { ...controls, safePadding: 59 }, { ...controls, safePadding: 201 }, { ...controls, fontSize: 80.5 }, { ...controls, fontPath: "/private/font" }, { ...controls, backgroundColor: "url(https://invalid)" }, { ...controls, schemaVersion: 99 }]) {
      expect(() => validateArticleCoverControls(input)).toThrow();
    }
    expect(() => createArticleCoverConfig({ id, name: "非法路径", controls, assetId: "/private/image" })).toThrow();
  });

  it("fixes title and square regions while retaining the historical canvas id and font identity", async () => {
    const config = createArticleCoverConfig({ id, name: "有限封面", controls, assetId });
    expect(getCanvasSpec(config.aspectRatio)).toMatchObject({ width: 3350, height: 1000, ratio: 3.35 });
    const padding = config.algorithm.safeArea;
    expect(3350 - padding.left - padding.right).toBe(2350 - 240);
    expect(config.typography.headingFont).toBe(ARTICLE_COVER_FONT.family);
    for (const font of Object.values(config.coverTheme!.typography)) expect(font).toMatchObject({ fontFamily: ARTICLE_COVER_FONT.family, fontSize: 120, minFontSize: 120 });
    const images = applyTemplateImages([], config.images, { [ARTICLE_COVER_IMAGE_KEY]: "/trusted/square.jpg" });
    expect(images[0]!.src).toBe("/trusted/square.jpg");
    expect(images[0]!.x! + padding.left).toBe(2350); expect(images[0]!.y! + padding.top).toBe(0);
    const draws: unknown[][] = [];
    const context = new Proxy({ drawImage: (...args: unknown[]) => draws.push(args) } as any, { get: (target, key) => key in target ? target[key] : () => {} });
    const source = { width: 2000, height: 1000 };
    await drawPageToContext(context, {
      page: { pageNumber: 1, lines: [], images: images as any, textBottom: 0, fillRatio: 0 },
      spec: getCanvasSpec(config.aspectRatio), config, getImage: async () => source,
    });
    expect(draws).toEqual([[source, 500, 0, 1000, 1000, -500, -500, 1000, 1000]]);
  });
});
