import { FlowImage, ResolvedFlowImage } from "./types";

function computeSafePresetY(
  indexOnPage: number,
  height: number,
  captionH: number,
  stageHeight: number,
): number {
  const topTextBuffer = Math.min(260, Math.round(stageHeight * 0.22));
  const rawY = topTextBuffer + indexOnPage * (height + 32);
  const maxY = Math.max(60, stageHeight - height - captionH - 16);
  return Math.min(rawY, maxY);
}

/**
 * Resolves obstacle placement (x, y, width, height) based on layoutPreset and canvas stage dimensions.
 * Ensures obstacles dynamically align with left/right/center/fill margins and update in real-time.
 */
export function resolveImagePlacement(
  img: FlowImage,
  indexOnPage: number,
  stageWidth: number,
  stageHeight: number,
): ResolvedFlowImage {
  const preset = img.layoutPreset || "auto";
  const padding = 16;
  const captionH = img.captionHeight ?? 36;

  // 0. Absolute Free Layer: bypass preset calculation, preserve exact coordinates
  if (img.isAbsolute) {
    return {
      ...img,
      x: img.x ?? padding,
      y: img.y ?? 100,
      width: img.width ?? 420,
      height: img.height ?? 280,
    };
  }

  // 1. Custom: bypass auto-calculation and honor exact user coordinates
  if (preset === "custom") {
    return {
      ...img,
      x: img.x ?? padding,
      y: img.y ?? 260,
      width: img.width ?? 420,
      height: img.height ?? 280,
    };
  }

  // 2. Fill: docked at bottom across the full stage width
  if (preset === "fill") {
    const width = stageWidth;
    const height = img.height || Math.round(stageHeight * 0.28);
    const y = Math.max(160, stageHeight - height - captionH - padding);
    return {
      ...img,
      x: 0,
      y,
      width,
      height,
    };
  }

  // 3. Corner Soft: docked at bottom right corner
  if (preset === "corner-soft") {
    const cornerWidth = Math.min(img.width || 380, Math.round(stageWidth * 0.48));
    const cornerHeight = img.height || 260;
    const x = Math.max(0, stageWidth - cornerWidth - padding);
    const y = Math.max(160, stageHeight - cornerHeight - captionH - 24);
    return {
      ...img,
      x,
      y,
      width: cornerWidth,
      height: cornerHeight,
    };
  }

  // Standard float dimensions for non-fill presets
  const defaultWidth = 420;
  const defaultHeight = 280;
  const maxFloatWidth = Math.round(stageWidth * 0.52);
  const width = Math.min(img.width || defaultWidth, maxFloatWidth);
  const height = img.height || defaultHeight;
  const safeY = computeSafePresetY(indexOnPage, height, captionH, stageHeight);

  // 4. Center: horizontally centered banner
  if (preset === "center") {
    const centerWidth = Math.min(img.width || 560, stageWidth - padding * 2);
    const x = Math.max(0, Math.round((stageWidth - centerWidth) / 2));
    return {
      ...img,
      x,
      y: safeY,
      width: centerWidth,
      height,
    };
  }

  // 5. Staggered: alternate left and right per image index
  if (preset === "staggered") {
    const isRight = indexOnPage % 2 === 1;
    const x = isRight ? Math.max(0, stageWidth - width - padding) : padding;
    return {
      ...img,
      x,
      y: safeY,
      width,
      height,
    };
  }

  // 6. Mid-Right: right-aligned float
  if (preset === "mid-right") {
    const x = Math.max(0, stageWidth - width - padding);
    return {
      ...img,
      x,
      y: safeY,
      width,
      height,
    };
  }

  // 7. Mid-Left: left-aligned float
  if (preset === "mid-left") {
    const x = padding;
    return {
      ...img,
      x,
      y: safeY,
      width,
      height,
    };
  }

  // 8. Auto: adaptive placement based on width and index
  const isWide = (img.width || defaultWidth) >= stageWidth * 0.75;
  if (isWide) {
    const centerWidth = Math.min(img.width || defaultWidth, stageWidth - padding * 2);
    return {
      ...img,
      x: Math.max(0, Math.round((stageWidth - centerWidth) / 2)),
      y: safeY,
      width: centerWidth,
      height,
    };
  }

  const autoRight = indexOnPage % 2 === 1;
  const autoX = autoRight ? Math.max(0, stageWidth - width - padding) : padding;

  return {
    ...img,
    x: autoX,
    y: safeY,
    width,
    height,
  };
}
