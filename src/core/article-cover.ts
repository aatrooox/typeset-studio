import type { CoverFont, TypesetConfig } from "./types";

export interface ArticleCoverControls {
  backgroundColor: string;
  titleColor: string;
  fontSize: number;
  textAlign: "left" | "center" | "right";
  safePadding: number;
}

export const ARTICLE_COVER_FONT = Object.freeze({
  id: "publishing-noto-cjk-regular-v1",
  sha256: "b76b0433203017ca80401b2ee0dd69350349871c4b19d504c34dbdd80541690a",
  family: "Publishing Cover",
});
export const ARTICLE_COVER_IMAGE_KEY = "article_cover_image";
export const DEFAULT_ARTICLE_COVER_CONTROLS: Readonly<ArticleCoverControls> = Object.freeze({
  backgroundColor: "#ffffff", titleColor: "#171717", fontSize: 120,
  textAlign: "left", safePadding: 120,
});

/** 预览与快照渲染共用标题清理，重复调用不会继续改变标题。 */
export function normalizeArticleCoverTitle(raw: string): string {
  return raw.trim().replace(/^(?:#+\s*)+/, "").trim();
}

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new RangeError("Invalid article cover object");
  return value as Record<string, unknown>;
}

function exactKeys(value: Record<string, unknown>, keys: string[]) {
  if (Object.keys(value).length !== keys.length || Object.keys(value).some(key => !keys.includes(key))) throw new RangeError("Unsupported article cover fields");
}

function color(value: unknown) {
  if (typeof value !== "string" || !/^#[a-f\d]{6}$/i.test(value)) throw new RangeError("Article cover colors must be six-digit hex");
  return value.toLowerCase();
}

/** 只开放已验证的封面控件，模板不携带字体、路径、URL 或自由布局。 */
export function validateArticleCoverControls(value: unknown): ArticleCoverControls {
  const input = object(value);
  exactKeys(input, ["backgroundColor", "titleColor", "fontSize", "textAlign", "safePadding"]);
  if (!Number.isInteger(input.fontSize) || (input.fontSize as number) < 80 || (input.fontSize as number) > 200) throw new RangeError("Article cover fontSize must be an integer between 80 and 200");
  if (!Number.isInteger(input.safePadding) || (input.safePadding as number) < 60 || (input.safePadding as number) > 200) throw new RangeError("Article cover safePadding must be an integer between 60 and 200");
  if (!["left", "center", "right"].includes(input.textAlign as string)) throw new RangeError("Invalid article cover textAlign");
  return {
    backgroundColor: color(input.backgroundColor), titleColor: color(input.titleColor),
    fontSize: input.fontSize as number, textAlign: input.textAlign as ArticleCoverControls["textAlign"], safePadding: input.safePadding as number,
  };
}

/** 方图素材仅用身份占位，可信后端通过 templateImageOverrides 绑定实际文件。 */
export function createArticleCoverConfig(value: {
  id: string; name: string; controls: unknown; assetId: string;
}): TypesetConfig {
  const input = object(value);
  exactKeys(input, ["id", "name", "controls", "assetId"]);
  const uuid = /^[a-f\d]{8}(-[a-f\d]{4}){3}-[a-f\d]{12}$/i;
  if (typeof input.id !== "string" || !uuid.test(input.id) || typeof input.assetId !== "string" || !uuid.test(input.assetId)) throw new RangeError("Article cover and asset ids must be UUIDs");
  if (typeof input.name !== "string" || !input.name.trim() || input.name.trim().length > 80) throw new RangeError("Article cover name must contain 1 to 80 characters");
  const controls = validateArticleCoverControls(input.controls);
  const safeArea = { top: controls.safePadding, right: 1000 + controls.safePadding, bottom: controls.safePadding, left: controls.safePadding };
  const font: CoverFont = { fontFamily: ARTICLE_COVER_FONT.family, fontSize: controls.fontSize, minFontSize: controls.fontSize, fontWeight: 400, lineHeight: 1.2, letterSpacing: 0 };
  return {
    id: input.id, name: input.name.trim(), slot: "article_cover", aspectRatio: "wechat-cover-2.35",
    algorithm: {
      baseFontSize: controls.fontSize, scaleRatio: 1, lineHeightMultiplier: 1.2,
      obstacleGap: 0, targetFillRatio: 1, contentBottomGap: 0,
      textAlign: controls.textAlign, verticalAlign: "center", safeArea,
    },
    theme: {
      bgColor: controls.backgroundColor, textColor: controls.titleColor, headingColor: controls.titleColor,
      accentColor: controls.titleColor, quoteColor: controls.titleColor, captionColor: controls.titleColor,
      watermarkColor: controls.titleColor, cardBg: controls.backgroundColor,
    },
    typography: { headingFont: ARTICLE_COVER_FONT.family, bodyFont: ARTICLE_COVER_FONT.family },
    footerText: "", watermarkText: "",
    chrome: { showHeader: false, showWatermark: false, showPageNumber: false, showFooter: false, showFooterDivider: false, showFooterText: false, showFillRatio: false },
    coverTheme: {
      id: input.id, format: "wechat-cover-split",
      typography: { title: { ...font }, subtitle: { ...font }, footer: { ...font } },
      colors: { text: controls.titleColor, accent: controls.titleColor, muted: controls.titleColor },
      background: { fill: { type: "solid", color: controls.backgroundColor }, image: null, overlay: null },
      decoration: { pattern: "none", color: controls.titleColor, opacity: 0, size: 1, image: null },
      layout: { textAlign: controls.textAlign, verticalAlign: "center", safeArea: { ...safeArea } },
    },
    images: [{
      id: ARTICLE_COVER_IMAGE_KEY, templateAssetKey: ARTICLE_COVER_IMAGE_KEY,
      src: `asset:${input.assetId}`, alt: "文章封面方图", fit: "cover", isAbsolute: true,
      // 绘制坐标相对文字 stage，抵消留白后落在画布右侧 1000 方图区域。
      x: 2350 - controls.safePadding, y: -controls.safePadding,
      width: 1000, height: 1000, borderRadius: 0, captionHeight: 0, pageIndex: 1, zIndex: 20,
    }],
  };
}
