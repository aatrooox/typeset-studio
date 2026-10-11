import { describe, expect, it } from "bun:test";
import { resolveImagePlacement } from "./image-layout";
import { runTypeset, getDefaultConfig } from "./engine";
import { FlowImage } from "./types";

describe("resolveImagePlacement and Layout Presets", () => {
  const stageWidth = 904;
  const stageHeight = 1228;

  const baseImage: FlowImage = {
    id: "img_test",
    src: "https://example.com/test.png",
    alt: "测试图",
    width: 420,
    height: 280,
    y: 420,
  };

  it("resolves mid-right to the right side of the stage", () => {
    const resolved = resolveImagePlacement(
      { ...baseImage, layoutPreset: "mid-right" },
      0,
      stageWidth,
      stageHeight,
    );
    // stageWidth (904) - width (420) - padding (16) = 468
    expect(resolved.x).toBe(468);
    expect(resolved.y).toBe(420);
    expect(resolved.width).toBe(420);
  });

  it("resolves mid-left to the left side of the stage", () => {
    const resolved = resolveImagePlacement(
      { ...baseImage, layoutPreset: "mid-left" },
      0,
      stageWidth,
      stageHeight,
    );
    expect(resolved.x).toBe(16);
    expect(resolved.y).toBe(420);
    expect(resolved.width).toBe(420);
  });

  it("resolves center to the horizontal center", () => {
    const resolved = resolveImagePlacement(
      { ...baseImage, layoutPreset: "center" },
      0,
      stageWidth,
      stageHeight,
    );
    // (904 - 420) / 2 = 242
    expect(resolved.x).toBe(242);
    expect(resolved.y).toBe(420);
  });

  it("resolves fill to span full stage width at the bottom", () => {
    const resolved = resolveImagePlacement(
      { ...baseImage, layoutPreset: "fill" },
      0,
      stageWidth,
      stageHeight,
    );
    expect(resolved.x).toBe(0);
    expect(resolved.width).toBe(stageWidth);
    expect(resolved.y).toBeGreaterThan(500);
  });

  it("resolves corner-soft to bottom right", () => {
    const resolved = resolveImagePlacement(
      { ...baseImage, layoutPreset: "corner-soft" },
      0,
      stageWidth,
      stageHeight,
    );
    expect(resolved.x).toBeGreaterThan(400);
    expect(resolved.y).toBeGreaterThan(500);
  });

  it("runTypeset reflows text and positions image dynamically when preset changes", () => {
    const config = getDefaultConfig("longform-3-4");
    const markdown = `# 标题测试
正文段落第一行，这里测试算法排版对图片的动态避让。
第二行文字流向测试。
第三行继续测试。`;

    const resultLeft = runTypeset({
      markdown,
      images: [{ ...baseImage, layoutPreset: "mid-left" }],
      config,
    });
    expect(resultLeft.pages[0].images[0].x).toBe(16);

    const resultRight = runTypeset({
      markdown,
      images: [{ ...baseImage, layoutPreset: "mid-right" }],
      config,
    });
    // Image on right: x = 904 - 420 - 16 = 468
    expect(resultRight.pages[0].images[0].x).toBe(468);
  });
});
