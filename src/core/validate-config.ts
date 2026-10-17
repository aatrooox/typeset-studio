import { validateCanvasStyle } from "./canvas-style";
import { validateTemplateAssets } from "./template";
import { getCanvasSpec } from "./geometry";
import type { TypesetConfig } from "./types";

// 宿主只保存原生配置和素材身份，不允许渲染器读取用户指定路径或远程地址。
export function validateTypesetTemplateConfig(value: unknown): TypesetConfig {
  const fail = () => { throw new RangeError("Invalid Typeset template config"); };
  const object = (input: any, keys: string[]) => { if (!input || typeof input !== "object" || Array.isArray(input) || Object.keys(input).some(key => !keys.includes(key))) fail(); };
  const text = (input: any, max = 255) => { if (typeof input !== "string" || input.length > max) fail(); };
  const number = (input: any, min: number, max: number) => { if (typeof input !== "number" || !Number.isFinite(input) || input < min || input > max) fail(); };
  const color = (input: any) => { if (typeof input !== "string" || !/^#[a-f\d]{6}$/i.test(input)) fail(); };
  const source = (input: any) => { if (typeof input !== "string" || !/^asset:[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(input)) fail(); };
  const safe = (input: any) => { object(input, ["top", "right", "bottom", "left"]); for (const key of ["top", "right", "bottom", "left"]) number(input[key], 0, 3350); };
  const alignment = (input: any) => { if (input.textAlign !== undefined && !["left", "center", "right"].includes(input.textAlign)) fail(); if (input.verticalAlign !== undefined && !["top", "center", "bottom"].includes(input.verticalAlign)) fail(); };
  const image = (input: any) => { object(input, ["src", "fit", "position", "opacity"]); source(input.src); if (!["cover", "contain", "fill"].includes(input.fit)) fail(); object(input.position, ["x", "y"]); number(input.position.x, 0, 100); number(input.position.y, 0, 100); number(input.opacity, 0, 1); };
  const input = value as any;
  object(input, ["id", "name", "slot", "aspectRatio", "algorithm", "theme", "typography", "footerText", "watermarkText", "chrome", "images", "coverTheme", "canvasStyle"]);
  text(input.name, 80); if (!input.name.trim()) fail(); if (input.id !== undefined) text(input.id, 100);
  if (!["article_cover", "newspic_cover", "newspic_content"].includes(input.slot)) fail();
  if (input.slot === "article_cover" ? input.aspectRatio !== "wechat-cover-2.35" : !["longform-3-4", "square-1-1", "wide-16-9"].includes(input.aspectRatio)) fail();
  const algorithm = input.algorithm; object(algorithm, ["baseFontSize", "scaleRatio", "lineHeightMultiplier", "obstacleGap", "targetFillRatio", "contentBottomGap", "textAlign", "verticalAlign", "safeArea"]);
  number(algorithm.baseFontSize, 8, 300); number(algorithm.scaleRatio, 1, 2.5); number(algorithm.lineHeightMultiplier, 0.7, 4); number(algorithm.obstacleGap, 0, 400); number(algorithm.targetFillRatio, 0.35, 0.95); number(algorithm.contentBottomGap, 0, 500); safe(algorithm.safeArea); alignment(algorithm);
  const { width, height } = getCanvasSpec(input.aspectRatio);
  if (algorithm.safeArea.left + algorithm.safeArea.right >= width || algorithm.safeArea.top + algorithm.safeArea.bottom + algorithm.contentBottomGap >= height) fail();
  object(input.theme, ["bgColor", "textColor", "headingColor", "accentColor", "quoteColor", "captionColor", "watermarkColor", "cardBg", "borderSubtle"]);
  for (const key of ["bgColor", "textColor", "accentColor", "quoteColor", "captionColor", "watermarkColor"]) color(input.theme[key]); for (const value of Object.values(input.theme)) color(value);
  object(input.typography, ["headingFont", "bodyFont"]); text(input.typography.headingFont, 100); text(input.typography.bodyFont, 100); text(input.footerText); text(input.watermarkText);
  if (input.chrome !== undefined) { object(input.chrome, ["showHeader", "showWatermark", "showPageNumber", "showFooter", "showFooterDivider", "showFooterText", "showFillRatio"]); if (Object.values(input.chrome).some(value => typeof value !== "boolean")) fail(); }
  if (input.images !== undefined) {
    if (!Array.isArray(input.images) || input.images.length > 32) fail();
    const ids = new Set<string>();
    for (const item of input.images) {
      object(item, ["id", "src", "alt", "caption", "templateAssetKey", "repeatEveryPage", "x", "y", "width", "height", "captionHeight", "layoutPreset", "pageIndex", "isAbsolute", "zIndex", "rotate", "opacity", "borderRadius", "fit"]);
      text(item.id, 100); if (!item.id || ids.has(item.id)) fail(); ids.add(item.id); source(item.src); text(item.alt); if (item.caption !== undefined) text(item.caption);
      if (item.templateAssetKey !== undefined) text(item.templateAssetKey, 100);
      for (const key of ["isAbsolute", "repeatEveryPage"]) if (item[key] !== undefined && typeof item[key] !== "boolean") fail();
      for (const key of ["x", "y", "zIndex"]) if (item[key] !== undefined) number(item[key], -3350, 6700);
      for (const key of ["width", "height"]) if (item[key] !== undefined) number(item[key], 1, 6700);
      for (const key of ["captionHeight", "borderRadius"]) if (item[key] !== undefined) number(item[key], 0, 1000);
      if (item.rotate !== undefined) number(item.rotate, -360, 360); if (item.opacity !== undefined) number(item.opacity, 0, 1);
      if (item.pageIndex !== undefined && (!Number.isInteger(item.pageIndex) || item.pageIndex < 1 || item.pageIndex > 50)) fail();
      if (item.fit !== undefined && item.fit !== "cover") fail();
      if (item.layoutPreset !== undefined && !["auto", "fill", "staggered", "mid-left", "mid-right", "center", "corner-soft", "custom"].includes(item.layoutPreset)) fail();
    }
    validateTemplateAssets(input.images);
  }
  if (input.canvasStyle !== undefined) {
    object(input.canvasStyle, ["fill", "pattern", "border"]);
    if (input.canvasStyle.fill) {
      const fill = input.canvasStyle.fill;
      object(fill, fill.type === "solid" ? ["type", "color"] : fill.type === "linear" ? ["type", "angle", "stops"] : ["type", "position", "stops"]);
      if (fill.position) object(fill.position, ["x", "y"]);
      if (Array.isArray(fill.stops)) for (const stop of fill.stops) object(stop, ["color", "offset"]);
    }
    if (input.canvasStyle.pattern) object(input.canvasStyle.pattern, ["pattern", "color", "opacity", "size"]);
    if (input.canvasStyle.border) object(input.canvasStyle.border, ["style", "color", "endColor", "width", "inset", "radius", "opacity"]);
  }
  validateCanvasStyle(input.canvasStyle);
  if (input.coverTheme !== undefined) {
    const cover = input.coverTheme; object(cover, ["id", "format", "typography", "colors", "background", "decoration", "layout"]); text(cover.id, 100); if (cover.format !== (input.slot === "article_cover" ? "wechat-cover-split" : "poster-3-4")) fail();
    object(cover.typography, ["title", "subtitle", "footer"]);
    for (const key of ["title", "subtitle", "footer"]) { const font = cover.typography[key]; object(font, ["fontFamily", "fontSize", "minFontSize", "fontWeight", "lineHeight", "letterSpacing"]); text(font.fontFamily, 100); number(font.fontSize, 1, 500); number(font.minFontSize, 1, font.fontSize); number(font.fontWeight, 100, 900); number(font.lineHeight, 0.7, 4); number(font.letterSpacing, -20, 100); }
    object(cover.colors, ["text", "accent", "muted"]); Object.values(cover.colors).forEach(color);
    object(cover.background, ["fill", "image", "overlay"]); validateCanvasStyle({ fill: cover.background.fill }); if (cover.background.image !== null) image(cover.background.image);
    if (cover.background.overlay !== null) { object(cover.background.overlay, ["color", "opacity"]); color(cover.background.overlay.color); number(cover.background.overlay.opacity, 0, 1); }
    object(cover.decoration, ["pattern", "color", "opacity", "size", "image"]); if (!["none", "lines", "grid", "dots", "rings", "burst"].includes(cover.decoration.pattern)) fail(); validateCanvasStyle({ pattern: cover.decoration }); if (cover.decoration.image !== null) image(cover.decoration.image);
    object(cover.layout, ["textAlign", "verticalAlign", "safeArea"]); alignment(cover.layout); safe(cover.layout.safeArea);
    if (cover.layout.safeArea.left + cover.layout.safeArea.right >= width || cover.layout.safeArea.top + cover.layout.safeArea.bottom + algorithm.contentBottomGap >= height) fail();
  }
  return structuredClone(input) as TypesetConfig;
}
