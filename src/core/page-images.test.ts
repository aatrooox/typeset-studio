import { describe, expect, it } from "bun:test";
import { getDefaultConfig, runTypeset } from "./engine";
import { FlowImage } from "./types";
import { parseInlineRuns } from "./inline-text";

describe("Multi-Page Image Assignment & Intra-Page Ordering", () => {
  const config = getDefaultConfig("longform-3-4");

  it("places image on Page 2 when explicit page split and pageIndex = 2", () => {
    const markdown = `【第一页】
这是第一页的正文内容，包含一些关于大模型纯算法排版的描述。

【第二页】
这是第二页的正文内容，包含关于图片避让与多页排版的测试说明。`;

    const images: FlowImage[] = [
      {
        id: "img_p1",
        src: "https://example.com/p1.png",
        alt: "第一页图",
        pageIndex: 1,
        width: 300,
        height: 200,
      },
      {
        id: "img_p2",
        src: "https://example.com/p2.png",
        alt: "第二页图",
        pageIndex: 2,
        width: 300,
        height: 200,
      },
    ];

    const result = runTypeset({ markdown, images, config });

    expect(result.pageCount).toBe(2);
    // Page 1 should contain img_p1 and NOT img_p2
    expect(result.pages[0]?.images.length).toBe(1);
    expect(result.pages[0]?.images[0]?.id).toBe("img_p1");

    // Page 2 should contain img_p2 and NOT img_p1
    expect(result.pages[1]?.images.length).toBe(1);
    expect(result.pages[1]?.images[0]?.id).toBe("img_p2");
  });

  it("places absolute layer image on Page 2 when pageIndex = 2", () => {
    const markdown = `【第一页】
正文 1

【第二页】
正文 2`;

    const images: FlowImage[] = [
      {
        id: "img_abs_p2",
        src: "https://example.com/abs.png",
        alt: "第二页贴纸",
        isAbsolute: true,
        pageIndex: 2,
        x: 50,
        y: 100,
        width: 200,
        height: 150,
      },
    ];

    const result = runTypeset({ markdown, images, config });

    expect(result.pageCount).toBe(2);
    expect(result.pages[0]?.images.length).toBe(0);
    expect(result.pages[1]?.images.length).toBe(1);
    expect(result.pages[1]?.images[0]?.id).toBe("img_abs_p2");
  });

  it("respects image array order when multiple images belong to the same page", () => {
    const markdown = `# 同一页内多图顺序测试\n测试同一页面内两个图片的先后排列顺序。`;

    const imgA: FlowImage = {
      id: "img_a",
      src: "https://example.com/a.png",
      alt: "图片 A",
      pageIndex: 1,
      layoutPreset: "auto",
    };

    const imgB: FlowImage = {
      id: "img_b",
      src: "https://example.com/b.png",
      alt: "图片 B",
      pageIndex: 1,
      layoutPreset: "auto",
    };

    // Case 1: [A, B]
    const result1 = runTypeset({ markdown, images: [imgA, imgB], config });
    const page1Images = result1.pages[0]?.images || [];
    expect(page1Images.length).toBe(2);
    expect(page1Images[0]?.id).toBe("img_a");
    expect(page1Images[1]?.id).toBe("img_b");

    // Case 2: Reordered to [B, A]
    const result2 = runTypeset({ markdown, images: [imgB, imgA], config });
    const page2Images = result2.pages[0]?.images || [];
    expect(page2Images.length).toBe(2);
    expect(page2Images[0]?.id).toBe("img_b");
    expect(page2Images[1]?.id).toBe("img_a");
  });
});

const config = getDefaultConfig();
const textOf = (result: ReturnType<typeof runTypeset>) => result.pages.flatMap((page) => page.lines).map((line) => line.text).join("");

describe("Pagination regressions", () => {
  it("ignores empty highlight terms and reuses matching across styled fragments", () => {
    const runs = parseInlineRuns("正文**正文**正文", ["", "正文"]);
    expect(runs.map((run) => run.text).join("")).toBe("正文正文正文");
    expect(runs.every((run) => run.highlight)).toBe(true);
    expect(parseInlineRuns("a.b", ["", "."])[1]).toEqual({ text: ".", highlight: true });
  });

  it("retains every character of overflowing manual segments and their images", () => {
    const first = "甲乙丙丁戊己庚辛壬癸".repeat(180);
    const result = runTypeset({ markdown: first + "\n---\n第二段", config, images: [
      { id: "second", src: "data:,", alt: "", pageIndex: 2, isAbsolute: true, width: 20, height: 20 },
    ] });
    expect(textOf(result)).toBe(first + "第二段");
    expect(result.pages.at(-1)?.images[0]?.id).toBe("second");
    expect(result.pages.map((page) => page.pageNumber)).toEqual(result.pages.map((_, index) => index + 1));
  });

  it("keeps explicit later images and intervening empty pages", () => {
    const result = runTypeset({ markdown: "正文", config, images: [
      { id: "late", src: "data:,", alt: "", pageIndex: 4, width: 20, height: 20 },
    ] });
    expect(result.pageCount).toBe(4);
    expect(result.pages[1]?.lines).toHaveLength(0);
    expect(result.pages[3]?.images[0]?.id).toBe("late");
  });

  it("applies global and per-page target fills without losing content", () => {
    const markdown = "正文段落测试".repeat(250);
    const normal = runTypeset({ markdown, config });
    const limited = runTypeset({ markdown, config, pageFillRatios: { 1: 0.35 } });
    expect(limited.pages[0].lines.length).toBeLessThan(normal.pages[0].lines.length);
    expect(textOf(limited)).toBe(markdown);
  });

  it("enforces min and max pages without truncating or inventing blank pages", () => {
    const markdown = "正文段落测试".repeat(80);
    const result = runTypeset({ markdown, config, minPages: 3 });
    expect(result.pageCount).toBeGreaterThanOrEqual(3);
    expect(textOf(result)).toBe(markdown);
    expect(() => runTypeset({ markdown: markdown.repeat(10), config, maxPages: 1 })).toThrow("maxPages=1");
    expect(() => runTypeset({ markdown: "短文", config, minPages: 3 })).toThrow("minPages=3");
  });
});

// 固定素材页码对应最终输出页，重复素材不能驱动额外分页。
describe("Fixed asset pagination", () => {
  const fixed: FlowImage = { id: "bg", src: "bg.png", alt: "", templateAssetKey: "background", isAbsolute: true, x: 0, y: 0, width: 20, height: 20, repeatEveryPage: true };
  it("repeats on automatic pages without consuming content image slots", () => {
    const result = runTypeset({ markdown: "正文测试".repeat(400), config, images: [fixed,
      { id: "body", src: "body.png", alt: "", isAbsolute: true, width: 20, height: 20 },
    ] });
    expect(result.pageCount).toBeGreaterThan(1);
    expect(result.pages.every((page) => page.images.filter((image) => image.id === "bg").length === 1)).toBe(true);
    expect(result.pages[0].images.some((image) => image.id === "body")).toBe(true);
    const short = runTypeset({ markdown: "短文", config, images: [{ ...fixed, pageIndex: 40 }] });
    expect(short.pageCount).toBe(1);
  });
  it("uses final output page numbers across manual overflow and repeats on continuation pages", () => {
    const result = runTypeset({ markdown: "正文测试".repeat(400) + "\n---\n第二段", config, images: [fixed,
      { ...fixed, id: "only", templateAssetKey: "logo", repeatEveryPage: false, pageIndex: 2 },
    ] });
    expect(result.pages.every((page) => page.images.some((image) => image.id === "bg"))).toBe(true);
    expect(result.pages.filter((page) => page.images.some((image) => image.id === "only")).map((page) => page.pageNumber)).toEqual([2]);
    const gaps = runTypeset({ markdown: "甲\n---\n乙", config, images: [{ ...fixed, repeatEveryPage: false, pageIndex: 4 }] });
    expect(gaps.pageCount).toBe(4);
    expect(gaps.pages[3].images[0].id).toBe("bg");
  });
  it("preserves saved flow asset coordinates when ordinary image counts change", () => {
    const asset = { ...fixed, repeatEveryPage: false, isAbsolute: false, layoutPreset: "mid-right" as const, x: 100, y: 300, width: 120, height: 80 };
    const ordinary: FlowImage = { id: "ordinary", src: "body.png", alt: "", isAbsolute: true, width: 20, height: 20 };
    for (const images of [[asset], [ordinary, { ...ordinary, id: "second" }, asset]]) {
      const result = runTypeset({ markdown: "正文测试".repeat(400), config, images });
      for (const page of result.pages) {
        if (page.pageNumber === 1) expect(page.images.find((image) => image.id === asset.id)).toMatchObject({ x: 100, y: 300, width: 120, height: 80 });
        else expect(page.images.some((image) => image.id === asset.id)).toBe(false);
      }
      expect(result.pages[0].images.filter((image) => !image.templateAssetKey)).toHaveLength(images.length - 1);
    }
  });
  it("rejects repeating flow assets before pagination", () => {
    expect(() => runTypeset({ markdown: "正文", config, images: [{ ...fixed, isAbsolute: false, width: 2000, height: 2000 }] }))
      .toThrow("每页重复仅支持自由定位模式");
  });
});
