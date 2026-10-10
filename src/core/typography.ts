import { ContentBlockKind } from "./types";

export interface TypographicScale {
  base: number;
  ratio: number;
}

export const MODULAR_SCALES: Record<string, number> = {
  minorSecond: 1.067,
  majorSecond: 1.125,
  minorThird: 1.2,
  majorThird: 1.25,
  perfectFourth: 1.333,
  goldenRatio: 1.618,
};

export function modularScale(base: number, ratio: number, step: number): number {
  return Math.round(base * Math.pow(ratio, step));
}

/**
 * Smooth proportional line-height via log-curve interpolation.
 * Large display fonts (100px+) -> tighter leading (~1.15).
 * Normal body fonts (30-40px) -> comfortable leading (~1.5-1.6).
 */
export function calculateLineHeight(fontSizePx: number, userMultiplier = 1.45): number {
  if (fontSizePx <= 0) return 24;
  const logNorm = Math.log(Math.max(8, fontSizePx) / 8) / Math.log(160 / 8);
  const baseCurve = 1.65 - logNorm * (1.65 - 1.15);
  const ratio = Math.max(1.1, Math.min(1.8, baseCurve * (userMultiplier / 1.45)));
  return Math.round(fontSizePx * ratio);
}

export function computeBlockStyles(params: {
  baseFontSize: number;
  scaleRatio: number;
  lineHeightMultiplier: number;
  headingFont: string;
  bodyFont: string;
}): Record<
  ContentBlockKind,
  {
    font: string;
    fontSize: number;
    lineHeight: number;
    gapBefore: number;
    gapAfter: number;
    className: string;
  }
> {
  const { baseFontSize, scaleRatio, lineHeightMultiplier, headingFont, bodyFont } = params;

  // Steps in modular scale:
  // paragraph = 0
  // minor-heading = +1
  // subheading = +2
  // heading = +3
  const pSize = baseFontSize;
  const h3Size = modularScale(baseFontSize, scaleRatio, 1);
  const h2Size = modularScale(baseFontSize, scaleRatio, 2);
  const h1Size = modularScale(baseFontSize, scaleRatio, 3);
  const quoteSize = baseFontSize;
  const listSize = baseFontSize;

  return {
    heading: {
      font: `700 ${h1Size}px ${headingFont}, sans-serif`,
      fontSize: h1Size,
      lineHeight: calculateLineHeight(h1Size, lineHeightMultiplier * 0.95),
      gapBefore: Math.round(h1Size * 0.8),
      gapAfter: Math.round(h1Size * 0.4),
      className: "body-heading",
    },
    subheading: {
      font: `700 ${h2Size}px ${headingFont}, sans-serif`,
      fontSize: h2Size,
      lineHeight: calculateLineHeight(h2Size, lineHeightMultiplier * 0.98),
      gapBefore: Math.round(h2Size * 0.7),
      gapAfter: Math.round(h2Size * 0.35),
      className: "body-subheading",
    },
    "minor-heading": {
      font: `700 ${h3Size}px ${headingFont}, sans-serif`,
      fontSize: h3Size,
      lineHeight: calculateLineHeight(h3Size, lineHeightMultiplier),
      gapBefore: Math.round(h3Size * 0.6),
      gapAfter: Math.round(h3Size * 0.3),
      className: "body-minor-heading",
    },
    paragraph: {
      font: `400 ${pSize}px ${bodyFont}, serif`,
      fontSize: pSize,
      lineHeight: calculateLineHeight(pSize, lineHeightMultiplier),
      gapBefore: 0,
      gapAfter: Math.round(pSize * 0.6),
      className: "body-line",
    },
    quote: {
      font: `400 ${quoteSize}px ${bodyFont}, serif`,
      fontSize: quoteSize,
      lineHeight: calculateLineHeight(quoteSize, lineHeightMultiplier * 1.05),
      gapBefore: Math.round(quoteSize * 0.5),
      gapAfter: Math.round(quoteSize * 0.5),
      className: "body-quote",
    },
    "list-item": {
      font: `400 ${listSize}px ${bodyFont}, serif`,
      fontSize: listSize,
      lineHeight: calculateLineHeight(listSize, lineHeightMultiplier),
      gapBefore: 0,
      gapAfter: Math.round(listSize * 0.3),
      className: "body-line",
    },
  };
}
