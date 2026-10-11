import React from "react";
import {
  Sliders,
  Palette,
  Shield,
  Bookmark,
  Type,
  AlignLeft,
  AlignCenter,
  AlignRight,
  ArrowUpDown,
} from "lucide-react";
import {
  AlgorithmParams,
  ThemeColors,
  TypesetChromeConfig,
  TypesetConfig,
} from "../../core/types";

interface ParamsInspectorProps {
  config: TypesetConfig;
  onUpdateAlgorithm: (partial: Partial<AlgorithmParams>) => void;
  onUpdateTheme: (partial: Partial<ThemeColors>) => void;
  onUpdateTypography: (partial: Partial<TypesetConfig["typography"]>) => void;
  onUpdateSafeArea: (partial: Partial<AlgorithmParams["safeArea"]>) => void;
  onUpdateBranding: (footer: string, watermark: string) => void;
  onUpdateChrome: (partial: Partial<TypesetChromeConfig>) => void;
}

const FONT_OPTIONS = [
  { label: "阿里妈妈数黑体 (厚重醒目)", value: "AlimamaShuHeiTi" },
  { label: "霞鹜新致宋 (典雅高阶)", value: "LXGWNeoZhiSongPlus" },
  { label: "霞鹜文楷 (人文随笔)", value: "LXGWWenKaiScreen" },
  { label: "思源黑体 (现代极简)", value: "SourceHanSansSC, sans-serif" },
  { label: "思源宋体 (经典报刊)", value: "SourceHanSerifSC, serif" },
  { label: "Inter / 系统无衬线", value: "Inter, system-ui, sans-serif" },
  { label: "Georgia 衬线体", value: "Georgia, serif" },
];

export const ParamsInspector: React.FC<ParamsInspectorProps> = ({
  config,
  onUpdateAlgorithm,
  onUpdateTheme,
  onUpdateTypography,
  onUpdateSafeArea,
  onUpdateBranding,
  onUpdateChrome,
}) => {
  const { algorithm, theme, typography } = config;

  return (
    <aside className="w-80 border-l border-[#eaeaea] dark:border-[#222222] bg-white dark:bg-[#0a0a0a] flex flex-col shrink-0 select-none overflow-y-auto transition-colors">
      {/* Section 1: Typography Alignment & Flow */}
      <div className="p-3.5 border-b border-[#f0f0f0] dark:border-[#1c1c1c]">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#171717] dark:text-white mb-3">
          <ArrowUpDown className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
          <span>文字对齐与空间居中</span>
        </div>

        <div className="flex flex-col gap-3 text-xs">
          {/* Vertical Alignment */}
          <div>
            <span className="text-[#666666] dark:text-[#888888] text-[11px] block mb-1.5 font-medium">
              垂直排版对齐 (封面必备)
            </span>
            <div className="grid grid-cols-3 gap-1 bg-[#f5f5f5] dark:bg-[#141414] p-1 rounded-lg border border-[#e5e5e5] dark:border-[#262626]">
              {(
                [
                  { id: "top", label: "顶端对齐" },
                  { id: "center", label: "垂直居中" },
                  { id: "bottom", label: "底端对齐" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => onUpdateAlgorithm({ verticalAlign: opt.id })}
                  className={`py-1 text-[11px] rounded transition-all font-medium ${
                    (algorithm.verticalAlign || "top") === opt.id
                      ? "bg-white dark:bg-[#262626] text-black dark:text-white shadow-sm font-semibold"
                      : "text-[#666666] dark:text-[#888888] hover:text-black dark:hover:text-white"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Horizontal Alignment */}
          <div>
            <span className="text-[#666666] dark:text-[#888888] text-[11px] block mb-1.5 font-medium">
              水平排版对齐
            </span>
            <div className="grid grid-cols-3 gap-1 bg-[#f5f5f5] dark:bg-[#141414] p-1 rounded-lg border border-[#e5e5e5] dark:border-[#262626]">
              <button
                onClick={() => onUpdateAlgorithm({ textAlign: "left" })}
                className={`py-1 flex items-center justify-center gap-1 text-[11px] rounded transition-all font-medium ${
                  (algorithm.textAlign || "left") === "left"
                    ? "bg-white dark:bg-[#262626] text-black dark:text-white shadow-sm font-semibold"
                    : "text-[#666666] dark:text-[#888888] hover:text-black dark:hover:text-white"
                }`}
              >
                <AlignLeft className="w-3 h-3" />
                <span>居左</span>
              </button>
              <button
                onClick={() => onUpdateAlgorithm({ textAlign: "center" })}
                className={`py-1 flex items-center justify-center gap-1 text-[11px] rounded transition-all font-medium ${
                  algorithm.textAlign === "center"
                    ? "bg-white dark:bg-[#262626] text-black dark:text-white shadow-sm font-semibold"
                    : "text-[#666666] dark:text-[#888888] hover:text-black dark:hover:text-white"
                }`}
              >
                <AlignCenter className="w-3 h-3" />
                <span>居中</span>
              </button>
              <button
                onClick={() => onUpdateAlgorithm({ textAlign: "right" })}
                className={`py-1 flex items-center justify-center gap-1 text-[11px] rounded transition-all font-medium ${
                  algorithm.textAlign === "right"
                    ? "bg-white dark:bg-[#262626] text-black dark:text-white shadow-sm font-semibold"
                    : "text-[#666666] dark:text-[#888888] hover:text-black dark:hover:text-white"
                }`}
              >
                <AlignRight className="w-3 h-3" />
                <span>居右</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: Fonts & Typeface */}
      <div className="p-3.5 border-b border-[#f0f0f0] dark:border-[#1c1c1c]">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#171717] dark:text-white mb-3">
          <Type className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
          <span>字体与排版字阶</span>
        </div>

        <div className="flex flex-col gap-3 text-xs">
          {/* Heading Font */}
          <div>
            <span className="text-[#666666] dark:text-[#888888] text-[11px] block mb-1">
              标题字体 (Heading Font)
            </span>
            <select
              value={typography.headingFont}
              onChange={(e) => onUpdateTypography({ headingFont: e.target.value })}
              className="w-full bg-[#fafafa] dark:bg-[#141414] border border-[#d4d4d4] dark:border-[#262626] rounded-md px-2 py-1.5 text-black dark:text-white text-xs focus:outline-none"
            >
              {FONT_OPTIONS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>

          {/* Body Font */}
          <div>
            <span className="text-[#666666] dark:text-[#888888] text-[11px] block mb-1">
              正文字体 (Body Font)
            </span>
            <select
              value={typography.bodyFont}
              onChange={(e) => onUpdateTypography({ bodyFont: e.target.value })}
              className="w-full bg-[#fafafa] dark:bg-[#141414] border border-[#d4d4d4] dark:border-[#262626] rounded-md px-2 py-1.5 text-black dark:text-white text-xs focus:outline-none"
            >
              {FONT_OPTIONS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Section 3: Sizing & Algorithm Sliders */}
      <div className="p-3.5 border-b border-[#f0f0f0] dark:border-[#1c1c1c]">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#171717] dark:text-white mb-3">
          <Sliders className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
          <span>字号与比例参数</span>
        </div>

        <div className="flex flex-col gap-3.5 text-xs">
          {/* Base Font Size */}
          <div>
            <div className="flex justify-between text-[#666666] dark:text-[#888888] mb-1 font-mono text-[11px]">
              <span>基准字号 (Base Size)</span>
              <span className="text-[#171717] dark:text-white font-semibold">
                {algorithm.baseFontSize}px
              </span>
            </div>
            <input
              type="range"
              min="24"
              max="96"
              step="1"
              value={algorithm.baseFontSize}
              onChange={(e) => onUpdateAlgorithm({ baseFontSize: parseInt(e.target.value, 10) })}
              className="w-full h-1.5 bg-[#e5e5e5] dark:bg-[#222222] rounded-lg cursor-pointer"
            />
          </div>

          {/* Modular Scale Ratio */}
          <div>
            <div className="flex justify-between text-[#666666] dark:text-[#888888] mb-1 font-mono text-[11px]">
              <span>比例字阶系数 (大标题倍率)</span>
              <span className="text-[#171717] dark:text-white font-semibold">
                {algorithm.scaleRatio.toFixed(2)}x
              </span>
            </div>
            <input
              type="range"
              min="1.15"
              max="1.6"
              step="0.01"
              value={algorithm.scaleRatio}
              onChange={(e) => onUpdateAlgorithm({ scaleRatio: parseFloat(e.target.value) })}
              className="w-full h-1.5 bg-[#e5e5e5] dark:bg-[#222222] rounded-lg cursor-pointer"
            />
          </div>

          {/* Line Height Multiplier */}
          <div>
            <div className="flex justify-between text-[#666666] dark:text-[#888888] mb-1 font-mono text-[11px]">
              <span>行高舒展倍率</span>
              <span className="text-[#171717] dark:text-white font-semibold">
                {algorithm.lineHeightMultiplier.toFixed(2)}
              </span>
            </div>
            <input
              type="range"
              min="1.2"
              max="1.8"
              step="0.02"
              value={algorithm.lineHeightMultiplier}
              onChange={(e) =>
                onUpdateAlgorithm({ lineHeightMultiplier: parseFloat(e.target.value) })
              }
              className="w-full h-1.5 bg-[#e5e5e5] dark:bg-[#222222] rounded-lg cursor-pointer"
            />
          </div>

          {/* Obstacle Gap */}
          <div>
            <div className="flex justify-between text-[#666666] dark:text-[#888888] mb-1 font-mono text-[11px]">
              <span>配图避让间隙 (Gap)</span>
              <span className="text-[#171717] dark:text-white font-semibold">
                {algorithm.obstacleGap}px
              </span>
            </div>
            <input
              type="range"
              min="12"
              max="48"
              step="2"
              value={algorithm.obstacleGap}
              onChange={(e) => onUpdateAlgorithm({ obstacleGap: parseInt(e.target.value, 10) })}
              className="w-full h-1.5 bg-[#e5e5e5] dark:bg-[#222222] rounded-lg cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Section 4: Safe Area Insets */}
      <div className="p-3.5 border-b border-[#f0f0f0] dark:border-[#1c1c1c]">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#171717] dark:text-white mb-3">
          <Shield className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>版心安全边距</span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
          <div>
            <span className="text-[#777777] dark:text-[#666666] block mb-1">上边距 (Top)</span>
            <input
              type="number"
              value={algorithm.safeArea.top}
              onChange={(e) => onUpdateSafeArea({ top: parseInt(e.target.value, 10) || 0 })}
              className="w-full bg-[#fafafa] dark:bg-[#141414] border border-[#d4d4d4] dark:border-[#262626] rounded px-2 py-1 text-black dark:text-white"
            />
          </div>
          <div>
            <span className="text-[#777777] dark:text-[#666666] block mb-1">下边距 (Bottom)</span>
            <input
              type="number"
              value={algorithm.safeArea.bottom}
              onChange={(e) => onUpdateSafeArea({ bottom: parseInt(e.target.value, 10) || 0 })}
              className="w-full bg-[#fafafa] dark:bg-[#141414] border border-[#d4d4d4] dark:border-[#262626] rounded px-2 py-1 text-black dark:text-white"
            />
          </div>
          <div>
            <span className="text-[#777777] dark:text-[#666666] block mb-1">左边距 (Left)</span>
            <input
              type="number"
              value={algorithm.safeArea.left}
              onChange={(e) => onUpdateSafeArea({ left: parseInt(e.target.value, 10) || 0 })}
              className="w-full bg-[#fafafa] dark:bg-[#141414] border border-[#d4d4d4] dark:border-[#262626] rounded px-2 py-1 text-black dark:text-white"
            />
          </div>
          <div>
            <span className="text-[#777777] dark:text-[#666666] block mb-1">右边距 (Right)</span>
            <input
              type="number"
              value={algorithm.safeArea.right}
              onChange={(e) => onUpdateSafeArea({ right: parseInt(e.target.value, 10) || 0 })}
              className="w-full bg-[#fafafa] dark:bg-[#141414] border border-[#d4d4d4] dark:border-[#262626] rounded px-2 py-1 text-black dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* Section 5: Color Theme */}
      <div className="p-3.5 border-b border-[#f0f0f0] dark:border-[#1c1c1c]">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#171717] dark:text-white mb-3">
          <Palette className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
          <span>视觉色彩主题</span>
        </div>

        <div className="flex flex-col gap-2.5 text-xs">
          {/* Preset Swatches */}
          <div className="flex items-center gap-2 mb-1">
            <button
              onClick={() =>
                onUpdateTheme({
                  bgColor: "#ffffff",
                  textColor: "#171717",
                  headingColor: "#171717",
                  accentColor: "#059669",
                  quoteColor: "#525252",
                  cardBg: "#f5f5f5",
                })
              }
              className="w-6 h-6 rounded-full bg-[#ffffff] border-2 border-emerald-500 shadow-sm hover:scale-105 transition-all"
              title="素白雅致 (推荐)"
            />
            <button
              onClick={() =>
                onUpdateTheme({
                  bgColor: "#f9fcfa",
                  textColor: "#22201d",
                  headingColor: "#0f2e22",
                  accentColor: "#1d4f39",
                  quoteColor: "#474038",
                  cardBg: "#ffffff",
                })
              }
              className="w-6 h-6 rounded-full bg-[#f9fcfa] border border-[#ccc] shadow-sm hover:scale-105 transition-all"
              title="纸白浅草"
            />
            <button
              onClick={() =>
                onUpdateTheme({
                  bgColor: "#0a0a0a",
                  textColor: "#ededed",
                  headingColor: "#ffffff",
                  accentColor: "#00e676",
                  quoteColor: "#a0a0a0",
                  cardBg: "#121212",
                })
              }
              className="w-6 h-6 rounded-full bg-[#0a0a0a] border border-[#444] shadow-sm hover:scale-105 transition-all"
              title="深邃暗夜"
            />
            <button
              onClick={() =>
                onUpdateTheme({
                  bgColor: "#09090b",
                  textColor: "#fafafa",
                  headingColor: "#ffffff",
                  accentColor: "#3b82f6",
                  quoteColor: "#a1a1aa",
                  cardBg: "#18181b",
                })
              }
              className="w-6 h-6 rounded-full bg-[#09090b] border border-blue-500 shadow-sm hover:scale-105 transition-all"
              title="数码蓝暗黑"
            />
          </div>

          {/* Heading Color */}
          <div className="flex items-center justify-between">
            <span className="text-[#666666] dark:text-[#888888] font-medium">标题颜色 (Heading)</span>
            <div className="flex items-center gap-1.5">
              <input
                type="color"
                value={theme.headingColor || theme.textColor}
                onChange={(e) => onUpdateTheme({ headingColor: e.target.value })}
                className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
              />
              <span className="font-mono text-[11px] text-[#444444] dark:text-[#cccccc]">
                {theme.headingColor || theme.textColor}
              </span>
            </div>
          </div>

          {/* Body Text Color */}
          <div className="flex items-center justify-between">
            <span className="text-[#666666] dark:text-[#888888]">正文字色 (Text)</span>
            <div className="flex items-center gap-1.5">
              <input
                type="color"
                value={theme.textColor}
                onChange={(e) => onUpdateTheme({ textColor: e.target.value })}
                className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
              />
              <span className="font-mono text-[11px] text-[#444444] dark:text-[#cccccc]">
                {theme.textColor}
              </span>
            </div>
          </div>

          {/* Accent Color */}
          <div className="flex items-center justify-between">
            <span className="text-[#666666] dark:text-[#888888]">重点强调色 (Accent)</span>
            <div className="flex items-center gap-1.5">
              <input
                type="color"
                value={theme.accentColor}
                onChange={(e) => onUpdateTheme({ accentColor: e.target.value })}
                className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
              />
              <span className="font-mono text-[11px] text-[#444444] dark:text-[#cccccc]">
                {theme.accentColor}
              </span>
            </div>
          </div>

          {/* Background Color */}
          <div className="flex items-center justify-between">
            <span className="text-[#666666] dark:text-[#888888]">背景底色 (Canvas)</span>
            <div className="flex items-center gap-1.5">
              <input
                type="color"
                value={theme.bgColor}
                onChange={(e) => onUpdateTheme({ bgColor: e.target.value })}
                className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
              />
              <span className="font-mono text-[11px] text-[#444444] dark:text-[#cccccc]">
                {theme.bgColor}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Section 6: Header, Footer & Chrome Decor */}
      <div className="p-3.5">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#171717] dark:text-white mb-3">
          <Bookmark className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
          <span>页眉页脚与版式装饰 (Chrome)</span>
        </div>

        <div className="flex flex-col gap-3 text-xs">
          {/* Header Controls */}
          <div className="bg-[#f9f9f9] dark:bg-[#141414] p-2.5 rounded-lg border border-[#eaeaea] dark:border-[#222222] flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[#333333] dark:text-[#cccccc] text-[11px]">
                顶部栏 (Header)
              </span>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.chrome?.showHeader ?? Boolean(config.watermarkText?.trim())}
                  onChange={(e) => onUpdateChrome({ showHeader: e.target.checked })}
                  className="rounded text-emerald-500 accent-emerald-500 cursor-pointer"
                />
                <span className="text-[10px] text-[#666666] dark:text-[#888888]">启用</span>
              </label>
            </div>

            {(config.chrome?.showHeader ?? Boolean(config.watermarkText?.trim())) && (
              <div className="flex flex-col gap-2 pl-2 border-l-2 border-[#e0e0e0] dark:border-[#2a2a2a] mt-1">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[#777777] dark:text-[#888888] text-[10px]">水印 / 品牌标识</span>
                    <label className="flex items-center gap-1 text-[10px] text-[#666666] dark:text-[#888888] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.chrome?.showWatermark ?? true}
                        onChange={(e) => onUpdateChrome({ showWatermark: e.target.checked })}
                        className="rounded accent-emerald-500 cursor-pointer"
                      />
                      <span>显示</span>
                    </label>
                  </div>
                  <input
                    type="text"
                    value={config.watermarkText}
                    onChange={(e) => onUpdateBranding(config.footerText, e.target.value)}
                    placeholder="作者水印/标识文本..."
                    className="w-full bg-white dark:bg-[#0a0a0a] border border-[#d4d4d4] dark:border-[#262626] rounded px-2 py-1 text-black dark:text-white text-[11px]"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[#777777] dark:text-[#888888] text-[10px]">页码角标 (P.01)</span>
                  <label className="flex items-center gap-1 text-[10px] text-[#666666] dark:text-[#888888] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.chrome?.showPageNumber ?? (config.aspectRatio === "longform-3-4")}
                      onChange={(e) => onUpdateChrome({ showPageNumber: e.target.checked })}
                      className="rounded accent-emerald-500 cursor-pointer"
                    />
                    <span>显示</span>
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Footer Controls */}
          <div className="bg-[#f9f9f9] dark:bg-[#141414] p-2.5 rounded-lg border border-[#eaeaea] dark:border-[#222222] flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[#333333] dark:text-[#cccccc] text-[11px]">
                底部栏 (Footer)
              </span>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.chrome?.showFooter ?? Boolean(config.footerText?.trim())}
                  onChange={(e) => onUpdateChrome({ showFooter: e.target.checked })}
                  className="rounded text-emerald-500 accent-emerald-500 cursor-pointer"
                />
                <span className="text-[10px] text-[#666666] dark:text-[#888888]">启用</span>
              </label>
            </div>

            {(config.chrome?.showFooter ?? Boolean(config.footerText?.trim())) && (
              <div className="flex flex-col gap-2 pl-2 border-l-2 border-[#e0e0e0] dark:border-[#2a2a2a] mt-1">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[#777777] dark:text-[#888888] text-[10px]">页脚署名 / 版权</span>
                    <label className="flex items-center gap-1 text-[10px] text-[#666666] dark:text-[#888888] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.chrome?.showFooterText ?? true}
                        onChange={(e) => onUpdateChrome({ showFooterText: e.target.checked })}
                        className="rounded accent-emerald-500 cursor-pointer"
                      />
                      <span>显示</span>
                    </label>
                  </div>
                  <input
                    type="text"
                    value={config.footerText}
                    onChange={(e) => onUpdateBranding(e.target.value, config.watermarkText)}
                    placeholder="页脚版权/署名..."
                    className="w-full bg-white dark:bg-[#0a0a0a] border border-[#d4d4d4] dark:border-[#262626] rounded px-2 py-1 text-black dark:text-white text-[11px]"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[#777777] dark:text-[#888888] text-[10px]">顶部分割细线</span>
                  <label className="flex items-center gap-1 text-[10px] text-[#666666] dark:text-[#888888] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.chrome?.showFooterDivider ?? Boolean(config.footerText?.trim())}
                      onChange={(e) => onUpdateChrome({ showFooterDivider: e.target.checked })}
                      className="rounded accent-emerald-500 cursor-pointer"
                    />
                    <span>显示</span>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[#777777] dark:text-[#888888] text-[10px]">算法填充率提示</span>
                  <label className="flex items-center gap-1 text-[10px] text-[#666666] dark:text-[#888888] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.chrome?.showFillRatio ?? false}
                      onChange={(e) => onUpdateChrome({ showFillRatio: e.target.checked })}
                      className="rounded accent-emerald-500 cursor-pointer"
                    />
                    <span>显示</span>
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
};
