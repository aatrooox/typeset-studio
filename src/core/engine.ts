import { computeStageDimensions, getCanvasSpec } from "./geometry";
import { parseContentBlocks, parseInlineRuns, splitTextByPages } from "./inline-text";
import { paginateBlocks } from "./obstacle-flow";
import { computeBlockStyles } from "./typography";
import { resolveImagePlacement } from "./image-layout";
import {
  ContentBlock,
  FlowBlock,
  FlowImage,
  FlowPage,
  TypesetConfig,
  TypesetResult,
} from "./types";

export function getDefaultConfig(aspectRatio = "longform-3-4" as TypesetConfig["aspectRatio"]): TypesetConfig {
  const spec = getCanvasSpec(aspectRatio);

  // Default font sizing based on canvas width
  const baseSize =
    aspectRatio === "wechat-cover-2.35"
      ? 52
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
      scaleRatio: aspectRatio === "wechat-cover-2.35" ? 1.35 : 1.25,
      lineHeightMultiplier: 1.45,
      obstacleGap: 24,
      targetFillRatio: 0.8,
      contentBottomGap: 20,
      textAlign: "left",
      verticalAlign: aspectRatio === "wechat-cover-2.35" ? "center" : "top",
      safeArea: spec.defaultSafeArea,
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
      headingFont: "AlimamaShuHeiTi",
      bodyFont: "LXGWNeoZhiSongPlus",
    },
    footerText: "Typeset Studio · 纯算法排版",
    watermarkText: "@Antigravity",
  };
}

export function runTypeset(params: {
  markdown: string;
  images?: FlowImage[];
  config: TypesetConfig;
  highlightWords?: string[];
}): TypesetResult {
  const { markdown, images = [], config, highlightWords = [] } = params;
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

  // Check if explicit page markers exist
  const pageSegments = splitTextByPages(markdown);
  let pages: FlowPage[] = [];

  if (pageSegments.length > 1) {
    // Multi-page explicit segmentation
    pages = pageSegments.map((segmentText, index) => {
      const pageNum = index + 1;
      const rawBlocks = parseContentBlocks(segmentText);
      const flowBlocks: FlowBlock[] = rawBlocks.map((b) => ({
        ...blockStyles[b.kind],
        kind: b.kind,
        text: b.text,
        runs: parseInlineRuns(b.text, highlightWords),
        bullet: b.kind === "list-item" ? b.bullet ?? "•" : undefined,
        textIndent: b.kind === "list-item" ? 36 : b.kind === "quote" ? 24 : 0,
        keepWithNext: ["heading", "subheading", "minor-heading"].includes(b.kind),
      }));

      const pageImages = images.filter((img) => img.pageIndex === pageNum || (!img.pageIndex && index === 0));
      const subPages = paginateBlocks(flowBlocks, stageWidth, stageHeight, pageImages, {
        obstacleGap: config.algorithm.obstacleGap,
        pageImageLimit: 2,
        textAlign: config.algorithm.textAlign,
        verticalAlign: config.algorithm.verticalAlign,
      });

      const firstSubPage = subPages[0] ?? {
        pageNumber: pageNum,
        lines: [],
        images: pageImages.map((img, idx) =>
          resolveImagePlacement(img, idx, stageWidth, stageHeight),
        ),
        textBottom: 0,
        fillRatio: 0,
      };

      return {
        ...firstSubPage,
        pageNumber: pageNum,
      };
    });
  } else {
    // Single page or auto-flowing pagination
    const rawBlocks = parseContentBlocks(markdown);
    const flowBlocks: FlowBlock[] = rawBlocks.map((b) => ({
      ...blockStyles[b.kind],
      kind: b.kind,
      text: b.text,
      runs: parseInlineRuns(b.text, highlightWords),
      bullet: b.kind === "list-item" ? b.bullet ?? "•" : undefined,
      textIndent: b.kind === "list-item" ? 36 : b.kind === "quote" ? 24 : 0,
      keepWithNext: ["heading", "subheading", "minor-heading"].includes(b.kind),
    }));

    pages = paginateBlocks(flowBlocks, stageWidth, stageHeight, images, {
      obstacleGap: config.algorithm.obstacleGap,
      pageImageLimit: config.aspectRatio === "longform-3-4" ? 2 : 1,
      textAlign: config.algorithm.textAlign,
      verticalAlign: config.algorithm.verticalAlign,
    });
  }

  // Ensure at least 1 page exists
  if (pages.length === 0) {
    pages = [
      {
        pageNumber: 1,
        lines: [],
        images: images.map((img, idx) =>
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
