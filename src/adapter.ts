import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { renderTypesetResultToPngs } from "./core/canvas-renderer";
import { scanLocalFonts } from "./core/font-loader";
import type { FlowImage } from "./core/types";
import { resolveTypesetResult, type RenderRequestBody } from "./server/routes/render";

// ── Typeset Studio & zzhub-pipeline compatible types ──────────────

export interface PipelinePluginDoctorCheck {
  name: string;
  ok: boolean;
  message?: string;
  detail?: unknown;
}

export interface ImageRenderInput {
  coverTheme?: any;
  onProgress?: (progress: any) => void;
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
const REMOTE_STUDIO_URL = process.env.TYPESET_STUDIO_URL?.replace(/\/$/, "");

// 下载远程生成的页面，并写入流水线输出目录。
async function renderRemoteBatch(
  studioUrl: string,
  body: RenderRequestBody,
  outputDir: string,
  route: "wechat-article" | "wechat-newspic",
  kind: "cover" | "page",
): Promise<ImageRenderOutput> {
  const res = await fetch(`${studioUrl}/api/render/export`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`Cloud Typeset Studio returned HTTP ${res.status}: ${res.statusText}`);
  }
  const data = (await res.json()) as {
    ok: boolean;
    pageCount: number;
    pages: Array<{ pageNumber: number; dataUrl: string }>;
  };
  const assets: RenderAsset[] = [];
  const pagesSummary: ImageRenderOutput["pages"] = [];

  for (const pageItem of data.pages) {
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
      imageCount: 0,
      imageSources: [],
    });
  }

  return { assets, pageCount: data.pageCount, pages: pagesSummary };
}

// 本地渲染与远程服务共用请求，保留各自的图片输出方式。
async function renderLocalBatch(
  body: RenderRequestBody,
  outputDir: string,
  route: RenderAsset["route"],
  kind: RenderAsset["kind"],
): Promise<ImageRenderOutput> {
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
    const images = result.pages[index].images;
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
  version: "0.2.2",

  async doctor(): Promise<PipelinePluginDoctorCheck[]> {
    const checks: PipelinePluginDoctorCheck[] = [];

    if (REMOTE_STUDIO_URL) {
      try {
        const res = await fetch(`${REMOTE_STUDIO_URL}/api/health`);
        const data = (await res.json()) as { name?: string };
        checks.push({
          name: "remote-service",
          ok: res.ok,
          message: `Connected to Cloud Typeset Studio at ${REMOTE_STUDIO_URL} (${data.name || "active"})`,
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

    const account = state.route.account || "default";
    const title = cleanTitle(input.title || state.metadata?.title || "");
    const common: RenderRequestBody = {
      account,
      title,
      template: input.template,
      images: mapBodyImages(input.bodyImages, input.pageSpecs),
      highlightWords: state.route.highlight_words || [],
      config: { footerText: input.accountVisualParams?.footer, watermarkText: `@${account}` },
    };
    const articleCover = route === "wechat-article";
    const renderRoute = articleCover ? "wechat-article" : "wechat-newspic";

    // 统一封面和正文的请求构造，传输方式只在这里分流。
    const renderBatch = (body: RenderRequestBody, kind: RenderAsset["kind"]) =>
      REMOTE_STUDIO_URL && (route === "wechat-article" || route === "wechat-newspic")
        ? renderRemoteBatch(REMOTE_STUDIO_URL, body, outputDir, renderRoute, kind)
        : renderLocalBatch(body, outputDir, renderRoute, kind);

    const cover = await renderBatch({
      ...common,
      route: renderRoute,
      slot: articleCover ? "article_cover" : "newspic_cover",
      ...(articleCover ? {} : { kind: "cover" }),
      markdown: `# ${title}`,
    }, "cover");
    const paginationMode = input.template === "longform-3-4"
      ? "multi"
      : input.template === "poster-3-4"
        ? "single"
        : state.intent?.newspic_render?.pagination_mode || "multi";
    if (articleCover || paginationMode !== "multi") return cover;

    const content = await renderBatch({
      ...common,
      route: "wechat-newspic",
      kind: "content",
      slot: "newspic_content",
      markdown: bodyText || `# ${title}`,
    }, "page");
    return { ...content, assets: [...cover.assets, ...content.assets] };
  },
};

export const plugin = typesetStudioAdapter;
export default typesetStudioAdapter;
