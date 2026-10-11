import { FlowImage, ResolvedFlowImage } from "./types";

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
  const topTextBuffer = 300;

  // 1. Custom: bypass auto-calculation and honor exact user coordinates
  if (preset === "custom") {
    return {
      ...img,
      x: img.x ?? padding,
      y: img.y ?? topTextBuffer,
      width: img.width ?? 420,
      height: img.height ?? 280,
    };
  }

  // 2. Fill: docked at bottom across the full stage width
  if (preset === "fill") {
    const width = stageWidth;
    const height = img.height || Math.round(stageHeight * 0.28);
    const captionH = img.captionHeight ?? 36;
    const y = Math.max(160, stageHeight - height - captionH - padding);
    return {
      ...img,
      x: 0,
      y,
      width,
      height,
    };
  }

  // Determine standard float dimensions (capped at 52% stage width to guarantee text column space)
  const defaultWidth = 420;
  const defaultHeight = 280;
  const maxFloatWidth = Math.round(stageWidth * 0.52);
  const width = Math.min(img.width || defaultWidth, maxFloatWidth);
  const height = img.height || defaultHeight;

  // 3. Corner Soft: docked at bottom right corner
  if (preset === "corner-soft") {
    const cornerWidth = Math.min(img.width || 380, Math.round(stageWidth * 0.48));
    const cornerHeight = img.height || 260;
    const captionH = img.captionHeight ?? 36;
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

  // 4. Center: horizontally centered
  if (preset === "center") {
    const centerWidth = Math.min(img.width || 560, stageWidth - padding * 2);
    const x = Math.max(0, Math.round((stageWidth - centerWidth) / 2));
    const y =
      img.y && img.y > 0
        ? indexOnPage === 0
          ? img.y
          : img.y + indexOnPage * (height + 40)
        : topTextBuffer + indexOnPage * (height + 40);
    return {
      ...img,
      x,
      y,
      width: centerWidth,
      height,
    };
  }

  // 5. Staggered: alternate left and right per image index
  if (preset === "staggered") {
    const isRight = indexOnPage % 2 === 1;
    const x = isRight ? Math.max(0, stageWidth - width - padding) : padding;
    const y =
      img.y && img.y > 0
        ? indexOnPage === 0
          ? img.y
          : img.y + indexOnPage * (height + 40)
        : topTextBuffer + indexOnPage * (height + 40);
    return {
      ...img,
      x,
      y,
      width,
      height,
    };
  }

  // 6. Mid-Right: right-aligned float
  if (preset === "mid-right") {
    const x = Math.max(0, stageWidth - width - padding);
    const y =
      img.y && img.y > 0
        ? indexOnPage === 0
          ? img.y
          : img.y + indexOnPage * (height + 40)
        : topTextBuffer + indexOnPage * (height + 40);
    return {
      ...img,
      x,
      y,
      width,
      height,
    };
  }

  // 7. Mid-Left: left-aligned float
  if (preset === "mid-left") {
    const x = padding;
    const y =
      img.y && img.y > 0
        ? indexOnPage === 0
          ? img.y
          : img.y + indexOnPage * (height + 40)
        : topTextBuffer + indexOnPage * (height + 40);
    return {
      ...img,
      x,
      y,
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
      y: img.y && img.y > 0 ? img.y : topTextBuffer,
      width: centerWidth,
      height,
    };
  }

  const autoRight = indexOnPage % 2 === 1;
  const autoX = autoRight ? Math.max(0, stageWidth - width - padding) : padding;
  const autoY =
    img.y && img.y > 0
      ? indexOnPage === 0
        ? img.y
        : img.y + indexOnPage * (height + 40)
      : topTextBuffer + indexOnPage * (height + 40);

  return {
    ...img,
    x: autoX,
    y: autoY,
    width,
    height,
  };
}
