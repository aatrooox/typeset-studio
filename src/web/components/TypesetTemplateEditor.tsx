import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ParamsInspector } from "./ParamsInspector";
import { resolveHostTemplateConfig, updateHostTemplateConfig, type HostTemplatePatch } from "../../core/host-template";
import { getCanvasSpec } from "../../core/geometry";
import type { FlowImage, PipelineCoverTheme, TypesetConfig } from "../../core/types";
import editorCss from "../editor.css" with { type: "text" };

export interface TypesetEditorFont { family: string; label: string }
export interface TypesetEditorAsset { id: string; url: string; width?: number; height?: number }
export interface TypesetTemplateEditorProps {
  config: TypesetConfig;
  onChange: (config: TypesetConfig) => void;
  fonts: TypesetEditorFont[];
  assets: TypesetEditorAsset[];
  onUploadImage: (file: File) => Promise<TypesetEditorAsset>;
  disabled?: boolean;
}

// 控件、字体与素材均由宿主注入，隔离样式不进入宿主文档。
export function TypesetTemplateEditor(props: TypesetTemplateEditorProps) {
  const host = useRef<HTMLDivElement>(null);
  const [root, setRoot] = useState<ShadowRoot | null>(null);
  useLayoutEffect(() => { if (host.current) setRoot(host.current.shadowRoot || host.current.attachShadow({ mode: "open" })); }, []);
  return <div ref={host}>{root && createPortal(<><style>{editorCss}</style><ControlledEditor {...props} /></>, root)}</div>;
}

function ControlledEditor({ config: inputConfig, onChange, fonts, assets, onUploadImage, disabled }: TypesetTemplateEditorProps) {
  const config = resolveHostTemplateConfig(inputConfig);
  const update = (patch: HostTemplatePatch) => onChange(updateHostTemplateConfig(config, patch));
  const spec = getCanvasSpec(config.aspectRatio);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const updateImage = (index: number, partial: Partial<FlowImage>) => update({ images: (config.images || []).map((image, i) => i === index ? { ...image, ...partial } : image) });
  const number = (label: string, value: number, change: (value: number) => void, step = 1) => <label>{label}<input type="number" value={value} step={step} onChange={e => change(Number(e.target.value))} /></label>;
  const text = (label: string, value: string, change: (value: string) => void) => <label>{label}<input value={value} onChange={e => change(e.target.value)} /></label>;
  const check = (label: string, value: boolean, change: (value: boolean) => void) => <label className="check"><input type="checkbox" checked={value} onChange={e => change(e.target.checked)} />{label}</label>;
  const source = (value: string) => assets.find(asset => `asset:${asset.id}` === value)?.url || "";
  const assetSelect = (value: string, change: (value: string) => void, allowNone = false) => <select aria-label="选择图片素材" value={value} onChange={e => change(e.target.value)}>{allowNone && <option value="">无</option>}{assets.map(asset => <option key={asset.id} value={`asset:${asset.id}`}>{asset.id.slice(0, 8)} · {asset.width}×{asset.height}</option>)}</select>;
  const cover = config.coverTheme;
  const updateCover = (next: PipelineCoverTheme) => update({ coverTheme: next });
  return <fieldset disabled={disabled || uploading} className="typeset-host-editor">
    <ParamsInspector config={config} fonts={fonts} hostControlled
      onUpdateAlgorithm={value => update({ algorithm: value })}
      onUpdateTheme={value => update({ theme: value })}
      onUpdateTypography={value => update({ typography: { ...config.typography, ...value } })}
      onUpdateSafeArea={value => update({ algorithm: { ...config.algorithm, safeArea: { ...config.algorithm.safeArea, ...value } } })}
      onUpdateBranding={(footerText, watermarkText) => update({ footerText, watermarkText })}
      onUpdateChrome={value => update({ chrome: { ...config.chrome, ...value } })}
      onUpdateCanvasStyle={canvasStyle => update({ canvasStyle })} />
    <details className="host-section"><summary>完整排版与主题参数</summary>
      <div className="host-layer host-grid">{(cover ? ["obstacleGap", "targetFillRatio", "contentBottomGap"] as const : ["baseFontSize", "scaleRatio", "lineHeightMultiplier", "obstacleGap", "targetFillRatio", "contentBottomGap"] as const).map(key => number(({ baseFontSize: "基准字号", scaleRatio: "比例字阶", lineHeightMultiplier: "行高倍率", obstacleGap: "避让间隙", targetFillRatio: "目标填充率", contentBottomGap: "底部留白" })[key], config.algorithm[key], value => update({ algorithm: { [key]: value } }), ["scaleRatio", "lineHeightMultiplier", "targetFillRatio"].includes(key) ? 0.01 : 1))}</div>
      {!cover && <div className="host-layer">{Object.entries(config.theme).map(([key, value]) => <label key={key}>{key}<input type="color" value={value} onChange={e => update({ theme: { [key]: e.target.value } })} /></label>)}</div>}
      <label className="host-layer">画布比例<select value={config.aspectRatio} onChange={e => update({ aspectRatio: e.target.value as TypesetConfig["aspectRatio"] })}>{config.slot === "article_cover" ? <option value="wechat-cover-2.35">3.35:1 文章封面</option> : <><option value="longform-3-4">3:4 贴图</option><option value="square-1-1">1:1 方图</option><option value="wide-16-9">16:9 横幅</option></>}</select></label>
    </details>
    {cover && <details className="host-section"><summary>封面主题文字与叠层</summary>
      <p>背景填充、渐变节点和装饰花纹在上方「背景、花纹与边框」调整，与本封面主题同步保存。</p>
      {Object.entries(cover.typography).map(([key, value]) => <div key={key} className="host-layer"><strong>{({ title: "标题", subtitle: "副标题", footer: "页脚" } as Record<string, string>)[key]}</strong>
        <label>字体<select value={value.fontFamily} onChange={e => updateCover({ ...cover, typography: { ...cover.typography, [key]: { ...value, fontFamily: e.target.value } } })}>{fonts.map(font => <option key={font.family} value={font.family}>{font.label}</option>)}</select></label>
        {(["fontSize", "minFontSize", "fontWeight", "lineHeight", "letterSpacing"] as const).map(field => number(field, value[field], next => updateCover({ ...cover, typography: { ...cover.typography, [key]: { ...value, [field]: next } } }), field === "lineHeight" ? 0.1 : 1))}
      </div>)}
      <div className="host-layer"><strong>封面主题布局</strong>
        <label>水平对齐<select value={cover.layout.textAlign} onChange={e => updateCover({ ...cover, layout: { ...cover.layout, textAlign: e.target.value as "left" | "center" | "right" } })}><option value="left">居左</option><option value="center">居中</option><option value="right">居右</option></select></label>
        <label>垂直对齐<select value={cover.layout.verticalAlign} onChange={e => updateCover({ ...cover, layout: { ...cover.layout, verticalAlign: e.target.value as "top" | "center" | "bottom" } })}><option value="top">顶端</option><option value="center">居中</option><option value="bottom">底端</option></select></label>
        {(["top", "right", "bottom", "left"] as const).map(key => number(`主题边距 ${key}`, cover.layout.safeArea[key], value => updateCover({ ...cover, layout: { ...cover.layout, safeArea: { ...cover.layout.safeArea, [key]: value } } })))}
      </div>
      {Object.entries(cover.colors).map(([key, value]) => text(`文字主题 ${key}`, value, next => updateCover({ ...cover, colors: { ...cover.colors, [key]: next } })))}
      {(["background", "decoration"] as const).map(key => <div key={key} className="host-layer"><strong>{key === "background" ? "主题背景图" : "主题装饰图"}</strong>{assetSelect(cover[key].image?.src || "", src => updateCover({ ...cover, [key]: { ...cover[key], image: src ? { src, fit: "cover", position: { x: 50, y: 50 }, opacity: 1 } : null } }), true)}
        {cover[key].image && <>{number("透明度", cover[key].image!.opacity, opacity => updateCover({ ...cover, [key]: { ...cover[key], image: { ...cover[key].image!, opacity } } }), 0.05)}<label>适应方式<select value={cover[key].image!.fit} onChange={e => updateCover({ ...cover, [key]: { ...cover[key], image: { ...cover[key].image!, fit: e.target.value } } })}><option value="cover">覆盖</option><option value="contain">完整显示</option><option value="fill">拉伸</option></select></label>
        {(["x", "y"] as const).map(axis => number(`位置 ${axis}`, cover[key].image!.position[axis], value => updateCover({ ...cover, [key]: { ...cover[key], image: { ...cover[key].image!, position: { ...cover[key].image!.position, [axis]: value } } } })))}</>}
      </div>)}
      {check("启用背景叠色", !!cover.background.overlay, value => updateCover({ ...cover, background: { ...cover.background, overlay: value ? { color: "#000000", opacity: 0.2 } : null } }))}
      {cover.background.overlay && <>{text("叠色", cover.background.overlay.color, color => updateCover({ ...cover, background: { ...cover.background, overlay: { ...cover.background.overlay!, color } } }))}{number("叠色透明度", cover.background.overlay.opacity, opacity => updateCover({ ...cover, background: { ...cover.background, overlay: { ...cover.background.overlay!, opacity } } }), 0.05)}</>}
    </details>}
    <details className="host-section" open><summary>图片与素材图层 ({config.images?.length || 0})</summary>
      <label className="host-upload">上传原比例图片<input type="file" accept="image/png,image/jpeg,image/webp" onChange={async event => { const file = event.target.files?.[0]; if (!file) return; setUploading(true); setError(""); try { const asset = await onUploadImage(file); update({ images: [...(config.images || []), { id: crypto.randomUUID(), src: `asset:${asset.id}`, alt: file.name, isAbsolute: true, layoutPreset: "custom", x: 40, y: 40, width: asset.width || 400, height: asset.height || 300, zIndex: 15, opacity: 1, rotate: 0, borderRadius: 0 }] }); } catch (err) { setError((err as Error).message); } finally { setUploading(false); } }} /></label>
      {(config.images || []).map((image, index) => <div key={image.id} className="host-layer">
        <div className="host-layer-title">{source(image.src) && <img src={source(image.src)} alt={image.alt} />}<strong>图层 {index + 1}</strong><button type="button" onClick={() => update({ images: config.images!.filter((_, i) => i !== index) })}>删除</button></div>
        {assetSelect(image.src, src => updateImage(index, { src }))}
        {text("替代文字", image.alt, alt => updateImage(index, { alt }))}{text("图片说明", image.caption || "", caption => updateImage(index, { caption }))}
        <div className="host-grid">{(["x", "y", "width", "height", "captionHeight", "zIndex", "rotate", "opacity", "borderRadius", "pageIndex"] as const).map(key => number(key, image[key] ?? (key === "opacity" || key === "pageIndex" ? 1 : 0), value => updateImage(index, { [key]: value }), key === "opacity" ? 0.05 : 1))}</div>
        <label>排版方式<select value={image.layoutPreset || "custom"} onChange={e => updateImage(index, { layoutPreset: e.target.value as FlowImage["layoutPreset"] })}>{["auto", "fill", "staggered", "mid-left", "mid-right", "center", "corner-soft", "custom"].map(value => <option key={value}>{value}</option>)}</select></label>
        {check("自由定位图层", !!image.isAbsolute, isAbsolute => updateImage(index, { isAbsolute, repeatEveryPage: isAbsolute && image.repeatEveryPage }))}
        {check("固定模板素材", !!image.templateAssetKey, value => updateImage(index, { templateAssetKey: value ? `asset_${image.id.replace(/[^a-zA-Z0-9_-]/g, "_")}` : undefined, repeatEveryPage: false }))}
        {image.templateAssetKey && <>{text("素材标识", image.templateAssetKey, templateAssetKey => updateImage(index, { templateAssetKey }))}{check("每页重复", !!image.repeatEveryPage, repeatEveryPage => updateImage(index, { repeatEveryPage, isAbsolute: repeatEveryPage || image.isAbsolute }))}</>}
        {check("居中裁切图片", image.fit === "cover", enabled => updateImage(index, { fit: enabled ? "cover" : undefined }))}
        <div className="host-grid"><button type="button" onClick={() => updateImage(index, { x: 0, y: 0, width: spec.width, height: spec.height, isAbsolute: true, zIndex: 0 })}>设为整页背景</button><button type="button" disabled={index === 0} onClick={() => { const images = [...config.images!]; [images[index - 1], images[index]] = [images[index]!, images[index - 1]!]; update({ images }); }}>图层上移</button></div>
      </div>)}
      {error && <p role="alert">{error}</p>}
    </details>
  </fieldset>;
}
