import { describe, expect, it } from "bun:test";
import { getDefaultConfig, runTypeset } from "./engine";
import { FlowImage } from "./types";

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
