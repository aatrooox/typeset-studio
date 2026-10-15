import { Hono } from "hono";
import { runTypeset } from "../../core/engine";
import { renderPageToPng, renderTypesetResultToPngs } from "../../core/canvas-renderer";
import { TemplateSlot, TypesetResult } from "../../core/types";
import { ARTICLE_COVER_FONT } from "../../core/article-cover";
import { registerArticleCoverFont } from "../../server-font";
import { resolveTypesetRenderConfig, type TypesetConfigRequest } from "../config-resolver";

export const renderRouter = new Hono();
renderRouter.onError((error, c) => {
  if (error.message.startsWith("模板素材 ")) return c.json({ ok: false, error: error.message }, 422);
  if (error instanceof RangeError) return c.json({ ok: false, error: error.message }, 400);
  console.error("渲染失败", error);
  return c.json({ ok: false, error: "Render failed" }, 500);
});

export interface RenderRequestBody extends TypesetConfigRequest {
  result?: TypesetResult;
  pageNumber?: number;
  title?: string;
  markdown?: string;
  text?: string;
  highlightWords?: string[];
  minPages?: number;
  maxPages?: number;
  pageFillRatios?: Record<number, number>;
}

export function resolveTypesetResult(body: RenderRequestBody): {
  templateId?: string;
  templateName?: string;
  slot?: TemplateSlot;
  result: TypesetResult;
} {
  if (body.result) {
    return {
      templateId: body.result.config?.id,
      templateName: body.result.config?.name,
      slot: body.result.config?.slot,
      result: body.result,
    };
  }

  // If title was passed and no markdown, construct standard header
  let markdown = body.markdown || body.text;
  if (!markdown && body.title) {
    markdown = `# ${body.title}`;
  }
  if (!markdown) {
    markdown = "# 示例标题\n正文内容";
  }

  const resolved = resolveTypesetRenderConfig(body);
  const effectiveConfig = resolved.config;
  const resolvedImages = resolved.images;

  // 插件在独立子进程渲染，字体必须在实际排版进程中校验并注册。
  if (effectiveConfig.typography.headingFont === ARTICLE_COVER_FONT.family || effectiveConfig.typography.bodyFont === ARTICLE_COVER_FONT.family) {
    const path = process.env.TYPESET_ARTICLE_COVER_FONT_PATH;
    if (!path) throw new Error("Article cover font path is not configured for this renderer");
    registerArticleCoverFont({ path });
  }

  // 封面主题先使用目标字号，单页放不下时缩到契约允许的最小字号。
  let result: TypesetResult;
  while (true) {
    try {
      result = runTypeset({
        markdown, images: resolvedImages, config: effectiveConfig,
        highlightWords: body.highlightWords || [],
        minPages: body.minPages, maxPages: body.maxPages, pageFillRatios: body.pageFillRatios,
      });
      break;
    } catch (error) {
      const theme = effectiveConfig.coverTheme;
      if (!theme || body.kind !== "cover" || !(error instanceof Error) ||
        !/exceeds maxPages|cannot fit/.test(error.message)) throw error;
      const title = theme.typography.title;
      if (!Number.isFinite(title.fontSize) || !Number.isFinite(title.minFontSize) || title.minFontSize <= 0) {
        throw new RangeError("Invalid cover theme font size");
      }
      if (title.fontSize <= title.minFontSize) throw error;
      effectiveConfig.coverTheme = {
        ...theme, typography: { ...theme.typography, title: {
          ...title, fontSize: Math.max(title.minFontSize, Math.floor(title.fontSize * 0.9)),
        } },
      };
    }
  }

  return {
    templateId: resolved.templateId,
    templateName: resolved.templateName,
    slot: resolved.slot,
    result,
  };
}

// 1. Standard JSON typeset result
renderRouter.post("/", async (c) => {
  const body = await c.req.json<RenderRequestBody>();
  const resolved = resolveTypesetResult(body);
  return c.json({
    ok: true,
    templateId: resolved.templateId,
    templateName: resolved.templateName,
    slot: resolved.slot,
    result: resolved.result,
  });
});

// 2. Binary raw PNG render (single page, e.g. for pipelines downloading cover.png or page-N.png)
renderRouter.post("/png", async (c) => {
  const body = await c.req.json<RenderRequestBody>();
  const { result } = resolveTypesetResult(body);
  const targetPageNumber = body.pageNumber ?? 1;
  const targetPage = result.pages.find((p) => p.pageNumber === targetPageNumber) || result.pages[0];

  if (!targetPage) {
    return c.json({ ok: false, error: "No page available to render" }, 404);
  }

  const pngBuffer = await renderPageToPng(targetPage, result.canvasSpec, result.config, result.pageCount);
  return new Response(new Uint8Array(pngBuffer), {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      "Content-Length": String(pngBuffer.length),
      "Content-Disposition": `inline; filename="typeset-${result.canvasSpec.id}-p${targetPage.pageNumber}.png"`,
      "Cache-Control": "no-cache",
    },
  });
});

// 3. Batch export endpoint for Web UI (returns Base64 data URLs for all pages)
renderRouter.post("/export", async (c) => {
  const body = await c.req.json<RenderRequestBody>();
  const { result } = resolveTypesetResult(body);
  const pngOutputs = await renderTypesetResultToPngs(result);

  return c.json({
    ok: true,
    pageCount: pngOutputs.length,
    pages: pngOutputs.map((item) => ({
      pageNumber: item.pageNumber,
      dataUrl: `data:image/png;base64,${item.buffer.toString("base64")}`,
      byteLength: item.buffer.length,
      imageIds: result.pages.find((page) => page.pageNumber === item.pageNumber)!.images.map((image) => image.id),
      bodyImageCount: result.pages.find((page) => page.pageNumber === item.pageNumber)!.images.filter((image) => !image.templateAssetKey).length,
      bodyImageSources: result.pages.find((page) => page.pageNumber === item.pageNumber)!.images.filter((image) => !image.templateAssetKey).map((image) => image.src),
      bodyImageIds: result.pages.find((page) => page.pageNumber === item.pageNumber)!.images.filter((image) => !image.templateAssetKey).map((image) => image.id),
      imageCount: result.pages.find((page) => page.pageNumber === item.pageNumber)!.images.length,
      imageSources: result.pages.find((page) => page.pageNumber === item.pageNumber)!.images.map((image) => image.src),
    })),
  });
});
