import type { CanvasBorder, CanvasFill, CanvasPattern, CanvasSpec, CanvasStyle } from "./types";

export const DEFAULT_PATTERN: CanvasPattern = { pattern: "none", color: "#527561", opacity: 0.12, size: 56 };
export const DEFAULT_BORDER: CanvasBorder = { style: "none", color: "#527561", endColor: "#d7ad72", width: 3, inset: 32, radius: 24, opacity: 0.8 };
export const PATTERN_LABELS: Record<CanvasPattern["pattern"], string> = {
  none: "无花纹", lines: "横线", grid: "网格", dots: "圆点", diagonal: "斜线", waves: "波浪",
  rings: "同心圆", burst: "放射线", checker: "棋盘格", grain: "纸张颗粒",
};
export const BORDER_LABELS: Record<CanvasBorder["style"], string> = {
  none: "无边框", solid: "实线", dashed: "虚线", double: "双线", corners: "四角装饰", gradient: "渐变描边",
};

// 限制颜色和密度，避免无效配置或过密花纹拖慢渲染。
export function validateCanvasStyle(style?: CanvasStyle): void {
  if (style === undefined) return;
  if (!style || typeof style !== "object" || Array.isArray(style)) throw new RangeError("无效的背景与边框配置");
  const color = (value: string) => { if (typeof value !== "string" || !/^#[0-9a-f]{6}$/i.test(value)) throw new RangeError("背景装饰颜色必须是六位十六进制颜色"); };
  const number = (value: number, min: number, max: number) => { if (!Number.isFinite(value) || value < min || value > max) throw new RangeError(`背景装饰参数必须在 ${min} 到 ${max} 之间`); };
  if (style.fill) {
    const fill = style.fill;
    if (fill.type === "solid") color(fill.color);
    else {
      if (fill.type === "linear") number(fill.angle, 0, 360);
      else if (fill.type === "radial") { number(fill.position?.x, 0, 100); number(fill.position?.y, 0, 100); }
      else throw new RangeError("未知背景类型");
      if (!Array.isArray(fill.stops) || fill.stops.length < 2 || fill.stops.length > 8) throw new RangeError("渐变需要 2 到 8 个颜色节点");
      for (const stop of fill.stops) { if (!stop) throw new RangeError("无效的渐变节点"); color(stop.color); number(stop.offset, 0, 100); }
    }
  }
  if (style.pattern) {
    const pattern = style.pattern;
    if (!Object.hasOwn(PATTERN_LABELS, pattern.pattern)) throw new RangeError("未知背景花纹");
    color(pattern.color); number(pattern.opacity, 0, 1); number(pattern.size, 16, 240);
  }
  if (style.border) {
    const border = style.border;
    if (!Object.hasOwn(BORDER_LABELS, border.style)) throw new RangeError("未知边框样式");
    color(border.color); color(border.endColor); number(border.width, 1, 24);
    number(border.inset, 0, 200); number(border.radius, 0, 200); number(border.opacity, 0, 1);
  }
}

// 浏览器与 Skia 使用同一组 Canvas 2D 指令。
export function drawCanvasFill(ctx: CanvasRenderingContext2D, spec: CanvasSpec, fill: CanvasFill): void {
  ctx.save();
  if (fill.type === "solid") ctx.fillStyle = fill.color;
  else {
    let gradient: CanvasGradient;
    if (fill.type === "linear") {
      const angle = fill.angle * Math.PI / 180;
      const distance = Math.abs(Math.cos(angle)) * spec.width / 2 + Math.abs(Math.sin(angle)) * spec.height / 2;
      const dx = Math.cos(angle) * distance;
      const dy = Math.sin(angle) * distance;
      gradient = ctx.createLinearGradient(spec.width / 2 - dx, spec.height / 2 - dy, spec.width / 2 + dx, spec.height / 2 + dy);
    } else {
      const x = spec.width * fill.position.x / 100;
      const y = spec.height * fill.position.y / 100;
      const radius = Math.hypot(Math.max(x, spec.width - x), Math.max(y, spec.height - y));
      gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    }
    for (const stop of fill.stops) gradient.addColorStop(stop.offset / 100, stop.color);
    ctx.fillStyle = gradient;
  }
  ctx.fillRect(0, 0, spec.width, spec.height);
  ctx.restore();
}

// 颗粒使用固定种子，重复导出和远程出图保持一致。
export function drawCanvasPattern(ctx: CanvasRenderingContext2D, spec: CanvasSpec, decoration: CanvasPattern): void {
  if (decoration.pattern === "none" || decoration.opacity === 0) return;
  const { width, height } = spec;
  const size = Math.max(16, decoration.size);
  ctx.save();
  ctx.strokeStyle = ctx.fillStyle = decoration.color;
  ctx.globalAlpha = decoration.opacity;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  switch (decoration.pattern) {
    case "grid":
    case "lines":
      if (decoration.pattern === "grid") for (let x = size / 2; x < width; x += size) { ctx.moveTo(x, 0); ctx.lineTo(x, height); }
      for (let y = size / 2; y < height; y += size) { ctx.moveTo(0, y); ctx.lineTo(width, y); }
      break;
    case "dots":
      for (let x = size / 2; x < width; x += size) for (let y = size / 2; y < height; y += size) { ctx.moveTo(x + 2, y); ctx.arc(x, y, 2, 0, Math.PI * 2); }
      break;
    case "diagonal":
      for (let x = -height; x < width; x += size) { ctx.moveTo(x, 0); ctx.lineTo(x + height, height); }
      break;
    case "waves":
      for (let y = -size; y < height + size; y += size) {
        ctx.moveTo(0, y);
        for (let x = 0; x < width; x += size * 2) ctx.bezierCurveTo(x + size * 0.5, y - size * 0.45, x + size * 1.5, y + size * 0.45, x + size * 2, y);
      }
      break;
    case "rings":
      for (let r = size; r < Math.hypot(width, height); r += size) { ctx.moveTo(width * 0.82 + r, height * 0.18); ctx.arc(width * 0.82, height * 0.18, r, 0, Math.PI * 2); }
      break;
    case "burst":
      for (let a = 0; a < Math.PI * 2; a += Math.PI / Math.max(8, Math.round(size / 3))) {
        ctx.moveTo(width * 0.8, height * 0.2); ctx.lineTo(width * 0.8 + Math.cos(a) * width * 2, height * 0.2 + Math.sin(a) * height * 2);
      }
      break;
    case "checker":
      for (let x = 0; x < width; x += size) for (let y = 0; y < height; y += size) if ((Math.round(x / size) + Math.round(y / size)) % 2 === 0) ctx.rect(x, y, size, size);
      break;
    case "grain": {
      let seed = 42;
      const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
      for (let i = 0; i < width * height / (size * 3); i++) { const x = random() * width; const y = random() * height; ctx.rect(x, y, 0.6 + random() * 1.2, 0.6 + random() * 1.2); }
      break;
    }
  }
  if (["dots", "checker", "grain"].includes(decoration.pattern)) ctx.fill(); else ctx.stroke();
  ctx.restore();
}

// 边框最后绘制，固定背景图不会将边框盖住。
export function drawCanvasBorder(ctx: CanvasRenderingContext2D, spec: CanvasSpec, border?: CanvasBorder): void {
  if (!border || border.style === "none" || border.opacity === 0) return;
  const inset = Math.min(border.inset + border.width / 2, Math.min(spec.width, spec.height) / 2 - 1);
  const width = spec.width - inset * 2;
  const height = spec.height - inset * 2;
  ctx.save();
  ctx.globalAlpha = border.opacity;
  ctx.lineWidth = border.width;
  ctx.strokeStyle = border.color;
  if (border.style === "gradient") {
    const gradient = ctx.createLinearGradient(0, 0, spec.width, spec.height);
    gradient.addColorStop(0, border.color); gradient.addColorStop(1, border.endColor);
    ctx.strokeStyle = gradient;
  }
  if (border.style === "dashed") ctx.setLineDash([border.width * 4, border.width * 3]);
  const outline = (gap: number) => {
    ctx.beginPath(); ctx.roundRect(inset + gap, inset + gap, width - gap * 2, height - gap * 2, Math.max(0, border.radius - gap)); ctx.stroke();
  };
  if (border.style === "corners") {
    const length = Math.min(width, height) * 0.12;
    for (const x of [inset, spec.width - inset]) for (const y of [inset, spec.height - inset]) {
      const dx = x === inset ? 1 : -1;
      const dy = y === inset ? 1 : -1;
      ctx.beginPath(); ctx.moveTo(x + dx * length, y); ctx.lineTo(x, y); ctx.lineTo(x, y + dy * length); ctx.stroke();
    }
  } else {
    outline(0);
    if (border.style === "double") outline(border.width * 3 + 4);
  }
  ctx.restore();
}
