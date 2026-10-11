import { FlowImage, TypesetConfig } from "./types";

/**
 * Applies template image layout configurations to current content images based on index intersection:
 * - If current images exist and template has images:
 *   For 0 <= i < min(template.images.length, current.images.length), apply template layout properties
 *   (isAbsolute, layoutPreset, x, y, width, height, rotate, opacity, zIndex, borderRadius, captionHeight, pageIndex)
 *   while preserving the current image's content identity (id, src, alt, caption).
 *   Current images beyond template.images.length remain untouched ("取交集，另外俩图用户自己调").
 * - If current images are empty (0 images), adopt the template's images (with freshly generated IDs).
 * - If template has no images, current images remain untouched.
 */
export function applyTemplateImages(
  currentImages: FlowImage[],
  templateImages?: FlowImage[],
): FlowImage[] {
  if (!templateImages || templateImages.length === 0) {
    return currentImages;
  }

  if (currentImages.length === 0) {
    return templateImages.map((tplImg) => ({
      ...tplImg,
      id: `img_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    }));
  }

  return currentImages.map((currentImg, idx) => {
    if (idx < templateImages.length) {
      const tplImg = templateImages[idx];
      return {
        ...currentImg,
        layoutPreset: tplImg.layoutPreset ?? currentImg.layoutPreset,
        isAbsolute: tplImg.isAbsolute ?? currentImg.isAbsolute,
        x: tplImg.x ?? currentImg.x,
        y: tplImg.y ?? currentImg.y,
        width: tplImg.width ?? currentImg.width,
        height: tplImg.height ?? currentImg.height,
        rotate: tplImg.rotate ?? currentImg.rotate,
        opacity: tplImg.opacity ?? currentImg.opacity,
        zIndex: tplImg.zIndex ?? currentImg.zIndex,
        borderRadius: tplImg.borderRadius ?? currentImg.borderRadius,
        captionHeight: tplImg.captionHeight ?? currentImg.captionHeight,
        pageIndex: tplImg.pageIndex ?? currentImg.pageIndex,
      };
    }
    return currentImg;
  });
}
