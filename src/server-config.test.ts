import { expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { getDefaultConfig } from "./core/engine";
import { buildArticleCoverRequest, resolveArticleCoverConfig, resolveTypesetConfig } from "./server-config";
import { resolveTypesetResult } from "./server/routes/render";
import { resolveDataDir } from "./core/data-dir";
import type { ImageRenderInput } from "./adapter";

test("server resolver shares selection and overrides with render without reading resources or laying out titles", async () => {
  const directory = resolveDataDir();
  if (!process.env.TYPESET_DATA_DIR || directory.includes("/core/typeset-studio/data")) throw new Error("server-config tests require an isolated TYPESET_DATA_DIR");
  const id = `resolver_${crypto.randomUUID()}`;
  const path = join(directory, "templates", `${id}.json`);
  const base = {
    ...getDefaultConfig("wechat-cover-2.35"), id, name: "受信解析模板", footerText: "保存的页脚",
    images: [{ id: "fixed", templateAssetKey: "square", src: "/missing-source.png", alt: "", isAbsolute: true, x: 0, y: 0, width: 100, height: 100 }],
  };
  await mkdir(join(directory, "templates"), { recursive: true });
  await writeFile(path, JSON.stringify(base));
  try {
    const request = { template: id, route: "wechat-article", preserveTemplateStyle: true, templateImageOverrides: { square: "/frozen-square.jpg" }, config: { footerText: "被忽略", theme: { bgColor: "#abcdef" } } };
    const frozen = resolveTypesetConfig(request);
    expect(frozen).toMatchObject({ source: "explicit", templateId: id, templateName: base.name, slot: "article_cover" });
    expect(frozen.config.footerText).toBe(base.footerText);
    expect(frozen.config.images![0]!.src).toBe("/frozen-square.jpg");
    expect(frozen.resources).toEqual([{ key: "images.0", src: "/frozen-square.jpg" }]);
    const rendered = resolveTypesetResult({ ...request, markdown: "# 相同配置", maxPages: 1 });
    expect(rendered.result.config.images![0]!.src).toBe("/missing-source.png");
    expect({ ...frozen.config, images: undefined }).toEqual({ ...rendered.result.config, images: undefined });
    frozen.config.theme.bgColor = "#000001";
    expect(resolveTypesetConfig(request).config.theme.bgColor).toBe(base.theme.bgColor);
    expect(resolveTypesetConfig({ ...request, preserveTemplateStyle: false }).config.theme.bgColor).toBe("#abcdef");
    expect(() => resolveTypesetConfig({ template: "missing-resolver-template" })).toThrow("not found");
    expect(() => resolveTypesetConfig({ ...request, templateImageOverrides: { unknown: "/no-read.jpg" } })).toThrow("未知模板素材");
    const input: ImageRenderInput = { title: "超长标题".repeat(500), bodyText: "", route: "wechat-article", outputDir: "/unused", studioTemplates: { cover: id }, templateImageOverrides: { cover: { square: "/frozen-square.jpg" } }, state: { route: { account: "default" } } };
    expect(resolveArticleCoverConfig(input)).toEqual(resolveTypesetConfig(buildArticleCoverRequest(input)));
    expect(() => buildArticleCoverRequest({ ...input, route: "blog" })).toThrow("wechat-article");
    const theme = { ...base, id: `${id}_theme`, coverTheme: {
      id: "theme", format: "wechat-cover-split", typography: {} as any, colors: {} as any, layout: {} as any,
      background: { fill: { type: "solid", color: "#ffffff" }, overlay: null, image: { src: "/background.jpg", fit: "cover", position: { x: 0, y: 0 }, opacity: 1 } },
      decoration: { pattern: "none", color: "#ffffff", opacity: 0, size: 1, image: { src: "/decoration.jpg", fit: "cover", position: { x: 0, y: 0 }, opacity: 1 } },
    } };
    const resources = resolveTypesetConfig({ ...request, preserveTemplateStyle: false, config: { coverTheme: theme.coverTheme as any } }).resources;
    expect(resources.slice(1)).toEqual([{ key: "coverTheme.background.image", src: "/background.jpg" }, { key: "coverTheme.decoration.image", src: "/decoration.jpg" }]);
  } finally { await rm(path, { force: true }); }
});

test("server resolver reports slot/global/builtin fallback provenance in an isolated process", async () => {
  const root = await mkdtemp(join(tmpdir(), "typeset-resolver-"));
  try {
    const templates = join(root, "templates");
    await mkdir(templates);
    for (const name of [".initialized", ".canvas-presets-v1"]) await writeFile(join(templates, name), "1");
    for (const id of ["account", "global"]) await writeFile(join(templates, `${id}.json`), JSON.stringify({ ...getDefaultConfig("wechat-cover-2.35"), id, name: id }));
    await writeFile(join(root, "default-template.json"), JSON.stringify({ accounts: { demo: { article_cover: "account" } }, slots: { article_cover: "missing" }, defaultTemplateId: "global" }));
    const script = `import {resolveTypesetConfig} from ${JSON.stringify(join(import.meta.dir, "server-config.ts"))};import {unlinkSync} from "node:fs";const slot=resolveTypesetConfig({route:"wechat-article",account:"demo"});const global=resolveTypesetConfig({route:"wechat-article",account:"other"});unlinkSync(${JSON.stringify(join(templates, "global.json"))});const builtin=resolveTypesetConfig({route:"wechat-article",account:"other"});console.log(JSON.stringify([slot.source,global.source,builtin.source,slot.templateId,global.templateId,builtin.config.aspectRatio]));`;
    const child = Bun.spawn([process.execPath, "-e", script], { env: { ...process.env, TYPESET_DATA_DIR: root }, stdout: "pipe", stderr: "pipe" });
    const [text, error, code] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited]);
    expect(error).toBe(""); expect(code).toBe(0);
    expect(JSON.parse(text)).toEqual(["slot-default", "global-default", "builtin", "account", "global", "wechat-cover-2.35"]);
  } finally { await rm(root, { recursive: true, force: true }); }
});
