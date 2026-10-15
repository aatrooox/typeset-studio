import { getDefaultConfig } from "./engine";
import { DEFAULT_BORDER, DEFAULT_PATTERN } from "./canvas-style";
import type { CanvasFill, CanvasPattern, CanvasBorder, TypesetConfig } from "./types";

// 预设仅使用程序绘制，不依赖图片文件或远程素材。
const designs: Array<{
  id: string; name: string; fill: CanvasFill; pattern: CanvasPattern["pattern"];
  ink: string; accent: string; texture: string; border: CanvasBorder["style"];
  size: number; opacity: number; font: string;
}> = [
  { id: "sage", name: "浅草信笺 · 径向渐变 / 圆点", fill: { type: "radial", position: { x: 15, y: 10 }, stops: [{ color: "#f8f6e8", offset: 0 }, { color: "#d0e5d7", offset: 100 }] }, pattern: "dots", ink: "#243c32", accent: "#47785c", texture: "#47785c", border: "solid", size: 48, opacity: 0.16, font: "Songti SC" },
  { id: "sunset", name: "落日来信 · 线性渐变 / 波浪", fill: { type: "linear", angle: 70, stops: [{ color: "#fff2d8", offset: 0 }, { color: "#f1c2a2", offset: 55 }, { color: "#df9b91", offset: 100 }] }, pattern: "waves", ink: "#663b32", accent: "#ab503d", texture: "#a55f4c", border: "gradient", size: 88, opacity: 0.12, font: "Kaiti SC" },
  { id: "blueprint", name: "工程蓝图 · 深蓝渐变 / 网格", fill: { type: "linear", angle: 115, stops: [{ color: "#142f48", offset: 0 }, { color: "#071923", offset: 100 }] }, pattern: "grid", ink: "#e6f1ec", accent: "#a1d7c6", texture: "#91c3d0", border: "corners", size: 56, opacity: 0.12, font: "PingFang SC" },
  { id: "eclipse", name: "月蚀光场 · 径向渐变 / 圆环", fill: { type: "radial", position: { x: 85, y: 12 }, stops: [{ color: "#53747a", offset: 0 }, { color: "#182e38", offset: 45 }, { color: "#0e1d27", offset: 100 }] }, pattern: "rings", ink: "#f1eddf", accent: "#ddba80", texture: "#e3c899", border: "gradient", size: 92, opacity: 0.10, font: "Songti SC" },
  { id: "paper", name: "旧纸书页 · 纸张颗粒 / 双线框", fill: { type: "solid", color: "#f2ead8" }, pattern: "grain", ink: "#403b30", accent: "#8a503b", texture: "#6b533e", border: "double", size: 24, opacity: 0.16, font: "Songti SC" },
  { id: "rose", name: "玫瑰邮笺 · 柔粉渐变 / 斜线", fill: { type: "linear", angle: 120, stops: [{ color: "#fff6ef", offset: 0 }, { color: "#efd6d4", offset: 100 }] }, pattern: "diagonal", ink: "#583f45", accent: "#9f5f68", texture: "#ae777a", border: "dashed", size: 64, opacity: 0.10, font: "Kaiti SC" },
  { id: "checker", name: "黄油棋盘 · 奶油底色 / 棋盘格", fill: { type: "solid", color: "#faf2d9" }, pattern: "checker", ink: "#3c4937", accent: "#66784c", texture: "#b5bb89", border: "solid", size: 104, opacity: 0.10, font: "PingFang SC" },
  { id: "burst", name: "日光放射 · 暖黄渐变 / 放射线", fill: { type: "radial", position: { x: 80, y: 20 }, stops: [{ color: "#fff7d1", offset: 0 }, { color: "#e8c982", offset: 100 }] }, pattern: "burst", ink: "#58452b", accent: "#976333", texture: "#aa7739", border: "corners", size: 100, opacity: 0.12, font: "PingFang SC" },
  { id: "ruled", name: "雾蓝手账 · 浅蓝渐变 / 横线", fill: { type: "linear", angle: 90, stops: [{ color: "#f0f5f4", offset: 0 }, { color: "#d3e3e8", offset: 100 }] }, pattern: "lines", ink: "#304d5b", accent: "#4b7484", texture: "#7294a3", border: "double", size: 64, opacity: 0.14, font: "Kaiti SC" },
];

export const CANVAS_PRESETS: TypesetConfig[] = designs.map((design) => {
  const base = getDefaultConfig("longform-3-4");
  return {
    ...base, id: `tpl_canvas_${design.id}`, name: design.name, slot: "newspic_content", images: [],
    algorithm: { ...base.algorithm, baseFontSize: 42, scaleRatio: 1.3, targetFillRatio: 0.83,
      safeArea: { top: 126, right: 108, bottom: 110, left: 108 } },
    typography: { headingFont: design.font, bodyFont: design.font },
    theme: { ...base.theme, bgColor: design.fill.type === "solid" ? design.fill.color : design.fill.stops[0].color,
      textColor: design.ink, headingColor: design.ink, accentColor: design.accent, quoteColor: design.accent,
      captionColor: design.accent, watermarkColor: design.accent },
    chrome: { ...base.chrome, showHeader: false, showFooter: false }, footerText: "", watermarkText: "",
    canvasStyle: { fill: design.fill,
      pattern: { ...DEFAULT_PATTERN, pattern: design.pattern, color: design.texture, size: design.size, opacity: design.opacity },
      border: { ...DEFAULT_BORDER, style: design.border, color: design.accent, endColor: design.texture, width: 2, inset: 38, radius: design.id === "paper" ? 0 : 22, opacity: 0.65 } },
  };
});
