import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { renderTypesetResultToPngs } from "./core/canvas-renderer";
import { scanLocalFonts } from "./core/font-loader";
import { FlowImage } from "./core/types";
import { resolveTypesetResult } from "./server/routes/render";

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

function cleanTitle(raw: string): string {
  if (!raw) return "未命名文章";
  return raw.replace(/^#+\s*/, "").trim();
}

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
      layoutPreset: (spec?.imageLayout as any) || "mid-right",
    };
  });
}

// ── Typeset Studio Pipeline Adapter ───────────────────────────────

export const typesetStudioAdapter: ImageRenderPlugin = {
  name: "typeset-studio",
  version: "0.2.0",

  async doctor(): Promise<PipelinePluginDoctorCheck[]> {
    const checks: PipelinePluginDoctorCheck[] = [];

    // 1. Skia engine check
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
        ok: false,
        message: `@napi-rs/canvas initialization failed: ${err}`,
      });
    }

    // 2. Local fonts check
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
    const { route, outputDir, title, bodyText, state } = input;
    await mkdir(outputDir, { recursive: true });

    const account = state.route.account || "default";
    const highlightWords = state.route.highlight_words || [];
    const footerText = input.accountVisualParams?.footer;
    const watermarkText = account ? `@${account}` : undefined;
    const effectiveTitle = cleanTitle(title || state.metadata?.title || "");

    // ── 1. Route: wechat-article (2.35:1 Cover only) ─────────────
    if (route === "wechat-article") {
      const coverImages = mapBodyImages(input.bodyImages, input.pageSpecs);

      const resolved = resolveTypesetResult({
        slot: "article_cover",
        route: "wechat-article",
        account,
        title: effectiveTitle,
        markdown: `# ${effectiveTitle}`,
        template: input.template,
        images: coverImages,
        highlightWords,
        config: {
          footerText: footerText ?? undefined,
          watermarkText: watermarkText ?? undefined,
        },
      });

      const pngOutputs = await renderTypesetResultToPngs(resolved.result);
      const coverBuffer = pngOutputs[0]?.buffer;
      if (!coverBuffer) {
        throw new Error("Typeset Studio failed to render cover buffer");
      }
      const coverPath = join(outputDir, "cover.png");
      await writeFile(coverPath, coverBuffer);

      const asset: RenderAsset = {
        kind: "cover",
        route: "wechat-article",
        path: coverPath,
      };

      return {
        assets: [asset],
        pageCount: 1,
        pages: [
          {
            page: 1,
            imageCount: resolved.result.pages[0]?.images.length || 0,
            imageSources: (resolved.result.pages[0]?.images || []).map((img) => img.src),
          },
        ],
      };
    }

    // ── 2. Route: blog (no image rendering required) ──────────────
    if (route === "blog") {
      return {
        assets: [],
        pageCount: 0,
        pages: [],
      };
    }

    // ── 3. Route: wechat-newspic (Poster Cover + Multi-page Content) ─
    const newspicSpec = state.intent?.newspic_render;
    const paginationMode =
      input.template === "longform-3-4"
        ? "multi"
        : input.template === "poster-3-4"
        ? "single"
        : newspicSpec?.pagination_mode || "multi";

    const isMultiPage = paginationMode === "multi";
    const assets: RenderAsset[] = [];
    const pagesSummary: ImageRenderOutput["pages"] = [];

    // 3.1 Render Poster Cover (3:4)
    const coverImages = mapBodyImages(input.bodyImages, input.pageSpecs);
    const resolvedCover = resolveTypesetResult({
      slot: "newspic_cover",
      route: "wechat-newspic",
      kind: "cover",
      account,
      title: effectiveTitle,
      markdown: `# ${effectiveTitle}`,
      template: input.template,
      images: coverImages,
      highlightWords,
      config: {
        footerText: footerText ?? undefined,
        watermarkText: watermarkText ?? undefined,
      },
    });

    const coverPngs = await renderTypesetResultToPngs(resolvedCover.result);
    const coverBuffer = coverPngs[0]?.buffer;
    if (!coverBuffer) {
      throw new Error("Typeset Studio failed to render newspic cover buffer");
    }
    const coverPath = join(outputDir, "cover.png");
    await writeFile(coverPath, coverBuffer);
    assets.push({
      kind: "cover",
      route: "wechat-newspic",
      path: coverPath,
    });

    // 3.2 If single-page mode, return immediately
    if (!isMultiPage) {
      return {
        assets,
        pageCount: 1,
        pages: [
          {
            page: 1,
            imageCount: resolvedCover.result.pages[0]?.images.length || 0,
            imageSources: (resolvedCover.result.pages[0]?.images || []).map((img) => img.src),
          },
        ],
      };
    }

    // 3.3 Render Content Pages (3:4 Multi-page longform)
    const contentImages = mapBodyImages(input.bodyImages, input.pageSpecs);
    const resolvedContent = resolveTypesetResult({
      slot: "newspic_content",
      route: "wechat-newspic",
      kind: "content",
      account,
      title: effectiveTitle,
      markdown: bodyText || `# ${effectiveTitle}`,
      template: input.template,
      images: contentImages,
      highlightWords,
      config: {
        footerText: footerText ?? undefined,
        watermarkText: watermarkText ?? undefined,
      },
    });

    const contentPngs = await renderTypesetResultToPngs(resolvedContent.result);

    for (let i = 0; i < contentPngs.length; i++) {
      const pageNum = i + 1;
      const fileName = `article-${String(pageNum).padStart(2, "0")}.png`;
      const pagePath = join(outputDir, fileName);
      await writeFile(pagePath, contentPngs[i].buffer);

      assets.push({
        kind: "page",
        route: "wechat-newspic",
        index: pageNum,
        path: pagePath,
      });

      const flowPage = resolvedContent.result.pages[i];
      pagesSummary.push({
        page: pageNum,
        imageCount: flowPage?.images.length || 0,
        imageSources: (flowPage?.images || []).map((img) => img.src),
      });
    }

    return {
      assets,
      pageCount: contentPngs.length,
      pages: pagesSummary,
    };
  },
};

export const plugin = typesetStudioAdapter;
export default typesetStudioAdapter;
