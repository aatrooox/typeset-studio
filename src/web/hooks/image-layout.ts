import type { FlowImage, TypesetConfig } from "../../core/types";
import { getCanvasSpec } from "../../core/geometry";

export type ImageLayout = Pick<FlowImage, "x" | "y" | "width" | "height" | "isAbsolute" | "layoutPreset" | "pageIndex" | "zIndex" | "rotate" | "opacity" | "borderRadius" | "captionHeight">;

// 仅保存布局，恢复时不覆盖图片来源、说明和固定素材标识。
export function snapshotImageLayout(image: FlowImage): ImageLayout {
  return {
    x: image.x, y: image.y, width: image.width, height: image.height,
    isAbsolute: image.isAbsolute, layoutPreset: image.layoutPreset, pageIndex: image.pageIndex,
    zIndex: image.zIndex, rotate: image.rotate, opacity: image.opacity,
    borderRadius: image.borderRadius, captionHeight: image.captionHeight,
  };
}

// 切回绕排或取消固定素材时关闭重复，防止图片占满每一页。
export function restoreImageLayout(image: FlowImage, layout: Partial<FlowImage>): FlowImage {
  const restored = { ...image, ...layout };
  if (!restored.isAbsolute || !restored.templateAssetKey) restored.repeatEveryPage = false;
  return restored;
}

// 背景使用整张画布，旋转归零，取消后由布局快照还原。
export function backgroundImageLayout(config: TypesetConfig): Partial<FlowImage> {
  const spec = getCanvasSpec(config.aspectRatio);
  return {
    isAbsolute: true, layoutPreset: "custom", zIndex: 0, rotate: 0, borderRadius: 0, captionHeight: 0,
    x: -config.algorithm.safeArea.left, y: -config.algorithm.safeArea.top,
    width: spec.width, height: spec.height,
  };
}
