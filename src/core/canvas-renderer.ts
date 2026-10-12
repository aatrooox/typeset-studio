import { createCanvas, loadImage, type Canvas } from "@napi-rs/canvas";
import { existsSync } from "node:fs";
import { isAbsolute, join } from "node:path";
import { drawPageToContext } from "./canvas-draw";
import { registerServerFonts } from "./font-loader";
import { CanvasSpec, FlowPage, TypesetConfig, TypesetResult } from "./types";

export { resolveCanvasFont, resolveCanvasFontFamily, drawPageToContext } from "./canvas-draw";
export { registerServerFonts, scanLocalFonts, type LocalFontInfo } from "./font-loader";

// Preload and register any project-local fonts into Skia at server startup
registerServerFonts();

/**
 * Safely loads an image from a URL, data URL, or local file system path for Node/Bun.
 */
async function safeLoadImage(src: string): Promise<any | null> {
  if (!src) return null;
  try {
    if (src.startsWith("/uploads/") || src.startsWith("uploads/")) {
      const localPath = join(process.cwd(), "data", src.replace(/^\//, ""));
      if (existsSync(localPath)) {
        return await loadImage(localPath);
      }
    }
    if (isAbsolute(src) && existsSync(src)) {
      return await loadImage(src);
    }
    return await loadImage(src);
  } catch (err) {
    console.warn(`[canvas-renderer] Warning: Failed to load image "${src}":`, err);
    return null;
  }
}

/**
 * Renders a single FlowPage onto a canvas using @napi-rs/canvas on the server.
 */
export async function renderPageToCanvas(
  page: FlowPage,
  spec: CanvasSpec,
  config: TypesetConfig,
  totalPageCount: number = 1,
): Promise<Canvas> {
  const canvas = createCanvas(spec.width, spec.height);
  const ctx = canvas.getContext("2d");

  await drawPageToContext(ctx, {
    page,
    spec,
    config,
    totalPageCount,
    getImage: safeLoadImage,
    isServer: true,
  });

  return canvas;
}

/**
 * Renders a single FlowPage into a high-resolution PNG Buffer.
 */
export async function renderPageToPng(
  page: FlowPage,
  spec: CanvasSpec,
  config: TypesetConfig,
  totalPageCount: number = 1,
): Promise<Buffer> {
  const canvas = await renderPageToCanvas(page, spec, config, totalPageCount);
  return canvas.toBuffer("image/png");
}

/**
 * Renders an entire TypesetResult into an array of PNG Buffers.
 */
export async function renderTypesetResultToPngs(
  result: TypesetResult,
): Promise<Array<{ pageNumber: number; buffer: Buffer }>> {
  const { pages, canvasSpec, config, pageCount } = result;
  const outputs: Array<{ pageNumber: number; buffer: Buffer }> = [];

  for (const page of pages) {
    const buffer = await renderPageToPng(page, canvasSpec, config, pageCount);
    outputs.push({
      pageNumber: page.pageNumber,
      buffer,
    });
  }

  return outputs;
}
