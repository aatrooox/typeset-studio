import { AspectRatioType, CanvasSpec } from "./types";

export const CANVAS_SPECS: Record<AspectRatioType, CanvasSpec> = {
  "wechat-cover-2.35": {
    id: "wechat-cover-2.35",
    name: "微信文章封面",
    ratio: 2.35,
    width: 2350,
    height: 1000,
    description: "微信公众号官方推荐大图封面 (2.35:1)，适合主标题视觉张力、副标题与装饰图层",
    defaultSafeArea: { top: 120, right: 140, bottom: 120, left: 140 },
  },
  "longform-3-4": {
    id: "longform-3-4",
    name: "通用长图文",
    ratio: 3 / 4,
    width: 1080,
    height: 1440,
    description: "3:4 手机端阅读长文/图文卡片，支持多页分页、矩形图片绕排、目标填充率优化",
    defaultSafeArea: { top: 96, right: 88, bottom: 96, left: 88 },
  },
  "wide-16-9": {
    id: "wide-16-9",
    name: "通用宽屏",
    ratio: 16 / 9,
    width: 1920,
    height: 1080,
    description: "16:9 横版宽屏，适合推特/X 动态配图、技术博客 Banner、视频封面与分栏排版",
    defaultSafeArea: { top: 100, right: 120, bottom: 100, left: 120 },
  },
  "square-1-1": {
    id: "square-1-1",
    name: "通用正方形",
    ratio: 1,
    width: 1200,
    height: 1200,
    description: "1:1 正方形卡片，适合金句名言卡、公众号次条、小红书方图与社交媒体方版海报",
    defaultSafeArea: { top: 100, right: 100, bottom: 100, left: 100 },
  },
};

export function getCanvasSpec(type: AspectRatioType): CanvasSpec {
  return CANVAS_SPECS[type] ?? CANVAS_SPECS["longform-3-4"];
}

export function computeStageDimensions(
  spec: CanvasSpec,
  safeArea: { top: number; right: number; bottom: number; left: number },
  contentBottomGap = 20,
) {
  const stageWidth = Math.max(100, spec.width - safeArea.left - safeArea.right);
  const stageHeight = Math.max(
    100,
    spec.height - safeArea.top - safeArea.bottom - contentBottomGap,
  );
  return {
    stageWidth,
    stageHeight,
    stageX: safeArea.left,
    stageY: safeArea.top,
  };
}
