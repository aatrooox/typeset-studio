import { computeStageDimensions, getCanvasSpec } from "./geometry";
import { parseContentBlocks, parseInlineRuns, splitTextByPages } from "./inline-text";
import { paginateBlocks } from "./obstacle-flow";
import { computeBlockStyles } from "./typography";
import { resolveImagePlacement } from "./image-layout";
import { validateTemplateAssets } from "./template";
import { validateCanvasStyle } from "./canvas-style";
import {
  FlowBlock,
  FlowImage,
  FlowPage,
  TypesetConfig,
  TypesetResult,
} from "./types";

export function getDefaultConfig(aspectRatio: TypesetConfig["aspectRatio"] = "longform-3-4"): TypesetConfig {
  const spec = getCanvasSpec(aspectRatio);
  const isCover = aspectRatio === "wechat-cover-2.35";
  const isSquare = aspectRatio === "square-1-1";

  // Default font sizing based on canvas width
  const baseSize =
    aspectRatio === "wechat-cover-2.35"
      ? 56
      : aspectRatio === "wide-16-9"
        ? 44
        : aspectRatio === "square-1-1"
          ? 48
          : 40;

  return {
    name: "默认样式",
    aspectRatio,
    algorithm: {
      baseFontSize: baseSize,
      scaleRatio: isCover ? 1.35 : 1.25,
      lineHeightMultiplier: 1.45,
      obstacleGap: 24,
      targetFillRatio: 0.8,
      contentBottomGap: isCover ? 0 : 20,
      textAlign: isCover || isSquare ? "center" : "left",
      verticalAlign: isCover || isSquare ? "center" : "top",
      safeArea: isCover
        ? { top: 40, right: 60, bottom: 40, left: 60 }
        : spec.defaultSafeArea,
    },
    theme: {
      bgColor: "#ffffff",
      textColor: "#171717",
      headingColor: "#171717",
      accentColor: "#059669",
      quoteColor: "#525252",
      captionColor: "#737373",
      watermarkColor: "#a3a3a3",
      cardBg: "#f5f5f5",
      borderSubtle: "#e5e5e5",
    },
    typography: {
      headingFont: "PingFang SC",
      bodyFont: "Songti SC",
    },
    footerText: isCover ? "" : "Typeset Studio · 纯算法排版",
    watermarkText: isCover ? "" : "@Antigravity",
    chrome: {
      showHeader: !isCover,
      showWatermark: !isCover,
      showPageNumber: !isCover && !isSquare,
      showFooter: !isCover,
      showFooterDivider: !isCover,
      showFooterText: !isCover,
      showFillRatio: false,
    },
  };
}

export function runTypeset(params: {
  markdown: string;
  images?: FlowImage[];
  config: TypesetConfig;
  highlightWords?: string[];
  minPages?: number;
  maxPages?: number;
  pageFillRatios?: Record<number, number>;
}): TypesetResult {
  const { markdown, images = [], config, highlightWords = [], minPages = 1, maxPages = 0, pageFillRatios } = params;
  if (!Number.isInteger(minPages) || minPages < 1 || !Number.isInteger(maxPages) || maxPages < 0 || (maxPages > 0 && maxPages < minPages)) {
    throw new RangeError("Invalid page constraints: maxPages must be 0 or at least minPages");
  }
  validateTemplateAssets(images);
  validateCanvasStyle(config.canvasStyle);
  if (images.some((image) => !image.repeatEveryPage && image.pageIndex != null && (!Number.isInteger(image.pageIndex) || image.pageIndex < 1 || image.pageIndex > 50))) {
    throw new RangeError("Image pageIndex must be an integer between 1 and 50");
  }
  const spec = getCanvasSpec(config.aspectRatio);
  const { stageWidth, stageHeight } = computeStageDimensions(
    spec,
    config.algorithm.safeArea,
    config.algorithm.contentBottomGap,
  );

  const blockStyles = computeBlockStyles({
    baseFontSize: config.algorithm.baseFontSize,
    scaleRatio: config.algorithm.scaleRatio,
    lineHeightMultiplier: config.algorithm.lineHeightMultiplier,
    headingFont: config.typography.headingFont,
    bodyFont: config.typography.bodyFont,
  });

  if (config.coverTheme) {
    const fonts = config.coverTheme.typography;
    for (const [kind, style] of Object.entries(blockStyles)) {
      const font = kind.includes("heading") ? fonts.title : fonts.subtitle;
      Object.assign(style, {
        font: `${font.fontWeight} ${font.fontSize}px "${font.fontFamily}"`,
        lineHeight: Math.round(font.fontSize * font.lineHeight),
      });
    }
  }

  // 自动分页和手动分页共用相同的文字块样式。
  const createFlowBlocks = (text: string): FlowBlock[] => parseContentBlocks(text).map((block) => ({
    ...blockStyles[block.kind],
    kind: block.kind,
    text: block.text,
    runs: parseInlineRuns(block.text, highlightWords).map((run) => ({
      ...run, letterSpacing: config.coverTheme?.typography[block.kind.includes("heading") ? "title" : "subtitle"].letterSpacing,
    })),
    bullet: block.kind === "list-item" ? block.bullet ?? "•" : undefined,
    textIndent: block.kind === "list-item" ? 28 : block.kind === "quote" ? 20 : 0,
    keepWithNext: ["heading", "subheading", "minor-heading"].includes(block.kind),
  }));

  const templateImages = images.filter((image) => image.templateAssetKey);
  const contentImages = images.filter((image) => !image.templateAssetKey);

  // Check if explicit page markers exist
  const pageSegments = splitTextByPages(markdown);
  let pages: FlowPage[] = [];

  if (pageSegments.length > 1) {
    // 手动段落溢出继续分页，图片仍归属原始段落，最终页码连续。
    const segmentCount = Math.max(pageSegments.length, ...contentImages.map((image) => image.pageIndex || 1));
    if (segmentCount > 50) throw new RangeError("Content exceeds engine limit of 50 pages");
    for (let index = 0; index < segmentCount; index++) {
      const pageImages = contentImages.filter((image) => (image.pageIndex || 1) === index + 1);
      const subPages = paginateBlocks(createFlowBlocks(pageSegments[index] || ""), stageWidth, stageHeight, pageImages, {
        obstacleGap: config.algorithm.obstacleGap,
        pageImageLimit: 2,
        textAlign: config.algorithm.textAlign,
        verticalAlign: config.algorithm.verticalAlign,
        initialPageNumber: pages.length + 1,
        templateImages,
        targetFillRatio: pageFillRatios?.[index + 1] ?? config.algorithm.targetFillRatio,
      });
      pages.push(...(subPages.length ? subPages : [{
        pageNumber: pages.length + 1, lines: [], images: [], textBottom: 0, fillRatio: 0,
      }]));
    }
    const lastTemplatePage = Math.max(0, ...templateImages.filter((image) => !image.repeatEveryPage).map((image) => image.pageIndex || 1));
    if (pages.length < lastTemplatePage) {
      pages.push(...paginateBlocks([], stageWidth, stageHeight, [], {
        initialPageNumber: pages.length + 1, lastPageNumber: lastTemplatePage, templateImages,
      }));
    }
  } else {
    // Single page or auto-flowing pagination
    const flowBlocks = createFlowBlocks(markdown);

    pages = paginateBlocks(flowBlocks, stageWidth, stageHeight, contentImages, {
      obstacleGap: config.algorithm.obstacleGap,
      pageImageLimit: config.aspectRatio === "longform-3-4" ? 2 : 1,
      textAlign: config.algorithm.textAlign,
      verticalAlign: config.algorithm.verticalAlign,
      targetFillRatio: config.algorithm.targetFillRatio,
      pageFillRatios,
      templateImages,
    });
  }

  // 少页约束通过缩短每页文字区分配正文，无法分配时明确报错。
  if (pageSegments.length === 1 && pages.length < minPages && markdown.trim()) {
    for (let attempt = 1; attempt <= 8 && pages.length < minPages; attempt++) {
      const ratio = config.algorithm.targetFillRatio * Math.pow(0.75, attempt);
      try {
        pages = paginateBlocks(createFlowBlocks(markdown), stageWidth, stageHeight, contentImages, {
          obstacleGap: config.algorithm.obstacleGap,
          pageImageLimit: config.aspectRatio === "longform-3-4" ? 2 : 1,
          textAlign: config.algorithm.textAlign,
          verticalAlign: config.algorithm.verticalAlign,
          targetFillRatio: ratio,
          templateImages,
          pageFillRatios: pageFillRatios && Object.fromEntries(Object.entries(pageFillRatios).map(([page, fill]) => [page, Math.min(fill, ratio)])),
        });
      } catch { break; }
    }
  }
  if (pages.length < minPages && minPages > 1) throw new RangeError(`Content cannot satisfy minPages=${minPages}; lower the minimum page count`);
  if (pages.length > 50) throw new RangeError("Content exceeds engine limit of 50 pages");
  if (maxPages > 0 && pages.length > maxPages) throw new RangeError(`Content exceeds maxPages=${maxPages}; no content was discarded`);

  // Ensure at least 1 page exists
  if (pages.length === 0) {
    pages = [
      {
        pageNumber: 1,
        lines: [],
        images: images.filter((image) => !image.templateAssetKey || image.repeatEveryPage || (image.pageIndex || 1) === 1).map((img, idx) =>
          resolveImagePlacement(img, idx, stageWidth, stageHeight),
        ),
        textBottom: 0,
        fillRatio: 0,
      },
    ];
  }

  return {
    pages,
    pageCount: pages.length,
    canvasSpec: spec,
    config,
  };
}
