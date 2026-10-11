import { describe, expect, it } from "bun:test";
import { getDefaultConfig, runTypeset } from "./engine";
import { renderPageToPng, renderTypesetResultToPngs } from "./canvas-renderer";

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
