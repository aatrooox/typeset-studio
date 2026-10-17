// ── Typeset Studio Core & Public API ──────────────────────────────

export { getDefaultConfig, runTypeset } from "./core/engine";
export {
  renderPageToCanvas,
  renderPageToPng,
  renderTypesetResultToPngs,
  drawPageToContext,
  resolveCanvasFont,
  resolveCanvasFontFamily,
} from "./core/canvas-renderer";
export {
  scanLocalFonts,
  registerServerFonts,
  readFontFamilyName,
  type LocalFontInfo,
} from "./core/font-loader";
export { applyTemplateImages, validateTemplateAssets } from "./core/template";

export {
  typesetStudioAdapter,
  plugin,
  type ImageRenderInput,
  type ImageRenderOutput,
  type ImageRenderPlugin,
  type PipelinePluginDoctorCheck,
  type RenderAsset,
} from "./adapter";

export { resolveTypesetResult, type RenderRequestBody } from "./server/routes/render";

export type {
  AlgorithmParams,
  AspectRatioType,
  CanvasSpec,
  CanvasStyle,
  CanvasFill,
  CanvasPattern,
  CanvasBorder,
  ContentBlockKind,
  CoverFont,
  CoverImage,
  PipelineCoverTheme,
  FlowBlock,
  FlowImage,
  FlowLine,
  FlowPage,
  FlowLineFragment,
  TemplateSlot,
  ThemeColors,
  TypesetChromeConfig,
  TypesetConfig,
  TypesetResult,
} from "./core/types";

export { validateTypesetTemplateConfig } from "./core/validate-config";
