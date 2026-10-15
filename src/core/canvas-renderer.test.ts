import { describe, expect, it } from "bun:test";
import { getDefaultConfig, runTypeset } from "./engine";
import { renderPageToPng, renderTypesetResultToPngs } from "./canvas-renderer";
import type { PipelineCoverTheme } from "./types";

describe("Server-Side Canvas Native PNG Renderer", () => {
  it("renders a single 2.35:1 WeChat cover page to a valid PNG buffer", async () => {
    const config = getDefaultConfig("wechat-cover-2.35");
    const result = runTypeset({
      markdown: "# 纯算法无头出图测试\n基于 @napi-rs/canvas 毫秒级原生渲染",
      config,
    });

    expect(result.pages.length).toBe(1);
    const pngBuffer = await renderPageToPng(result.pages[0]!, result.canvasSpec, result.config, result.pageCount);

    expect(pngBuffer).toBeInstanceOf(Buffer);
    expect(pngBuffer.length).toBeGreaterThan(1000);
    // PNG Magic header: 0x89 0x50 0x4E 0x47
    expect(pngBuffer[0]).toBe(0x89);
    expect(pngBuffer[1]).toBe(0x50);
    expect(pngBuffer[2]).toBe(0x4e);
    expect(pngBuffer[3]).toBe(0x47);
  });

  it("renders multi-page 3:4 longform article into multiple PNG buffers", async () => {
    const config = getDefaultConfig("longform-3-4");
    const markdown = `# 第一页标题
这里是第一页的正文内容，测试段落排版。

【第二页】
# 第二页标题
这里是第二页的正文内容，测试分页与独立 Canvas 绘制。`;

    const result = runTypeset({
      markdown,
      config,
      highlightWords: ["第一页", "第二页"],
    });

    expect(result.pageCount).toBe(2);
    const pngs = await renderTypesetResultToPngs(result);

    expect(pngs.length).toBe(2);
    expect(pngs[0]!.pageNumber).toBe(1);
    expect(pngs[0]!.buffer.length).toBeGreaterThan(1000);
    expect(pngs[1]!.pageNumber).toBe(2);
    expect(pngs[1]!.buffer.length).toBeGreaterThan(1000);
  });
});

// 绘制顺序必须跨越文字层，页脚开关需要产生真实输出。
describe("Canvas layer regressions", () => {
  it("draws background images, text and foreground images in order", async () => {
    const { drawPageToContext } = await import("./canvas-draw");
    const config = getDefaultConfig();
    const result = runTypeset({ markdown: "正文", config });
    const page = result.pages[0];
    page.images = [
      { id: "front", src: "front", alt: "", x: 0, y: 0, width: 20, height: 20, isAbsolute: true },
      { id: "back", src: "back", alt: "", x: 0, y: 0, width: 20, height: 20, zIndex: 0 },
    ];
    const operations: string[] = [];
    const context = new Proxy({
      drawImage: (image: string) => operations.push(image),
      fillText: (text: string) => operations.push(text),
      measureText: () => ({ width: 20 }),
    } as any, { get: (target, key) => key in target ? target[key] : () => {} });
    config.chrome = { showHeader: false, showFooter: true, showFillRatio: true, showFooterText: false };
    await drawPageToContext(context, { page, spec: result.canvasSpec, config, getImage: async (src) => src });
    expect(operations[0]).toBe("back");
    expect(operations[1]).toBe("正文");
    expect(operations[2]).toBe("front");
    expect(operations[3]).toContain("填充率");
  });
});

it("renders pipeline cover theme gradients, decoration, typography and minimum font size", async () => {
  const { resolveTypesetResult } = await import("../server/routes/render");
  const { createCanvas } = await import("@napi-rs/canvas");
  const font = { fontFamily: "Songti SC", fontSize: 112, minFontSize: 36, fontWeight: 700, lineHeight: 1.3, letterSpacing: 2 };
  const coverTheme: PipelineCoverTheme = {
    id: "test", format: "poster-3-4",
    typography: { title: font, subtitle: font, footer: { ...font, fontSize: 24 } },
    colors: { text: "#171717", accent: "#059669", muted: "#666666" },
    background: { fill: { type: "solid", color: "#ffffff" }, image: null, overlay: null },
    decoration: { pattern: "none", color: "#059669", opacity: 0.1, size: 64, image: null },
    layout: { textAlign: "center", verticalAlign: "center", safeArea: { top: 90, right: 84, bottom: 64, left: 84 } },
  };
  coverTheme.background.fill = { type: "linear", angle: 45, stops: [{ color: "#112233", offset: 0 }, { color: "#334455", offset: 100 }] };
  coverTheme.decoration.pattern = "grid";
  const image = `data:image/png;base64,${createCanvas(5, 5).toBuffer("image/png").toString("base64")}`;
  coverTheme.decoration.image = { src: image, fit: "contain", opacity: 0.3, position: { x: 50, y: 50 } };
  const { result } = resolveTypesetResult({
    kind: "cover", slot: "newspic_cover", maxPages: 1, markdown: "# 封面主题测试",
    config: { coverTheme, algorithm: { ...coverTheme.layout, targetFillRatio: 1 } },
  });
  expect(result.pages[0].lines[0].font).toContain(coverTheme.typography.title.fontFamily);
  const buffer = await renderPageToPng(result.pages[0], result.canvasSpec, result.config, result.pageCount);
  expect(buffer.length).toBeGreaterThan(1000);
  const smallArea = resolveTypesetResult({
    kind: "cover", slot: "newspic_cover", maxPages: 1, markdown: "# 封面主题测试",
    config: { coverTheme, algorithm: { safeArea: { top: 600, bottom: 700, left: 84, right: 84 }, targetFillRatio: 1 } },
  }).result;
  expect(smallArea.config.coverTheme!.typography.title.fontSize).toBeLessThan(font.fontSize);
  expect(smallArea.config.coverTheme!.typography.title.fontSize).toBeGreaterThanOrEqual(font.minFontSize);
});

// 实际像素校验渐变、花纹、边框以及重复渲染的确定性。
describe("Canvas backgrounds and borders", () => {
  it("draws editable fills, every pattern and every border deterministically", async () => {
    const { createCanvas } = await import("@napi-rs/canvas");
    const { drawCanvasFill, drawCanvasPattern, drawCanvasBorder, validateCanvasStyle, DEFAULT_PATTERN, DEFAULT_BORDER, PATTERN_LABELS, BORDER_LABELS } = await import("./canvas-style");
    const spec = { ...runTypeset({ markdown: "", config: getDefaultConfig() }).canvasSpec, width: 120, height: 160 };
    const canvas = createCanvas(spec.width, spec.height);
    const ctx = canvas.getContext("2d");
    const reset = () => { ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, spec.width, spec.height); };
    const pixel = (x: number, y: number) => Array.from(ctx.getImageData(x, y, 1, 1).data);
    const changedPixels = () => Array.from(ctx.getImageData(0, 0, spec.width, spec.height).data).filter((value, index) => index % 4 !== 3 && value !== 255).length;
    drawCanvasFill(ctx as any, spec, { type: "linear", angle: 0, stops: [{ color: "#ff0000", offset: 0 }, { color: "#0000ff", offset: 100 }] });
    expect(pixel(0, 80)[0]).toBeGreaterThan(250);
    expect(pixel(119, 80)[2]).toBeGreaterThan(250);
    drawCanvasFill(ctx as any, spec, { type: "radial", position: { x: 0, y: 0 }, stops: [{ color: "#ffffff", offset: 0 }, { color: "#000000", offset: 100 }] });
    expect(pixel(0, 0)[0]).toBeGreaterThan(pixel(119, 159)[0] + 200);
    for (const pattern of Object.keys(PATTERN_LABELS) as Array<keyof typeof PATTERN_LABELS>) {
      reset();
      drawCanvasPattern(ctx as any, spec, { ...DEFAULT_PATTERN, pattern, color: "#123456", opacity: 1, size: 24 });
      expect(changedPixels() > 0).toBe(pattern !== "none");
      const first = canvas.toBuffer("image/png");
      reset();
      drawCanvasPattern(ctx as any, spec, { ...DEFAULT_PATTERN, pattern, color: "#123456", opacity: 1, size: 24 });
      expect(first.equals(canvas.toBuffer("image/png"))).toBe(true);
    }
    for (const style of Object.keys(BORDER_LABELS) as Array<keyof typeof BORDER_LABELS>) {
      reset();
      drawCanvasBorder(ctx as any, spec, { ...DEFAULT_BORDER, style, inset: 10, width: 2, color: "#123456" });
      expect(changedPixels() > 0).toBe(style !== "none");
    }
    expect(() => validateCanvasStyle({ pattern: { ...DEFAULT_PATTERN, size: 0 } })).toThrow(RangeError);
    expect(() => validateCanvasStyle({ fill: { type: "linear", angle: 0, stops: [{ color: "bad", offset: 0 }, { color: "#000000", offset: 100 }] } })).toThrow(RangeError);
  });

  it("renders all preset templates and retains borders above a fixed image", async () => {
    const { CANVAS_PRESETS } = await import("./canvas-presets");
    const { validateCanvasStyle } = await import("./canvas-style");
    const { createCanvas } = await import("@napi-rs/canvas");
    const { renderPageToCanvas } = await import("./canvas-renderer");
    for (const config of CANVAS_PRESETS) {
      validateCanvasStyle(config.canvasStyle);
      const result = runTypeset({ markdown: "# 模板试色\n记录想法，让文字留在喜欢的背景上。", config });
      expect(result.pageCount).toBe(1);
      const png = await renderPageToPng(result.pages[0], result.canvasSpec, config);
      expect(png.length).toBeGreaterThan(1000);
    }
    const white = createCanvas(10, 10);
    white.getContext("2d").fillStyle = "#ffffff";
    white.getContext("2d").fillRect(0, 0, 10, 10);
    const config = { ...getDefaultConfig(), canvasStyle: { border: { style: "solid" as const, color: "#ff0000", endColor: "#ff0000", inset: 20, width: 8, radius: 0, opacity: 1 } } };
    const result = runTypeset({ markdown: "正文", config, images: [{ id: "bg", src: `data:image/png;base64,${white.toBuffer("image/png").toString("base64")}`, alt: "", isAbsolute: true, zIndex: 0, x: -100, y: -100, width: 2000, height: 2000, templateAssetKey: "background" }] });
    const canvas = await renderPageToCanvas(result.pages[0], result.canvasSpec, config);
    expect(Array.from(canvas.getContext("2d").getImageData(24, 300, 1, 1).data)).toEqual([255, 0, 0, 255]);
  });
});
