export type AspectRatioType =
  | "wechat-cover-2.35"
  | "longform-3-4"
  | "wide-16-9"
  | "square-1-1";

export interface CanvasSpec {
  id: AspectRatioType;
  name: string;
  ratio: number;
  width: number;
  height: number;
  description: string;
  defaultSafeArea: { top: number; right: number; bottom: number; left: number };
}

export interface InlineTextRun {
  text: string;
  bold?: boolean;
  italic?: boolean;
  highlight?: boolean;
  font?: string;
  letterSpacing?: number;
}

export type ContentBlockKind =
  | "heading"
  | "subheading"
  | "minor-heading"
  | "paragraph"
  | "quote"
  | "list-item";

export interface ContentBlock {
  kind: ContentBlockKind;
  text: string;
  bullet?: string;
}

export interface FlowBlock {
  kind: ContentBlockKind;
  text: string;
  runs: InlineTextRun[];
  font: string;
  lineHeight: number;
  className: string;
  gapBefore?: number;
  gapAfter?: number;
  bullet?: string;
  textIndent?: number;
  keepWithNext?: boolean;
}

export interface FlowImage {
  id: string;
  src: string;
  alt: string;
  caption?: string;
  templateAssetKey?: string; // 固定模板素材的唯一标识
  repeatEveryPage?: boolean; // 开启时忽略页码，在所有输出页重复
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  captionHeight?: number;
  layoutPreset?: "auto" | "fill" | "staggered" | "mid-left" | "mid-right" | "center" | "corner-soft" | "custom";
  pageIndex?: number; // 1-indexed, for explicit page placement
  isAbsolute?: boolean; // When true, detaches from flow and does NOT block text layout
  zIndex?: number; // Layer stacking order (e.g. 0 background, 10 text, 20 foreground)
  rotate?: number; // Rotation in degrees (e.g. -15 to 45)
  opacity?: number; // Opacity (0.1 to 1.0)
  borderRadius?: number; // Border radius in px (default 12)
  fit?: "cover"; // 固定方图可按中心裁切，缺省沿用既有拉伸行为。
}

export interface FlowLineFragment {
  text: string;
  font: string;
  bold?: boolean;
  italic?: boolean;
  highlight?: boolean;
  gapBefore: number;
  occupiedWidth: number;
  letterSpacing?: number;
}

export interface FlowLine {
  text: string;
  x: number;
  y: number;
  className: string;
  font: string;
  lineHeight: number;
  maxWidth: number;
  fragments: FlowLineFragment[];
  bullet?: string;
  bulletX?: number;
}

export type ResolvedFlowImage = FlowImage & {
  x: number;
  y: number;
  width: number;
  height: number;
};

export interface FlowPage {
  pageNumber: number;
  lines: FlowLine[];
  images: ResolvedFlowImage[];
  textBottom: number;
  fillRatio: number;
}

export interface AlgorithmParams {
  baseFontSize: number;
  scaleRatio: number; // modular scale ratio (e.g. 1.25)
  lineHeightMultiplier: number; // e.g. 1.45
  obstacleGap: number; // padding around images in px
  targetFillRatio: number; // 0.35 - 0.95
  contentBottomGap: number;
  textAlign?: "left" | "center" | "right";
  verticalAlign?: "top" | "center" | "bottom";
  safeArea: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
}

export interface ThemeColors {
  bgColor: string;
  textColor: string;
  headingColor?: string;
  accentColor: string;
  quoteColor: string;
  captionColor: string;
  watermarkColor: string;
  cardBg?: string;
  borderSubtle?: string;
}

export interface TypesetChromeConfig {
  showHeader?: boolean;
  showWatermark?: boolean;
  showPageNumber?: boolean;
  showFooter?: boolean;
  showFooterDivider?: boolean;
  showFooterText?: boolean;
  showFillRatio?: boolean;
}

export type TemplateSlot = "article_cover" | "newspic_cover" | "newspic_content";

export type CanvasFill = { type: "solid"; color: string } |
  { type: "linear"; angle: number; stops: Array<{ color: string; offset: number }> } |
  { type: "radial"; position: { x: number; y: number }; stops: Array<{ color: string; offset: number }> };

export interface CanvasPattern {
  pattern: "none" | "lines" | "grid" | "dots" | "rings" | "burst" | "diagonal" | "waves" | "checker" | "grain";
  color: string;
  opacity: number;
  size: number;
}

export interface CanvasBorder {
  style: "none" | "solid" | "dashed" | "double" | "corners" | "gradient";
  color: string;
  endColor: string;
  width: number;
  inset: number;
  radius: number;
  opacity: number;
}

// 背景装饰独立于文字主题，封面和正文模板共用。
export interface CanvasStyle {
  fill?: CanvasFill;
  pattern?: CanvasPattern;
  border?: CanvasBorder;
}

export interface TypesetConfig {
  id?: string;
  name: string;
  slot?: TemplateSlot;
  aspectRatio: AspectRatioType;
  algorithm: AlgorithmParams;
  theme: ThemeColors;
  typography: {
    headingFont: string;
    bodyFont: string;
  };
  footerText: string;
  watermarkText: string;
  chrome?: TypesetChromeConfig;
  images?: FlowImage[];
  coverTheme?: PipelineCoverTheme;
  canvasStyle?: CanvasStyle;
}

export interface TypesetResult {
  pages: FlowPage[];
  pageCount: number;
  canvasSpec: CanvasSpec;
  config: TypesetConfig;
}

// 流水线解析后的封面主题，与 pipeline 的公开契约保持一致。
export interface CoverFont {
  fontFamily: string;
  fontSize: number;
  minFontSize: number;
  fontWeight: number;
  lineHeight: number;
  letterSpacing: number;
}
export interface CoverImage {
  src: string;
  fit: "cover" | "contain" | "fill";
  position: { x: number; y: number };
  opacity: number;
}
export interface PipelineCoverTheme {
  id: string;
  format: "poster-3-4" | "wechat-cover-split";
  typography: { title: CoverFont; subtitle: CoverFont; footer: CoverFont };
  colors: { text: string; accent: string; muted: string };
  background: {
    fill: CanvasFill;
    image: CoverImage | null;
    overlay: { color: string; opacity: number } | null;
  };
  decoration: {
    pattern: "none" | "lines" | "grid" | "dots" | "rings" | "burst";
    color: string;
    opacity: number;
    size: number;
    image: CoverImage | null;
  };
  layout: {
    textAlign: "left" | "center" | "right";
    verticalAlign: "top" | "center" | "bottom";
    safeArea: AlgorithmParams["safeArea"];
  };
}
