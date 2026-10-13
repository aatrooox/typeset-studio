import { FlowImage } from "./types";

// 固定素材标识用于显式替换，同一模板内必须唯一。
export function validateTemplateAssets(images: FlowImage[] = []): void {
  if (!Array.isArray(images)) throw new RangeError("模板图片必须是数组");
  const keys = new Set<string>();
  for (const image of images) {
    if (!image || typeof image !== "object") throw new RangeError("无效的模板图片");
    if (image.templateAssetKey === undefined) continue;
    const key = image.templateAssetKey;
    if (image.repeatEveryPage !== undefined && typeof image.repeatEveryPage !== "boolean") throw new RangeError(`素材 ${key} 的每页重复开关必须是布尔值`);
    if (typeof key !== "string" || !/^[a-zA-Z0-9_-]+$/.test(key)) {
      throw new RangeError("素材标识只能包含字母、数字、下划线和短横线");
    }
    if (image.repeatEveryPage && !image.isAbsolute) throw new RangeError(`素材 ${key} 的每页重复仅支持自由定位模式`);
    if (keys.has(key)) throw new RangeError(`重复的模板素材标识：${key}`);
    keys.add(key);
  }
}

// 普通配图按位置套用布局，固定素材仅通过标识替换来源。
export function applyTemplateImages(
  currentImages: FlowImage[],
  templateImages: FlowImage[] = [],
  overrides: Record<string, string> = {},
): FlowImage[] {
  validateTemplateAssets(templateImages);
  if (!overrides || typeof overrides !== "object" || Array.isArray(overrides)) throw new RangeError("素材替换必须是标识到图片地址的映射");
  const fixed = templateImages.filter((image) => image.templateAssetKey);
  for (const [key, src] of Object.entries(overrides)) {
    if (!fixed.some((image) => image.templateAssetKey === key)) throw new RangeError(`未知模板素材：${key}`);
    if (typeof src !== "string" || !src.trim()) throw new RangeError(`素材 ${key} 的替换图片不能为空`);
  }
  const content = currentImages.filter((image) => !image.templateAssetKey);
  const slots = templateImages.filter((image) => !image.templateAssetKey);
  const mapped = content.length === 0
    ? slots.map((image) => ({ ...image, id: `img_${crypto.randomUUID()}` }))
    : content.map((image, index) => {
      const slot = slots[index];
      if (!slot) return image;
      return {
        ...image,
        layoutPreset: slot.layoutPreset ?? image.layoutPreset,
        isAbsolute: slot.isAbsolute ?? image.isAbsolute,
        x: slot.x ?? image.x,
        y: slot.y ?? image.y,
        width: slot.width ?? image.width,
        height: slot.height ?? image.height,
        rotate: slot.rotate ?? image.rotate,
        opacity: slot.opacity ?? image.opacity,
        zIndex: slot.zIndex ?? image.zIndex,
        borderRadius: slot.borderRadius ?? image.borderRadius,
        captionHeight: slot.captionHeight ?? image.captionHeight,
        pageIndex: slot.pageIndex ?? image.pageIndex,
      };
    });
  return [...mapped, ...fixed.map((image) => ({
    ...image,
    src: Object.hasOwn(overrides, image.templateAssetKey!) ? overrides[image.templateAssetKey!] : image.src,
  }))];
}
