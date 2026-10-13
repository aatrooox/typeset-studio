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
