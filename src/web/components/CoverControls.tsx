import { useId } from "react";
import type { ArticleCoverControls } from "../../core/article-cover";

export interface CoverControlsProps {
  value: ArticleCoverControls;
  onChange: (value: ArticleCoverControls) => void;
  disabled?: boolean;
}

/** 只编辑有限配置；保存、素材上传与服务端 PNG 由宿主接线。 */
export function CoverControls({ value, onChange, disabled = false }: CoverControlsProps) {
  const id = useId();
  return <fieldset className="typeset-cover-controls" disabled={disabled}>
    <legend>文章封面</legend>
    <label htmlFor={`${id}-background`}>背景色</label><input id={`${id}-background`} type="color" value={value.backgroundColor} onChange={event => onChange({ ...value, backgroundColor: event.target.value })} />
    <label htmlFor={`${id}-title`}>标题色</label><input id={`${id}-title`} type="color" value={value.titleColor} onChange={event => onChange({ ...value, titleColor: event.target.value })} />
    <label htmlFor={`${id}-size`}>标题字号</label><input id={`${id}-size`} type="number" min={80} max={200} step={1} value={value.fontSize} onChange={event => onChange({ ...value, fontSize: Number(event.target.value) })} />
    <label htmlFor={`${id}-align`}>水平对齐</label><select id={`${id}-align`} value={value.textAlign} onChange={event => onChange({ ...value, textAlign: event.target.value as ArticleCoverControls["textAlign"] })}><option value="left">左对齐</option><option value="center">居中</option><option value="right">右对齐</option></select>
    <label htmlFor={`${id}-padding`}>安全留白</label><input id={`${id}-padding`} type="number" min={60} max={200} step={1} value={value.safePadding} onChange={event => onChange({ ...value, safePadding: Number(event.target.value) })} />
    <p>画布 3350×1000：左侧 2350 为标题，右侧 1000 为中心裁切方图。字体固定，预览以服务端 PNG 为准。</p>
  </fieldset>;
}
