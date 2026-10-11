import { computeStageDimensions } from "./geometry";
import { CanvasSpec, FlowPage, TypesetConfig } from "./types";

/**
 * Resolves a font family name into a robust font name for Canvas contexts:
 * - On server (macOS / Linux): uses fonts known to Skia (e.g. Hiragino Sans GB, Songti SC)
 * - In browser: uses standard Web and system fonts (PingFang SC, Noto Sans SC, Songti SC)
 */
export function resolveCanvasFontFamily(fontName: string, isServer: boolean = false): string {
  // Extract primary font before any fallback commas
  const rawFirst = (fontName || "").split(",")[0] || "";
  const trimmed = rawFirst.replace(/["'\\]/g, "").trim();

  // 1. Explicit font priority matching: The chosen font family MUST come first
  if (trimmed.includes("Noto Sans") || trimmed === "Noto Sans SC") {
    return isServer ? '"Hiragino Sans GB", sans-serif' : '"Noto Sans SC", "PingFang SC", sans-serif';
  }
  if (trimmed.includes("PingFang") || trimmed === "PingFang SC") {
    return isServer ? '"Hiragino Sans GB", sans-serif' : '"PingFang SC", "Noto Sans SC", sans-serif';
  }
  if (trimmed.includes("Noto Serif") || trimmed === "Noto Serif SC") {
    return isServer ? '"Songti SC", serif' : '"Noto Serif SC", "Songti SC", serif';
  }
  if (trimmed.includes("Songti") || trimmed === "Songti SC" || trimmed === "STSong") {
    return isServer ? '"Songti SC", serif' : '"Songti SC", "Noto Serif SC", serif';
  }
  if (trimmed.includes("Kai") || trimmed.includes("WenKai")) {
    return isServer
      ? '"STKaiti", "Kaiti SC", "Songti SC", serif'
      : '"LXGW WenKai GB Screen", "LXGW WenKai Screen", "Kaiti SC", "STKaiti", serif';
  }
  if (trimmed.includes("Yuan") || trimmed.includes("Yuanti")) {
    return isServer
      ? '"STYuanti", "Yuanti SC", "Hiragino Sans GB", sans-serif'
      : '"Yuanti SC", "STYuanti", "PingFang SC", sans-serif';
  }
  if (trimmed.includes("Inter")) {
    return isServer ? 'Inter, "Hiragino Sans GB", sans-serif' : 'Inter, "PingFang SC", sans-serif';
  }
  if (trimmed.includes("Georgia")) {
    return isServer ? 'Georgia, "Songti SC", serif' : 'Georgia, "Songti SC", serif';
  }

  // 2. Generic fallbacks
  if (trimmed.toLowerCase().includes("serif") || trimmed.includes("Song")) {
    return isServer ? '"Songti SC", serif' : `"${trimmed}", "Songti SC", serif`;
  }
  return isServer ? '"Hiragino Sans GB", sans-serif' : `"${trimmed}", "PingFang SC", sans-serif`;
}

/**
 * Resolves full CSS font strings (e.g. "bold 75px PingFang SC") for Canvas contexts.
 */
export function resolveCanvasFont(fontDesc: string, isServer: boolean = false): string {
  if (!fontDesc) return '16px "PingFang SC", sans-serif';
  const match = fontDesc.match(/^(.*?)([\d.]+(?:px|pt|em|rem))\s+(.+)$/);
  if (!match) return fontDesc;
  const prefix = match[1]; // style / weight (e.g., "bold ", "700 ")
  const size = match[2]; // font size
  const family = match[3]; // family name
  return `${prefix}${size} ${resolveCanvasFontFamily(family, isServer)}`;
}

export interface DrawPageOptions {
  page: FlowPage;
  spec: CanvasSpec;
  config: TypesetConfig;
  totalPageCount?: number;
  /**
   * Function or map to get the loaded image object (HTMLImageElement in browser, Image in Node).
   */
  getImage: (src: string) => any | Promise<any>;
  isServer?: boolean;
}

/**
 * Universal, isomorphic 2D canvas drawing function.
 * Runs identically in the browser (HTMLCanvasElement) and server (@napi-rs/canvas).
 */
export async function drawPageToContext(
  ctx: any,
  options: DrawPageOptions,
): Promise<void> {
  const { page, spec, config, totalPageCount = 1, getImage, isServer = false } = options;
  const { algorithm, theme, chrome } = config;

  // 1. Clear & Background Fill
  ctx.save();
  ctx.fillStyle = theme.bgColor;
  ctx.fillRect(0, 0, spec.width, spec.height);
  ctx.restore();

  // 2. Compute Stage Layout Dimensions
  const { stageWidth, stageHeight, stageX, stageY } = computeStageDimensions(
    spec,
    algorithm.safeArea,
    algorithm.contentBottomGap,
  );

  const isCover = config.aspectRatio === "wechat-cover-2.35";

  // 3. Header Bar (Watermark & Page Number)
  // WeChat Cover defaults to clean display (no watermark / no page number) unless explicitly configured
  const showHeader = chrome?.showHeader ?? !isCover;
  const showWatermark = (chrome?.showWatermark ?? !isCover) && Boolean(config.watermarkText?.trim());
  const showPageNum = (chrome?.showPageNumber ?? (!isCover && totalPageCount > 1)) && totalPageCount > 1;

  if (showHeader && (showWatermark || showPageNum)) {
    // Keep header bar in safe upper margin, safely above stageY
    const headerY = Math.max(24, Math.floor(algorithm.safeArea.top * 0.45));

    if (showWatermark && config.watermarkText?.trim()) {
      ctx.save();
      ctx.font = resolveCanvasFont("600 14px PingFang SC", isServer);
      ctx.fillStyle = theme.watermarkColor;
      ctx.globalAlpha = 0.45;
      ctx.textBaseline = "middle";
      ctx.textAlign = "left";
      ctx.fillText(config.watermarkText.toUpperCase(), algorithm.safeArea.left, headerY);
      ctx.restore();
    }

    if (showPageNum) {
      ctx.save();
      const pageText = `P.${String(page.pageNumber).padStart(2, "0")}`;
      ctx.font = '500 12px "SF Mono", Monaco, Menlo, Consolas, monospace';
      ctx.textBaseline = "middle";
      ctx.textAlign = "left";
      const metrics = ctx.measureText(pageText);
      const pillW = metrics.width + 16;
      const pillH = 24;
      const pillX = spec.width - algorithm.safeArea.right - pillW;
      const pillY = headerY - pillH / 2;

      ctx.strokeStyle = theme.textColor;
      ctx.globalAlpha = 0.4;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(pillX, pillY, pillW, pillH, 12);
      ctx.stroke();

      ctx.fillStyle = theme.textColor;
      ctx.fillText(pageText, pillX + 8, headerY);
      ctx.restore();
    }
  }

  // 4. Obstacle Images & Free Absolute Layers
  const sortedImages = [...(page.images || [])].sort((a, b) => {
    const za = a.zIndex ?? (a.isAbsolute ? 20 : 5);
    const zb = b.zIndex ?? (b.isAbsolute ? 20 : 5);
    return za - zb;
  });

  for (const img of sortedImages) {
    const loadedImg = await getImage(img.src);
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

    // Image Caption (e.g., "图 1：建筑结构中的空间秩序感")
    if (img.caption?.trim()) {
      ctx.save();
      const capFontSize = Math.max(14, Math.round(algorithm.baseFontSize * 0.45));
      ctx.font = resolveCanvasFont(`400 ${capFontSize}px PingFang SC`, isServer);
      ctx.fillStyle = theme.captionColor;
      ctx.textBaseline = "top";
      ctx.textAlign = "center";
      ctx.fillText(img.caption, centerX, imgY + h + 12);
      ctx.restore();
    }
  }

  // 5. Text Flow Lines & Fragments
  for (const line of page.lines) {
    const lineX = stageX + line.x;
    const lineY = stageY + line.y;

    // Quote vertical indicator bar (for markdown blockquotes > ...)
    if (line.className === "body-quote") {
      ctx.save();
      ctx.fillStyle = theme.accentColor;
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      const barHeight = Math.max(1, line.lineHeight - 8);
      if (typeof ctx.roundRect === "function") {
        ctx.roundRect(stageX, lineY + 4, 3.5, barHeight, 2);
      } else {
        ctx.rect(stageX, lineY + 4, 3.5, barHeight);
      }
      ctx.fill();
      ctx.restore();
    }

    // Bullet point / Ordered list prefix
    if (line.bullet && line.bulletX !== undefined) {
      ctx.save();
      ctx.fillStyle = theme.accentColor;
      if (line.bullet === "•") {
        const bulletRadius = Math.max(3, Math.round(algorithm.baseFontSize * 0.08));
        const bulletCenterX = stageX + line.bulletX + 8;
        const bulletCenterY = lineY + Math.round(line.lineHeight * 0.42);
        ctx.beginPath();
        ctx.arc(bulletCenterX, bulletCenterY, bulletRadius, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.font = resolveCanvasFont(line.font, isServer);
        ctx.textBaseline = "top";
        ctx.textAlign = "left";
        ctx.fillText(line.bullet, stageX + line.bulletX, lineY);
      }
      ctx.restore();
    }

    let cursorX = lineX;

    for (const fragment of line.fragments) {
      const rawFont = fragment.font || line.font;
      const fragFont = resolveCanvasFont(rawFont, isServer);
      ctx.font = fragFont;
      ctx.textBaseline = "top";
      ctx.textAlign = "left";

      // Text color determination (Highlights use accentColor)
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

      // Measure fragment advance precisely with ctx.measureText
      // to ensure zero text overlap regardless of font metrics
      const measuredWidth = ctx.measureText(fragment.text).width;
      cursorX += measuredWidth + (fragment.gapBefore || 0);
    }
  }

  // 6. Footer Section
  const showFooter = chrome?.showFooter ?? !isCover;
  const showFooterDivider = chrome?.showFooterDivider ?? (!isCover && Boolean(config.footerText?.trim()));
  const showFooterText = (chrome?.showFooterText ?? !isCover) && Boolean(config.footerText?.trim());

  if (showFooter) {
    const footerY = spec.height - Math.max(24, Math.floor(algorithm.safeArea.bottom * 0.45));

    if (showFooterDivider) {
      ctx.save();
      ctx.strokeStyle = theme.borderSubtle || "#e5e5e5";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(algorithm.safeArea.left, footerY - 14);
      ctx.lineTo(spec.width - algorithm.safeArea.right, footerY - 14);
      ctx.stroke();
      ctx.restore();
    }

    if (showFooterText && config.footerText?.trim()) {
      ctx.save();
      ctx.font = resolveCanvasFont('500 13px PingFang SC', isServer);
      ctx.fillStyle = theme.watermarkColor || theme.captionColor;
      ctx.globalAlpha = 0.6;
      ctx.textBaseline = "middle";
      ctx.textAlign = "left";
      ctx.fillText(config.footerText, algorithm.safeArea.left, footerY);
      ctx.restore();
    }
  }
}
