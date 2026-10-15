import { mkdir, readFile, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";
import type { FlowImage, PipelineCoverTheme } from "./core/types";
import type { RenderRequestBody } from "./server/routes/render";

// ── Typeset Studio & zzhub-pipeline compatible types ──────────────

export interface PipelinePluginDoctorCheck {
  name: string;
  ok: boolean;
  message?: string;
  detail?: unknown;
}

export interface ImageRenderInput {
  /** Studio 模板与任务素材替换，旧插件可忽略。 */
  studioTemplates?: { cover?: string; content?: string };
  templateImageOverrides?: { cover?: Record<string, string>; content?: Record<string, string> };
  coverTheme?: PipelineCoverTheme;
  onProgress?: (progress: {
    stage: string; message?: string; current?: number; total?: number;
    unit?: "pages" | "files" | "bytes" | "targets"; route?: string; account?: string;
  }) => void;
  state: {
    route: {
      account?: string;
      highlight_words?: string[];
      account_visual_params?: {
        footer?: string;
        bg?: string;
        highlight?: string;
        fallback_icon?: string;
      };
      [key: string]: any;
    };
    intent?: {
      newspic_render?: {
        pagination_mode?: string;
        min_pages?: number;
        max_pages?: number;
        target_fill_ratio?: number;
        page_specs?: Array<{
          page: number;
          image_markers: string[];
          image_layout?: string | null;
          target_fill_ratio?: number | null;
        }>;
      };
      [key: string]: any;
    };
    metadata?: {
      title?: string;
      [key: string]: any;
    };
    [key: string]: any;
  };
  bodyText: string;
  outputDir: string;
  title: string;
  route: "wechat-article" | "wechat-newspic" | "blog" | string;
  pageSpecs?: Array<{
    page: number;
    imageMarkers?: string[];
    imageLayout?: string | null;
    targetFillRatio?: number | null;
    note?: string | null;
  }>;
  bodyImages?: Array<{
    marker: string;
    path: string;
  }>;
  minPages?: number;
  maxPages?: number;
  accountVisualParams?: {
    footer?: string;
    bg?: string;
    highlight?: string;
    fallbackIcon?: string;
  };
  theme?: string;
  template?: string;
}

export interface RenderAsset {
  kind: "cover" | "page";
  route: "wechat-article" | "wechat-newspic";
  path: string;
  index?: number;
}

export interface ImageRenderOutput {
  assets: RenderAsset[];
  pageCount: number;
  pages: Array<{
    page: number;
    imageCount: number;
    imageSources: string[];
  }>;
}

export interface ImageRenderPlugin {
  name: string;
  version?: string;
  doctor?: () => Promise<PipelinePluginDoctorCheck[]>;
  render: (input: ImageRenderInput) => Promise<ImageRenderOutput>;
}

// ── Helpers ───────────────────────────────────────────────────────

// 清理流水线标题中的 Markdown 标记。
function cleanTitle(raw: string): string {
  if (!raw) return "未命名文章";
  return raw.replace(/^#+\s*/, "").trim();
}

// 将流水线图片标记映射为页码和排版预设。
function mapBodyImages(
  bodyImages?: Array<{ marker: string; path: string }>,
  pageSpecs?: ImageRenderInput["pageSpecs"],
): FlowImage[] {
  if (!bodyImages || bodyImages.length === 0) return [];

  const markerToSpec = new Map<string, { page: number; imageLayout?: string | null }>();
  if (pageSpecs) {
    for (const spec of pageSpecs) {
      if (spec.imageMarkers) {
        for (const marker of spec.imageMarkers) {
          markerToSpec.set(marker, { page: spec.page, imageLayout: spec.imageLayout });
        }
      }
    }
  }

  return bodyImages.map((img, idx) => {
    const spec = markerToSpec.get(img.marker);
    return {
      id: `img_${idx}_${img.marker.replace(/[^a-zA-Z0-9_-]/g, "_")}`,
      src: img.path,
      alt: img.marker,
      pageIndex: spec?.page,
      layoutPreset: (spec?.imageLayout as FlowImage["layoutPreset"]) || "mid-right",
    };
  });
}

// ── Typeset Studio Pipeline Adapter ───────────────────────────────

// 配置远程地址后，由独立服务负责图片渲染。
const remoteStudioUrl = () => process.env.TYPESET_STUDIO_URL?.replace(/\/$/, "");

// 下载远程生成的页面，并写入流水线输出目录。
async function renderRemoteBatch(
  studioUrl: string,
  body: RenderRequestBody,
  outputDir: string,
  route: "wechat-article" | "wechat-newspic",
  kind: "cover" | "page",
): Promise<ImageRenderOutput> {
  // 远程进程无法读取客户端文件，发送图片字节并保留来源摘要映射。
  const sources = new Map<string, string>();
  const originalImages = new Map([...(body.config?.images || []), ...(body.images || [])].map((image) => [image.id, image.src]));
  const transfer = async (src: string) => {
    if (/^(https?:|data:)/i.test(src) || src.startsWith("/uploads/")) return src;
    const bytes = await readFile(src);
    const mime = ({ ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".svg": "image/svg+xml", ".webp": "image/webp", ".gif": "image/gif" } as Record<string, string>)[extname(src).toLowerCase()] || "image/png";
    const dataUrl = `data:${mime};base64,${bytes.toString("base64")}`;
    sources.set(dataUrl, src);
    return dataUrl;
  };
  const requestBody = structuredClone(body);
  for (const image of requestBody.images || []) image.src = await transfer(image.src);
  // 保留模板样式时，备用配置不参与正常模板渲染，也不读取其本地素材。
  if (!requestBody.preserveTemplateStyle) {
    for (const image of requestBody.config?.images || []) image.src = await transfer(image.src);
  }
  for (const [key, src] of Object.entries(requestBody.templateImageOverrides || {})) {
    try {
      requestBody.templateImageOverrides![key] = await transfer(src);
    } catch (error) {
      throw new Error(`模板素材 ${key} 加载失败：${error instanceof Error ? error.message : String(error)}`);
    }
  }
  const coverTheme = requestBody.config?.coverTheme;
  for (const image of requestBody.preserveTemplateStyle ? [] : [coverTheme?.background.image, coverTheme?.decoration.image]) {
    if (image) image.src = await transfer(image.src);
  }
  const res = await fetch(`${studioUrl}/api/render/export`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Admin-Key": process.env.TYPESET_ADMIN_KEY || "" },
    body: JSON.stringify(requestBody),
  });
  if (!res.ok) {
    const detail = (await res.text()).slice(0, 500);
    throw new Error(`Cloud Typeset Studio returned HTTP ${res.status}: ${detail || res.statusText}`);
  }
  const data = (await res.json()) as {
    ok: boolean;
    pageCount: number;
    pages: Array<{ pageNumber: number; dataUrl: string; imageCount: number; imageSources: string[]; imageIds: string[]; bodyImageCount: number; bodyImageSources: string[]; bodyImageIds: string[] }>;
  };
  const assets: RenderAsset[] = [];
  const pagesSummary: ImageRenderOutput["pages"] = [];

  if (!data.ok || !Array.isArray(data.pages)) throw new Error("Invalid Typeset Studio export response");
  for (const pageItem of (kind === "cover" ? data.pages.slice(0, 1) : data.pages)) {
    const pageNum = pageItem.pageNumber;
    const base64Data = pageItem.dataUrl.replace(/^data:image\/png;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");
    const filename =
      kind === "cover" ? "cover.png" : `article-${String(pageNum).padStart(2, "0")}.png`;
    const filePath = join(outputDir, filename);
    await writeFile(filePath, buffer);

    assets.push({
      kind,
      route,
      index: kind === "page" ? pageNum : undefined,
      path: filePath,
    });
    pagesSummary.push({
      page: pageNum,
      imageCount: pageItem.bodyImageCount,
      imageSources: pageItem.bodyImageSources.map((src, index) => originalImages.get(pageItem.bodyImageIds[index]) || sources.get(src) || src),
    });
  }

  return { assets, pageCount: assets.length, pages: pagesSummary };
}

// 本地渲染与远程服务共用请求，保留各自的图片输出方式。
async function renderLocalBatch(
  body: RenderRequestBody,
  outputDir: string,
  route: RenderAsset["route"],
  kind: RenderAsset["kind"],
): Promise<ImageRenderOutput> {
  const [{ resolveTypesetResult }, { renderTypesetResultToPngs }] = await Promise.all([
    import("./server/routes/render"), import("./core/canvas-renderer"),
  ]);
  const { result } = resolveTypesetResult(body);
  const pngs = await renderTypesetResultToPngs(result);
  const outputs = kind === "cover" ? pngs.slice(0, 1) : pngs;
  if (kind === "cover" && outputs.length === 0) {
    throw new Error("Typeset Studio failed to render cover buffer");
  }

  const assets: RenderAsset[] = [];
  const pages: ImageRenderOutput["pages"] = [];
  for (const [index, output] of outputs.entries()) {
    const pageNumber = index + 1;
    const filename = kind === "cover"
      ? "cover.png"
      : `article-${String(pageNumber).padStart(2, "0")}.png`;
    const path = join(outputDir, filename);
    await writeFile(path, output.buffer);
    assets.push({ kind, route, path, ...(kind === "page" ? { index: pageNumber } : {}) });
    const images = result.pages[index].images.filter((image) => !image.templateAssetKey);
    pages.push({
      page: pageNumber,
      imageCount: images.length,
      imageSources: images.map((image) => image.src),
    });
  }
  return { assets, pageCount: outputs.length, pages };
}

export const typesetStudioAdapter: ImageRenderPlugin = {
  name: "typeset-studio",
  version: "0.3.0",

  async doctor(): Promise<PipelinePluginDoctorCheck[]> {
    const checks: PipelinePluginDoctorCheck[] = [];

    const REMOTE_STUDIO_URL = remoteStudioUrl();
    if (REMOTE_STUDIO_URL) {
      try {
        const res = await fetch(`${REMOTE_STUDIO_URL}/api/auth/verify`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: process.env.TYPESET_ADMIN_KEY || "" }),
        });
        const data = (await res.json()) as { ok?: boolean };
        checks.push({
          name: "remote-service",
          ok: res.ok && data.ok === true,
          message: data.ok ? `Authenticated with Typeset Studio at ${REMOTE_STUDIO_URL}` : "Remote admin key is missing or invalid",
        });
      } catch (err) {
        checks.push({
          name: "remote-service",
          ok: false,
          message: `Failed to connect to Cloud Typeset Studio at ${REMOTE_STUDIO_URL}: ${err}`,
        });
      }
    }

    try {
      const { createCanvas } = await import("@napi-rs/canvas");
      const canvas = createCanvas(10, 10);
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, 10, 10);
      checks.push({
        name: "@napi-rs/canvas",
        ok: true,
        message: "Native Skia Canvas 2D engine is ready",
      });
    } catch (err) {
      checks.push({
        name: "@napi-rs/canvas",
        ok: Boolean(REMOTE_STUDIO_URL),
        message: REMOTE_STUDIO_URL
          ? "@napi-rs/canvas not installed locally (using Cloud Typeset Studio microservice)"
          : `@napi-rs/canvas initialization failed: ${err}`,
      });
    }

    try {
      const { scanLocalFonts } = await import("./core/font-loader");
      const localFonts = scanLocalFonts();
      checks.push({
        name: "local-fonts",
        ok: true,
        message: `Registered ${localFonts.length} project-local font(s)`,
      });
    } catch (err) {
      checks.push({
        name: "local-fonts",
        ok: false,
        message: `Font loader error: ${err}`,
      });
    }

    return checks;
  },

  async render(input: ImageRenderInput): Promise<ImageRenderOutput> {
    const { route, outputDir, bodyText, state } = input;
    await mkdir(outputDir, { recursive: true });
    if (route === "blog") return { assets: [], pageCount: 0, pages: [] };

    const REMOTE_STUDIO_URL = remoteStudioUrl();
    const account = state.route.account || "default";
    const saved = state.intent?.newspic_render;
    const pageSpecs = input.pageSpecs ?? saved?.page_specs?.map((spec) => ({
      page: spec.page, imageMarkers: spec.image_markers, imageLayout: spec.image_layout, targetFillRatio: spec.target_fill_ratio,
    }));
    const visual = input.accountVisualParams || {};
    const stateVisual = state.route.account_visual_params;
    const footer = visual.footer ?? stateVisual?.footer;
    const bg = visual.bg ?? stateVisual?.bg;
    const highlight = visual.highlight ?? stateVisual?.highlight;
    const fallbackIcon = visual.fallbackIcon ?? stateVisual?.fallback_icon;
    // pipeline 的模式标记只选择分页方式，具体模板名才参与模板解析。
    const template = ["wechat-cover-split", "poster-3-4", "longform-3-4"].includes(input.template || "") ? undefined : input.template;
    input.onProgress?.({ stage: "typeset", message: "开始排版", route, account });
    const title = cleanTitle(input.title || state.metadata?.title || "");
    const common: RenderRequestBody = {
      account,
      title,
      preserveTemplateStyle: true,
      images: mapBodyImages(input.bodyImages, pageSpecs),
      highlightWords: state.route.highlight_words || [],
      config: {
        ...(footer !== undefined ? { footerText: footer } : {}),
        watermarkText: `@${account}`,
        ...((bg || highlight) ? { theme: {
          ...(bg ? { bgColor: bg } : {}), ...(highlight ? { accentColor: highlight } : {}),
        } } : {}),
      },
    };
    const articleCover = route === "wechat-article";
    const renderRoute = articleCover ? "wechat-article" : "wechat-newspic";

    // 统一封面和正文的请求构造，传输方式只在这里分流。
    const renderBatch = (body: RenderRequestBody, kind: RenderAsset["kind"]) =>
      REMOTE_STUDIO_URL && (route === "wechat-article" || route === "wechat-newspic")
        ? renderRemoteBatch(REMOTE_STUDIO_URL, body, outputDir, renderRoute, kind)
        : renderLocalBatch(body, outputDir, renderRoute, kind);

    const coverTheme = input.coverTheme;
    const coverConfig = { ...common.config, algorithm: { targetFillRatio: 1 } };
    if (coverTheme) {
      coverConfig.coverTheme = coverTheme;
      if (footer) coverConfig.chrome = { showHeader: false, showFooter: true, showFooterDivider: false, showFooterText: true };
      coverConfig.algorithm = { ...coverTheme.layout, targetFillRatio: 1 };
      coverConfig.theme = {
        bgColor: coverTheme.background.fill.type === "solid" ? coverTheme.background.fill.color : "transparent",
        textColor: coverTheme.colors.text, headingColor: coverTheme.colors.text,
        accentColor: coverTheme.colors.accent, quoteColor: coverTheme.colors.muted,
        captionColor: coverTheme.colors.muted, watermarkColor: coverTheme.colors.muted,
      };
    }
    const firstPageImages = (common.images || []).filter((image) => !image.pageIndex || image.pageIndex === 1)
      .map((image) => ({ ...image, pageIndex: 1 }));
    if (fallbackIcon) coverConfig.images = [{
      id: "account_icon", src: fallbackIcon, alt: "账号标识", isAbsolute: true,
      x: 0, y: 0, width: 48, height: 48, zIndex: 20, pageIndex: 1,
      templateAssetKey: "account_icon",
    }];
    const cover = await renderBatch({
      ...common, config: coverConfig, images: firstPageImages,
      template: input.studioTemplates?.cover || template,
      templateImageOverrides: input.templateImageOverrides?.cover,
      route: renderRoute, slot: articleCover ? "article_cover" : "newspic_cover",
      kind: "cover", maxPages: 1, markdown: `# ${title}`,
    }, "cover");
    input.onProgress?.({ stage: "cover", message: "封面已生成", current: 1, total: 1, unit: "pages", route, account });
    const paginationMode = input.template === "longform-3-4"
      ? "multi"
      : input.template === "poster-3-4"
        ? "single"
        : state.intent?.newspic_render?.pagination_mode || "multi";
    if (articleCover || paginationMode !== "multi") return cover;

    const content = await renderBatch({
      ...common,
      route: "wechat-newspic",
      template: input.studioTemplates?.content || template,
      templateImageOverrides: input.templateImageOverrides?.content,
      kind: "content",
      slot: "newspic_content",
      markdown: bodyText || `# ${title}`,
      config: { ...common.config, ...(saved?.target_fill_ratio != null ? { algorithm: { targetFillRatio: saved.target_fill_ratio } } : {}) },
      minPages: input.minPages ?? saved?.min_pages,
      maxPages: input.maxPages ?? saved?.max_pages,
      pageFillRatios: Object.fromEntries((pageSpecs || []).filter((spec) => spec.targetFillRatio != null).map((spec) => [spec.page, spec.targetFillRatio!])),
    }, "page");
    input.onProgress?.({ stage: "content", message: "正文已生成", current: content.pageCount, total: content.pageCount, unit: "pages", route, account });
    return { ...content, assets: [...cover.assets, ...content.assets] };
  },
};

export const plugin = typesetStudioAdapter;
export default typesetStudioAdapter;
