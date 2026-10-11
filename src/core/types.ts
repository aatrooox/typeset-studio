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
}

export interface FlowLineFragment {
  text: string;
  font: string;
  bold?: boolean;
  italic?: boolean;
  highlight?: boolean;
  gapBefore: number;
  occupiedWidth: number;
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
}

export interface TypesetResult {
  pages: FlowPage[];
  pageCount: number;
  canvasSpec: CanvasSpec;
  config: TypesetConfig;
}
