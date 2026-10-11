import React from "react";
import { Sliders, Palette, Shield, Bookmark } from "lucide-react";
import { AlgorithmParams, ThemeColors, TypesetConfig } from "../../core/types";

interface ParamsInspectorProps {
  config: TypesetConfig;
  onUpdateAlgorithm: (partial: Partial<AlgorithmParams>) => void;
  onUpdateTheme: (partial: Partial<ThemeColors>) => void;
  onUpdateSafeArea: (partial: Partial<AlgorithmParams["safeArea"]>) => void;
  onUpdateBranding: (footer: string, watermark: string) => void;
}

export const ParamsInspector: React.FC<ParamsInspectorProps> = ({
  config,
  onUpdateAlgorithm,
  onUpdateTheme,
  onUpdateSafeArea,
  onUpdateBranding,
}) => {
  const { algorithm, theme } = config;

  return (
    <aside className="w-80 border-l border-[#eaeaea] dark:border-[#222222] bg-white dark:bg-[#0a0a0a] flex flex-col shrink-0 select-none overflow-y-auto transition-colors">
      {/* Section 1: Algorithm Parameters */}
      <div className="p-3.5 border-b border-[#f0f0f0] dark:border-[#1c1c1c]">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#171717] dark:text-white mb-3">
          <Sliders className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
          <span>算法排版参数</span>
        </div>

        <div className="flex flex-col gap-3.5 text-xs">
          {/* Base Font Size */}
          <div>
            <div className="flex justify-between text-[#666666] dark:text-[#888888] mb-1 font-mono text-[11px]">
              <span>基准正文字号</span>
              <span className="text-[#171717] dark:text-white font-semibold">{algorithm.baseFontSize}px</span>
            </div>
            <input
              type="range"
              min="24"
              max="72"
              step="1"
              value={algorithm.baseFontSize}
              onChange={(e) => onUpdateAlgorithm({ baseFontSize: parseInt(e.target.value, 10) })}
              className="w-full h-1.5 bg-[#e5e5e5] dark:bg-[#222222] rounded-lg cursor-pointer"
            />
          </div>

          {/* Modular Scale Ratio */}
          <div>
            <div className="flex justify-between text-[#666666] dark:text-[#888888] mb-1 font-mono text-[11px]">
              <span>比例字阶系数</span>
              <span className="text-[#171717] dark:text-white font-semibold">{algorithm.scaleRatio.toFixed(2)}x</span>
            </div>
            <input
              type="range"
              min="1.15"
              max="1.45"
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
              <span className="text-[#171717] dark:text-white font-semibold">{algorithm.lineHeightMultiplier.toFixed(2)}</span>
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
              <span className="text-[#171717] dark:text-white font-semibold">{algorithm.obstacleGap}px</span>
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

          {/* Target Fill Ratio */}
          <div>
            <div className="flex justify-between text-[#666666] dark:text-[#888888] mb-1 font-mono text-[11px]">
              <span>目标填充率 (Fill Ratio)</span>
              <span className="text-[#171717] dark:text-white font-semibold">{Math.round(algorithm.targetFillRatio * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.4"
              max="0.95"
              step="0.05"
              value={algorithm.targetFillRatio}
              onChange={(e) =>
                onUpdateAlgorithm({ targetFillRatio: parseFloat(e.target.value) })
              }
              className="w-full h-1.5 bg-[#e5e5e5] dark:bg-[#222222] rounded-lg cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Section 2: Safe Area Insets */}
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

      {/* Section 3: Color Theme */}
      <div className="p-3.5 border-b border-[#f0f0f0] dark:border-[#1c1c1c]">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#171717] dark:text-white mb-3">
          <Palette className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
          <span>视觉与色彩主题</span>
        </div>

        <div className="flex flex-col gap-2.5 text-xs">
          {/* Preset Swatches */}
          <div className="flex items-center gap-2 mb-1">
            <button
              onClick={() =>
                onUpdateTheme({
                  bgColor: "#ffffff",
                  textColor: "#171717",
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
                  accentColor: "#3b82f6",
                  quoteColor: "#a1a1aa",
                  cardBg: "#18181b",
                })
              }
              className="w-6 h-6 rounded-full bg-[#09090b] border border-blue-500 shadow-sm hover:scale-105 transition-all"
              title="数码蓝暗黑"
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[#666666] dark:text-[#888888]">背景底色</span>
            <div className="flex items-center gap-1.5">
              <input
                type="color"
                value={theme.bgColor}
                onChange={(e) => onUpdateTheme({ bgColor: e.target.value })}
                className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
              />
              <span className="font-mono text-[11px] text-[#444444] dark:text-[#cccccc]">{theme.bgColor}</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[#666666] dark:text-[#888888]">正文字色</span>
            <div className="flex items-center gap-1.5">
              <input
                type="color"
                value={theme.textColor}
                onChange={(e) => onUpdateTheme({ textColor: e.target.value })}
                className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
              />
              <span className="font-mono text-[11px] text-[#444444] dark:text-[#cccccc]">{theme.textColor}</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[#666666] dark:text-[#888888]">重点强调色</span>
            <div className="flex items-center gap-1.5">
              <input
                type="color"
                value={theme.accentColor}
                onChange={(e) => onUpdateTheme({ accentColor: e.target.value })}
                className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
              />
              <span className="font-mono text-[11px] text-[#444444] dark:text-[#cccccc]">{theme.accentColor}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Section 4: Branding & Watermarks */}
      <div className="p-3.5">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#171717] dark:text-white mb-3">
          <Bookmark className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
          <span>页脚与水印标注</span>
        </div>

        <div className="flex flex-col gap-2.5 text-xs">
          <div>
            <span className="text-[#777777] dark:text-[#666666] text-[11px] block mb-1">页脚版权/署名</span>
            <input
              type="text"
              value={config.footerText}
              onChange={(e) => onUpdateBranding(e.target.value, config.watermarkText)}
              className="w-full bg-[#fafafa] dark:bg-[#141414] border border-[#d4d4d4] dark:border-[#262626] rounded px-2.5 py-1.5 text-black dark:text-white text-xs"
            />
          </div>

          <div>
            <span className="text-[#777777] dark:text-[#666666] text-[11px] block mb-1">作者水印</span>
            <input
              type="text"
              value={config.watermarkText}
              onChange={(e) => onUpdateBranding(config.footerText, e.target.value)}
              className="w-full bg-[#fafafa] dark:bg-[#141414] border border-[#d4d4d4] dark:border-[#262626] rounded px-2.5 py-1.5 text-black dark:text-white text-xs"
            />
          </div>
        </div>
      </div>
    </aside>
  );
};
