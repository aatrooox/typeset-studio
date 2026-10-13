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

describe("Remote adapter regressions", () => {
  it("authenticates, transfers local bytes and preserves page image summaries", async () => {
    const { app } = await import("./server/index");
    const { getOrGenerateAdminKey } = await import("./server/auth");
    const { createCanvas } = await import("@napi-rs/canvas");
    const { mkdtemp, writeFile, rm } = await import("node:fs/promises");
    const { tmpdir } = await import("node:os");
    const directory = await mkdtemp(join(tmpdir(), "typeset-remote-"));
    const imagePath = join(directory, "source.png");
    await writeFile(imagePath, createCanvas(8, 8).toBuffer("image/png"));
    const requests: any[] = [];
    const server = Bun.serve({ hostname: "127.0.0.1", port: 0, fetch: async (request) => {
      if (request.url.endsWith("/api/render/export")) requests.push(await request.clone().json());
      return app.fetch(request);
    } });
    const previousUrl = process.env.TYPESET_STUDIO_URL;
    const previousKey = process.env.TYPESET_ADMIN_KEY;
    process.env.TYPESET_STUDIO_URL = server.url.toString();
    process.env.TYPESET_ADMIN_KEY = getOrGenerateAdminKey();
    try {
      const progress: string[] = [];
      const output = await typesetStudioAdapter.render({
        route: "wechat-newspic", outputDir: directory, title: "远程测试", bodyText: "完整正文".repeat(100),
        state: { route: { account: "default" } },
        minPages: 3, maxPages: 8,
        bodyImages: [{ marker: "one", path: imagePath }],
        pageSpecs: [{ page: 2, imageMarkers: ["one"], targetFillRatio: 0.5 }],
        accountVisualParams: { bg: "#123456", highlight: "#abcdef", footer: "测试署名", fallbackIcon: imagePath },
        onProgress: (event) => progress.push(event.stage),
      });
      expect(output.pageCount).toBeGreaterThanOrEqual(3);
      expect(output.pages[1].imageCount).toBe(1);
      expect(output.pages[1].imageSources).toEqual([imagePath]);
      expect(requests[1].images[0].src).toStartWith("data:image/png;base64,");
      expect(requests[1].minPages).toBe(3);
      expect(requests[1].pageFillRatios[2]).toBe(0.5);
      expect(requests[1].config.theme.bgColor).toBe("#123456");
      expect(requests[0].config.images[0].id).toBe("account_icon");
      expect(progress).toEqual(["typeset", "cover", "content"]);
      process.env.TYPESET_ADMIN_KEY = "wrong-test-key";
      await expect(typesetStudioAdapter.render({
        route: "wechat-article", outputDir: directory, title: "失败", bodyText: "", state: { route: {} },
      })).rejects.toThrow("401");
    } finally {
      if (previousUrl === undefined) delete process.env.TYPESET_STUDIO_URL; else process.env.TYPESET_STUDIO_URL = previousUrl;
      if (previousKey === undefined) delete process.env.TYPESET_ADMIN_KEY; else process.env.TYPESET_ADMIN_KEY = previousKey;
      server.stop(true);
      await rm(directory, { recursive: true, force: true });
    }
  });
});

it("uses selected/default Studio templates and produces identical fixed assets locally and remotely", async () => {
  const { app } = await import("./server/index");
  const { getOrGenerateAdminKey } = await import("./server/auth");
  const { getDefaultConfig } = await import("./core/engine");
  const { getSlotDefaultTemplateId, setSlotDefaultTemplateId } = await import("./server/routes/templates");
  const { createCanvas } = await import("@napi-rs/canvas");
  const { mkdtemp, writeFile, rm } = await import("node:fs/promises");
  const { tmpdir } = await import("node:os");
  const directory = await mkdtemp(join(tmpdir(), "typeset-fixed-adapter-"));
  const source = join(directory, "background.png");
  const replacement = join(directory, "replacement.png");
  const canvas = createCanvas(20, 20);
  const context = canvas.getContext("2d");
  context.fillStyle = "#ff0000";
  context.fillRect(0, 0, 20, 20);
  await writeFile(source, canvas.toBuffer("image/png"));
  context.fillStyle = "#00ff00";
  context.fillRect(0, 0, 20, 20);
  await writeFile(replacement, canvas.toBuffer("image/png"));
  const headers = { "Content-Type": "application/json", "x-admin-key": getOrGenerateAdminKey() };
  const templateId = "fixed_adapter_test";
  const config = getDefaultConfig("square-1-1");
  const previousUrl = process.env.TYPESET_STUDIO_URL;
  const previousKey = process.env.TYPESET_ADMIN_KEY;
  const previousDefault = getSlotDefaultTemplateId("newspic_cover", "fixed-test");
  const server = Bun.serve({ hostname: "127.0.0.1", port: 0, fetch: (request) => app.fetch(request) });
  try {
    const saved = await app.request("/api/templates", { method: "POST", headers, body: JSON.stringify({
      ...config, id: templateId, images: [{ id: "bg", src: source, alt: "", templateAssetKey: "background", repeatEveryPage: true,
        isAbsolute: true, x: -100, y: -100, width: 1080, height: 1080, zIndex: 0, borderRadius: 0 }],
    }) });
    expect(saved.status).toBe(200);
    setSlotDefaultTemplateId("newspic_cover", templateId, "fixed-test");
    delete process.env.TYPESET_STUDIO_URL;
    const input: ImageRenderInput = { route: "wechat-newspic", title: "模板测试", bodyText: "", outputDir: join(directory, "local"),
      state: { route: { account: "fixed-test" } }, template: "poster-3-4", theme: "unrelated-theme",
      accountVisualParams: { bg: "#123456", fallbackIcon: "/must-not-load.png" },
    };
    const defaultOutput = await typesetStudioAdapter.render(input);
    expect(defaultOutput.pages[0].imageCount).toBe(0);
    const selected = { ...input, studioTemplates: { cover: templateId }, templateImageOverrides: { cover: { background: replacement } } };
    const local = await typesetStudioAdapter.render({ ...selected, outputDir: join(directory, "override") });
    expect(readFileSync(local.assets[0].path).equals(readFileSync(defaultOutput.assets[0].path))).toBe(false);
    process.env.TYPESET_STUDIO_URL = server.url.toString();
    process.env.TYPESET_ADMIN_KEY = getOrGenerateAdminKey();
    const remote = await typesetStudioAdapter.render({ ...selected, outputDir: join(directory, "remote") });
    expect(readFileSync(remote.assets[0].path).equals(readFileSync(local.assets[0].path))).toBe(true);
    expect(remote.pages[0]).toEqual({ page: 1, imageCount: 0, imageSources: [] });
    const resolved = await (await app.request(`/api/templates/${templateId}`, { headers })).json();
    expect(resolved.template.images[0].src).toBe(source);
    const unknown = { ...selected, templateImageOverrides: { cover: { missing: replacement } } };
    await expect(typesetStudioAdapter.render(unknown)).rejects.toThrow("未知模板素材");
    await expect(typesetStudioAdapter.render({ ...selected,
      templateImageOverrides: { cover: { background: join(directory, "missing.png") } },
    })).rejects.toThrow("模板素材 background 加载失败");
  } finally {
    server.stop(true);
    await app.request(`/api/templates/${templateId}`, { method: "DELETE", headers });
    setSlotDefaultTemplateId("newspic_cover", previousDefault, "fixed-test");
    if (previousUrl === undefined) delete process.env.TYPESET_STUDIO_URL; else process.env.TYPESET_STUDIO_URL = previousUrl;
    if (previousKey === undefined) delete process.env.TYPESET_ADMIN_KEY; else process.env.TYPESET_ADMIN_KEY = previousKey;
    await rm(directory, { recursive: true, force: true });
  }
});
