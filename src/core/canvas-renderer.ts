import { createCanvas, loadImage, type Canvas, type SKRSContext2D } from "@napi-rs/canvas";
import { existsSync } from "node:fs";
import { isAbsolute, join } from "node:path";
import { computeStageDimensions } from "./geometry";
import { CanvasSpec, FlowPage, TypesetConfig, TypesetResult } from "./types";

/**
 * Safely loads an image from a URL, data URL, or local file system path.
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
 * Renders a single FlowPage onto a canvas using @napi-rs/canvas.
 */
export async function renderPageToCanvas(
  page: FlowPage,
  spec: CanvasSpec,
  config: TypesetConfig,
  totalPageCount: number = 1,
): Promise<Canvas> {
  const canvas = createCanvas(spec.width, spec.height);
  const ctx = canvas.getContext("2d");
  const { algorithm, theme, chrome } = config;

  // 1. Draw Canvas Background
  ctx.fillStyle = theme.bgColor;
  ctx.fillRect(0, 0, spec.width, spec.height);

  // 2. Stage Dimensions Calculation
  const { stageWidth, stageHeight, stageX, stageY } = computeStageDimensions(
    spec,
    algorithm.safeArea,
    algorithm.contentBottomGap,
  );

  // 3. Header Bar (Watermark & Page Number)
  const showHeader = chrome?.showHeader ?? Boolean(config.watermarkText?.trim());
  const showWatermark = (chrome?.showWatermark ?? true) && Boolean(config.watermarkText?.trim());
  const showPageNum = chrome?.showPageNumber ?? (config.aspectRatio === "longform-3-4" && totalPageCount > 1);

  if (showHeader && (showWatermark || showPageNum)) {
    const headerTop = Math.max(20, algorithm.safeArea.top - 60);

    if (showWatermark && config.watermarkText?.trim()) {
      ctx.save();
      ctx.font = '600 14px "PingFang SC", "Noto Sans SC", Inter, sans-serif';
      ctx.fillStyle = theme.watermarkColor;
      ctx.globalAlpha = 0.45;
      ctx.textBaseline = "middle";
      ctx.fillText(config.watermarkText.toUpperCase(), algorithm.safeArea.left, headerTop + 20);
      ctx.restore();
    }

    if (showPageNum) {
      ctx.save();
      const pageText = `P.${String(page.pageNumber).padStart(2, "0")}`;
      ctx.font = '500 12px "SF Mono", Monaco, Menlo, Consolas, monospace';
      ctx.textBaseline = "middle";
      const metrics = ctx.measureText(pageText);
      const pillW = metrics.width + 16;
      const pillH = 24;
      const pillX = spec.width - algorithm.safeArea.right - pillW;
      const pillY = headerTop + 8;

      ctx.strokeStyle = theme.textColor;
      ctx.globalAlpha = 0.4;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(pillX, pillY, pillW, pillH, 12);
      ctx.stroke();

      ctx.fillStyle = theme.textColor;
      ctx.fillText(pageText, pillX + 8, pillY + pillH / 2);
      ctx.restore();
    }
  }

  // 4. Obstacle Images & Absolute Layers (Sorted by zIndex)
  const sortedImages = [...(page.images || [])].sort((a, b) => {
    const za = a.zIndex ?? (a.isAbsolute ? 20 : 5);
    const zb = b.zIndex ?? (b.isAbsolute ? 20 : 5);
    return za - zb;
  });

  for (const img of sortedImages) {
    const loadedImg = await safeLoadImage(img.src);
    const imgX = stageX + img.x;
    const imgY = stageY + img.y;
    const centerX = imgX + img.width / 2;
    const centerY = imgY + img.height / 2;

    ctx.save();
    ctx.translate(centerX, centerY);
    if (img.rotate) {
      ctx.rotate((img.rotate * Math.PI) / 180);
    }
    ctx.globalAlpha = img.opacity ?? 1;

    const w = img.width;
    const h = img.height;
    const radius = Math.min(img.borderRadius ?? 12, w / 2, h / 2);

    ctx.beginPath();
    ctx.roundRect(-w / 2, -h / 2, w, h, radius);
    ctx.clip();

    if (loadedImg) {
      ctx.drawImage(loadedImg, -w / 2, -h / 2, w, h);
    } else {
      ctx.fillStyle = theme.cardBg || "#222222";
      ctx.fillRect(-w / 2, -h / 2, w, h);
    }
    ctx.restore();

    // Image Caption if present
    if (img.caption?.trim()) {
      ctx.save();
      ctx.font = `400 14px "PingFang SC", "Noto Sans SC", sans-serif`;
      ctx.fillStyle = theme.captionColor;
      ctx.textBaseline = "top";
      ctx.textAlign = "center";
      ctx.fillText(img.caption, centerX, imgY + h + 8);
      ctx.restore();
    }
  }

  // 5. Text Flow Lines & Fragments
  for (const line of page.lines) {
    const lineX = stageX + line.x;
    const lineY = stageY + line.y;

    // Bullet point prefix
    if (line.bullet && line.bulletX !== undefined) {
      ctx.save();
      ctx.font = line.font;
      ctx.fillStyle = theme.textColor;
      ctx.textBaseline = "top";
      ctx.fillText(line.bullet, stageX + line.bulletX, lineY);
      ctx.restore();
    }

    let cursorX = lineX;

    for (const fragment of line.fragments) {
      const fragFont = fragment.font || line.font;
      ctx.font = fragFont;
      ctx.textBaseline = "top";

      // Highlight Word Background Box
      if (fragment.highlight) {
        ctx.save();
        ctx.fillStyle = theme.accentColor + "28";
        ctx.beginPath();
        ctx.roundRect(cursorX - 2, lineY - 2, fragment.occupiedWidth + 4, line.lineHeight, 4);
        ctx.fill();
        ctx.restore();
      }

      // Text color
      if (fragment.highlight) {
        ctx.fillStyle = theme.accentColor;
      } else if (line.className.includes("heading")) {
        ctx.fillStyle = theme.headingColor || theme.textColor;
      } else if (line.className.includes("quote")) {
        ctx.fillStyle = theme.quoteColor || theme.textColor;
      } else {
        ctx.fillStyle = theme.textColor;
      }

      ctx.fillText(fragment.text, cursorX, lineY);
      cursorX += fragment.occupiedWidth;
    }
  }

  // 6. Footer Section
  const showFooter = chrome?.showFooter ?? Boolean(config.footerText?.trim());
  const showFooterDivider = chrome?.showFooterDivider ?? Boolean(config.footerText?.trim());
  const showFooterText = chrome?.showFooterText ?? Boolean(config.footerText?.trim());

  if (showFooter) {
    const footerY = spec.height - algorithm.safeArea.bottom;

    if (showFooterDivider) {
      ctx.save();
      ctx.strokeStyle = theme.borderSubtle || "#333333";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(algorithm.safeArea.left, footerY - 20);
      ctx.lineTo(spec.width - algorithm.safeArea.right, footerY - 20);
      ctx.stroke();
      ctx.restore();
    }

    if (showFooterText && config.footerText?.trim()) {
      ctx.save();
      ctx.font = '500 13px "PingFang SC", "Noto Sans SC", Inter, sans-serif';
      ctx.fillStyle = theme.watermarkColor || theme.captionColor;
      ctx.globalAlpha = 0.6;
      ctx.textBaseline = "middle";
      ctx.fillText(config.footerText, algorithm.safeArea.left, footerY);
      ctx.restore();
    }
  }

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
