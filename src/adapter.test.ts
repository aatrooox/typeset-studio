import { afterAll, describe, expect, it } from "bun:test";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { typesetStudioAdapter, type ImageRenderInput } from "./adapter";

describe("Typeset Studio — zzhub-pipeline ImageRenderPlugin Adapter", () => {
  const tempTestDir = join(process.cwd(), "tmp", `test-adapter-${Date.now()}`);

  afterAll(() => {
    if (existsSync(tempTestDir)) {
      rmSync(tempTestDir, { recursive: true, force: true });
    }
  });

  it("passes doctor health checks", async () => {
    const checks = await typesetStudioAdapter.doctor?.();
    expect(checks).toBeDefined();
    expect(Array.isArray(checks)).toBe(true);

    const skiaCheck = checks?.find((c) => c.name === "@napi-rs/canvas");
    expect(skiaCheck?.ok).toBe(true);

    const fontCheck = checks?.find((c) => c.name === "local-fonts");
    expect(fontCheck?.ok).toBe(true);
  });

  it("renders wechat-article 2.35:1 cover asset correctly", async () => {
    const outDir = join(tempTestDir, "article");
    const input: ImageRenderInput = {
      title: "大模型架构演进：从密集注意力到专家混合架构",
      bodyText: "# 正文内容...",
      outputDir: outDir,
      route: "wechat-article",
      state: {
        route: {
          account: "default",
          highlight_words: ["大模型", "架构", "注意力"],
        },
      },
      accountVisualParams: {
        footer: "深度技术观察 · 早早集市",
      },
    };

    const result = await typesetStudioAdapter.render(input);

    expect(result.pageCount).toBe(1);
    expect(result.assets.length).toBe(1);
    expect(result.assets[0].kind).toBe("cover");
    expect(result.assets[0].route).toBe("wechat-article");
    expect(result.assets[0].path).toBe(join(outDir, "cover.png"));

    // Verify file actually exists and contains PNG magic bytes
    expect(existsSync(result.assets[0].path)).toBe(true);
    const buf = readFileSync(result.assets[0].path);
    expect(buf[0]).toBe(0x89);
    expect(buf[1]).toBe(0x50); // 'P'
    expect(buf[2]).toBe(0x4e); // 'N'
    expect(buf[3]).toBe(0x47); // 'G'
  });

  it("renders wechat-newspic 3:4 multi-page poster and articles", async () => {
    const outDir = join(tempTestDir, "newspic");
    const multiPageMarkdown = `# 第一页：核心导读
这是长图文第一页的摘要与分析。

<!-- page -->

## 第二页：技术细节展开
这是第二页的深入解析，探讨算法如何解决排版问题。

- 原生矢量字体渲染
- 自动文本避障
- 优雅引言竖线

<!-- page -->

## 第三页：总结与实践
全流程自闭环，已在流水线中跑通。
`;

    const input: ImageRenderInput = {
      title: "长图文空间排版实战手册",
      bodyText: multiPageMarkdown,
      outputDir: outDir,
      route: "wechat-newspic",
      state: {
        route: {
          account: "default",
          highlight_words: ["空间排版", "实战手册", "自闭环"],
        },
        intent: {
          newspic_render: {
            pagination_mode: "multi",
            min_pages: 3,
          },
        },
      },
      accountVisualParams: {
        footer: "Typeset Studio 空间排版引擎",
      },
    };

    const result = await typesetStudioAdapter.render(input);

    // Should produce 1 cover + multiple pages
    expect(result.assets.length).toBeGreaterThanOrEqual(4);

    const coverAsset = result.assets.find((a) => a.kind === "cover");
    expect(coverAsset).toBeDefined();
    expect(coverAsset?.path).toBe(join(outDir, "cover.png"));

    const pageAssets = result.assets.filter((a) => a.kind === "page");
    expect(pageAssets.length).toBeGreaterThanOrEqual(3);

    for (const page of pageAssets) {
      expect(existsSync(page.path)).toBe(true);
      const buf = readFileSync(page.path);
      expect(buf[0]).toBe(0x89);
      expect(buf[1]).toBe(0x50);
      expect(buf[2]).toBe(0x4e);
      expect(buf[3]).toBe(0x47);
    }
  });

  it("handles blog route with zero image output", async () => {
    const outDir = join(tempTestDir, "blog");
    const input: ImageRenderInput = {
      title: "博客文章",
      bodyText: "正文",
      outputDir: outDir,
      route: "blog",
      state: {
        route: { account: "default" },
      },
    };

    const result = await typesetStudioAdapter.render(input);
    expect(result.assets.length).toBe(0);
    expect(result.pageCount).toBe(0);
  });
});
