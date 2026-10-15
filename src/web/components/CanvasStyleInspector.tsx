import React from "react";
import { BORDER_LABELS, DEFAULT_BORDER, DEFAULT_PATTERN, PATTERN_LABELS } from "../../core/canvas-style";
import type { CanvasFill, CanvasStyle, TypesetConfig } from "../../core/types";

interface Props {
  config: TypesetConfig;
  onChange: (style: CanvasStyle) => void;
}

const control = "w-full rounded border border-[#dfdfdf] dark:border-[#333333] bg-white dark:bg-[#141414] px-2 py-1 text-[11px]";

// 装饰配置独立保存，切换背景不会改变字体和正文排版。
export function CanvasStyleInspector({ config, onChange }: Props) {
  const style = config.canvasStyle || {};
  const fill = style.fill || config.coverTheme?.background.fill || { type: "solid", color: config.theme.bgColor };
  const pattern = style.pattern || config.coverTheme?.decoration || DEFAULT_PATTERN;
  const border = style.border || DEFAULT_BORDER;
  const updateFill = (next: CanvasFill) => onChange({ ...style, fill: next });
  const updatePattern = (partial: Partial<typeof pattern>) => onChange({ ...style, pattern: { ...pattern, ...partial } });
  const updateBorder = (partial: Partial<typeof border>) => onChange({ ...style, border: { ...border, ...partial } });
  const colorInput = (label: string, value: string, update: (value: string) => void) => (
    <label className="flex items-center justify-between gap-2">
      <span>{label}</span><span className="flex items-center gap-1.5 font-mono">
        <span>{value}</span><input aria-label={label} type="color" value={value} onChange={(event) => update(event.target.value)} className="h-6 w-7 cursor-pointer bg-transparent" />
      </span>
    </label>
  );
  const slider = (label: string, value: number, min: number, max: number, update: (value: number) => void, step = 1) => (
    <label className="flex flex-col gap-1">
      <span className="flex justify-between"><span>{label}</span><span className="font-mono">{step < 1 ? `${Math.round(value * 100)}%` : value}</span></span>
      <input aria-label={label} type="range" min={min} max={max} step={step} value={value} onChange={(event) => update(Number(event.target.value))} className="w-full accent-emerald-600" />
    </label>
  );
  const switchFill = (type: CanvasFill["type"]) => {
    const color = fill.type === "solid" ? fill.color : fill.stops[0].color;
    const stops = fill.type === "solid" ? [{ color, offset: 0 }, { color: config.theme.accentColor, offset: 100 }] : fill.stops;
    updateFill(type === "solid" ? { type, color } : type === "linear" ? { type, angle: 90, stops } : { type, position: { x: 50, y: 30 }, stops });
  };

  return (
    <section className="border-b border-[#f0f0f0] dark:border-[#1c1c1c] p-3.5 text-xs">
      <div className="mb-3 font-semibold text-[#171717] dark:text-white">背景、花纹与边框</div>
      <div className="flex flex-col gap-3 text-[11px] text-[#666666] dark:text-[#aaaaaa]">
        <label className="flex flex-col gap-1">背景类型
          <select className={control} value={fill.type} onChange={(event) => switchFill(event.target.value as CanvasFill["type"])}>
            <option value="solid">纯色</option><option value="linear">线性渐变</option><option value="radial">径向渐变</option>
          </select>
        </label>
        {fill.type === "solid" ? colorInput("背景颜色", fill.color, (color) => updateFill({ type: "solid", color })) : <>
          <div className="flex flex-col gap-2 rounded border border-[#eaeaea] dark:border-[#333333] p-2">
            {fill.stops.map((stop, index) => <div key={index} className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <label className="flex flex-1 items-center gap-1.5">
                  <input aria-label={`渐变颜色 ${index + 1}`} type="color" value={stop.color} onChange={(event) => updateFill({ ...fill, stops: fill.stops.map((item, i) => i === index ? { ...item, color: event.target.value } : item) })} className="h-6 w-7 bg-transparent" />
                  <span className="font-mono">{stop.color}</span>
                </label>
                <button type="button" disabled={fill.stops.length <= 2} onClick={() => updateFill({ ...fill, stops: fill.stops.filter((_, i) => i !== index) })} className="disabled:opacity-30" aria-label={`删除渐变颜色 ${index + 1}`}>移除</button>
              </div>
              {slider(`节点 ${index + 1} 位置`, stop.offset, 0, 100, (offset) => updateFill({ ...fill, stops: fill.stops.map((item, i) => i === index ? { ...item, offset } : item) }))}
            </div>)}
            <button type="button" disabled={fill.stops.length >= 8} onClick={() => updateFill({ ...fill, stops: [...fill.stops, { color: config.theme.accentColor, offset: 50 }] })} className="rounded border border-[#dfdfdf] dark:border-[#333333] py-1 disabled:opacity-30">添加颜色节点</button>
          </div>
          {fill.type === "linear" ? slider("渐变角度", fill.angle, 0, 360, (angle) => updateFill({ ...fill, angle })) : <>
            {slider("渐变中心 X", fill.position.x, 0, 100, (x) => updateFill({ ...fill, position: { ...fill.position, x } }))}
            {slider("渐变中心 Y", fill.position.y, 0, 100, (y) => updateFill({ ...fill, position: { ...fill.position, y } }))}
          </>}
        </>}
        <label className="flex flex-col gap-1">几何花纹
          <select className={control} value={pattern.pattern} onChange={(event) => updatePattern({ pattern: event.target.value as typeof pattern.pattern })}>
            {Object.entries(PATTERN_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        {pattern.pattern !== "none" && <>
          {colorInput("花纹颜色", pattern.color, (color) => updatePattern({ color }))}
          {slider("花纹透明度", pattern.opacity, 0, 1, (opacity) => updatePattern({ opacity }), 0.01)}
          {slider("花纹间距", pattern.size, 16, 240, (size) => updatePattern({ size }))}
        </>}
        <label className="flex flex-col gap-1">边框样式
          <select className={control} value={border.style} onChange={(event) => updateBorder({ style: event.target.value as typeof border.style })}>
            {Object.entries(BORDER_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        {border.style !== "none" && <>
          {colorInput("边框颜色", border.color, (color) => updateBorder({ color }))}
          {border.style === "gradient" && colorInput("边框渐变终色", border.endColor, (endColor) => updateBorder({ endColor }))}
          {slider("边框粗细", border.width, 1, 24, (width) => updateBorder({ width }))}
          {slider("边框内缩", border.inset, 0, 200, (inset) => updateBorder({ inset }))}
          {border.style !== "corners" && slider("边框圆角", border.radius, 0, 200, (radius) => updateBorder({ radius }))}
          {slider("边框透明度", border.opacity, 0, 1, (opacity) => updateBorder({ opacity }), 0.01)}
        </>}
        <p className="leading-relaxed text-[#888888]">配置随模板保存，作用于每页。背景图会覆盖底色与花纹；边框绘制在最上层。</p>
      </div>
    </section>
  );
}
