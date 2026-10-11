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
    expect(resolved.x).toBe(468);
    expect(resolved.y).toBe(260);
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
    expect(resolved.y).toBe(260);
    expect(resolved.width).toBe(420);
  });

  it("resolves center to the horizontal center", () => {
    const resolved = resolveImagePlacement(
      { ...baseImage, layoutPreset: "center" },
      0,
      stageWidth,
      stageHeight,
    );
    expect(resolved.x).toBe(242);
    expect(resolved.y).toBe(260);
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
    expect(resultRight.pages[0].images[0].x).toBe(468);
  });

  it("centers text vertically when verticalAlign is center", () => {
    const configTop = getDefaultConfig("wechat-cover-2.35");
    configTop.algorithm.verticalAlign = "top";
    const markdown = `# 微信封面大标题
副标题简述`;

    const resTop = runTypeset({ markdown, config: configTop });
    const topY = resTop.pages[0].lines[0].y;

    const configCenter = getDefaultConfig("wechat-cover-2.35");
    configCenter.algorithm.verticalAlign = "center";
    const resCenter = runTypeset({ markdown, config: configCenter });
    const centerY = resCenter.pages[0].lines[0].y;

    // Centered Y must be significantly greater than top Y (pushed down towards middle)
    expect(centerY).toBeGreaterThan(topY + 100);
  });

  it("centers text horizontally when textAlign is center", () => {
    const configLeft = getDefaultConfig("longform-3-4");
    configLeft.algorithm.textAlign = "left";
    const markdown = `# 居中测试标题`;

    const resLeft = runTypeset({ markdown, config: configLeft });
    const leftX = resLeft.pages[0].lines[0].x;

    const configCenter = getDefaultConfig("longform-3-4");
    configCenter.algorithm.textAlign = "center";
    const resCenter = runTypeset({ markdown, config: configCenter });
    const centerX = resCenter.pages[0].lines[0].x;

    expect(centerX).toBeGreaterThan(leftX + 50);
  });

  it("ignores isAbsolute images during text obstacle flow", () => {
    const config = getDefaultConfig("longform-3-4");
    const markdown = `这是一段超长的连续正文文本，用于测试绝对定位图层是否会被正文无视而直接穿过。`;

    // 1. Flow image blocks text width
    const resFlow = runTypeset({
      markdown,
      images: [{ ...baseImage, layoutPreset: "mid-left", width: 420, isAbsolute: false }],
      config,
    });

    // 2. Absolute image does NOT block text
    const resAbs = runTypeset({
      markdown,
      images: [{ ...baseImage, isAbsolute: true, x: 50, y: 50, width: 420, rotate: 15, zIndex: 20 }],
      config,
    });

    // In absolute mode, line should have wider maxWidth or unhindered flow
    expect(resAbs.pages[0].lines[0].x).toBe(0);
    expect(resAbs.pages[0].images[0].rotate).toBe(15);
    expect(resAbs.pages[0].images[0].zIndex).toBe(20);
  });

  it("ensures all layout presets on Page 2 remain inside visible canvas bounds even with stale coordinates", () => {
    const presets = ["auto", "mid-left", "mid-right", "center", "staggered", "corner-soft", "fill"] as const;
    const staleYImage: FlowImage = {
      id: "img_page2",
      src: "https://example.com/p2.png",
      alt: "P2图",
      width: 420,
      height: 280,
      y: 1100, // stale out-of-bounds Y coordinate from previous preset
      pageIndex: 2,
    };

    for (const preset of presets) {
      const resolved = resolveImagePlacement(
        { ...staleYImage, layoutPreset: preset },
        0, // index 0 on Page 2
        stageWidth,
        stageHeight,
      );

      // Y must be >= 0 and image bottom must be <= stageHeight
      expect(resolved.y).toBeGreaterThanOrEqual(0);
      expect(resolved.y + resolved.height).toBeLessThanOrEqual(stageHeight);
      expect(resolved.x).toBeGreaterThanOrEqual(0);
      expect(resolved.x + resolved.width).toBeLessThanOrEqual(stageWidth);
    }
  });

  it("preserves manual coordinates when layoutPreset is custom", () => {
    const customImage: FlowImage = {
      id: "img_custom",
      src: "https://example.com/custom.png",
      alt: "自定义图",
      width: 300,
      height: 200,
      x: 120,
      y: 350,
      layoutPreset: "custom",
    };

    const resolved = resolveImagePlacement(customImage, 0, stageWidth, stageHeight);
    expect(resolved.x).toBe(120);
    expect(resolved.y).toBe(350);
    expect(resolved.width).toBe(300);
    expect(resolved.height).toBe(200);
  });
});
