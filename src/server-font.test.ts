import { expect, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { registerArticleCoverFont } from "./server-font";
import { ARTICLE_COVER_FONT, ARTICLE_COVER_IMAGE_KEY, createArticleCoverConfig } from "./cover";
import { runTypeset } from "./core/engine";
import { applyTemplateImages } from "./core/template";
import { renderPageToPng } from "./core/canvas-renderer";
import { createCanvas, loadImage } from "@napi-rs/canvas";

test("strict cover font rejects missing, relative and mismatched font bytes", async () => {
  const directory = await mkdtemp(join(tmpdir(), "typeset-font-"));
  try {
    const file = join(directory, "wrong.ttc"); await writeFile(file, "invalid-font");
    expect(() => registerArticleCoverFont({ path: "relative.ttc" })).toThrow("trusted absolute path");
    expect(() => registerArticleCoverFont({ path: join(directory, "missing.ttc") })).toThrow("unavailable");
    expect(() => registerArticleCoverFont({ path: file })).toThrow("hash mismatch");
  } finally { await rm(directory, { recursive: true }); }
});

const fontPath = process.env.TYPESET_ARTICLE_COVER_FONT_PATH;
test.skipIf(!fontPath)("trusted font renders 3350 PNG, left-only text and a non-stretched right square; long title fails", async () => {
  expect(registerArticleCoverFont({ path: fontPath! })).toEqual(ARTICLE_COVER_FONT);
  const config = createArticleCoverConfig({
    id: "12345678-1234-4234-8234-123456789abc", name: "权威封面",
    controls: { backgroundColor: "#ffffff", titleColor: "#123456", fontSize: 120, textAlign: "center", safePadding: 120 },
    assetId: "87654321-4321-4321-8321-cba987654321",
  });
  const square = createCanvas(1000, 1000); const squareContext = square.getContext("2d");
  squareContext.fillStyle = "#ff0000"; squareContext.fillRect(0, 0, 1000, 1000);
  const images = applyTemplateImages([], config.images, { [ARTICLE_COVER_IMAGE_KEY]: square.toDataURL("image/png") });
  const result = runTypeset({ markdown: "# 可信字体封面", config, images, maxPages: 1 });
  expect(result.pageCount).toBe(1);
  for (const line of result.pages[0]!.lines) {
    expect(line.x + config.algorithm.safeArea.left).toBeGreaterThanOrEqual(120);
    const width = line.fragments.reduce((sum, fragment) => sum + fragment.occupiedWidth + (fragment.gapBefore || 0), 0);
    expect(line.x + width + config.algorithm.safeArea.left).toBeLessThanOrEqual(2230);
  }
  const png = await renderPageToPng(result.pages[0]!, result.canvasSpec, result.config, 1);
  expect(png.readUInt32BE(16)).toBe(3350); expect(png.readUInt32BE(20)).toBe(1000);
  const canvas = createCanvas(3350, 1000); const context = canvas.getContext("2d"); context.drawImage(await loadImage(png), 0, 0);
  expect(Array.from(context.getImageData(3350 - 1, 0, 1, 1).data)).toEqual([255, 0, 0, 255]);
  expect(Array.from(context.getImageData(2350, 999, 1, 1).data)).toEqual([255, 0, 0, 255]);
  expect(() => runTypeset({ markdown: `# ${"超长标题".repeat(200)}`, config, images, maxPages: 1 })).toThrow();
});
