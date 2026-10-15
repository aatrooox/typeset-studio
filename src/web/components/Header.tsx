import React from "react";
import { Download, FolderOpen, Key, Maximize2, Moon, RefreshCw, Save, Sun, ZoomIn, ZoomOut } from "lucide-react";
import { AspectRatioType } from "../../core/types";

interface HeaderProps {
  currentRatio: AspectRatioType;
  onSelectRatio: (ratio: AspectRatioType) => void;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  onAutoFit?: () => void;
  isAutoFit?: boolean;
  onOpenTemplates: () => void;
  isTemplateDrawerOpen: boolean;
  templateName?: string;
  onSaveTemplate: () => void;
  onOpenAuth: () => void;
  onExport: () => void;
  isExporting: boolean;
  isAuthed: boolean;
  pageCount: number;
  themeMode: "light" | "dark";
  onToggleThemeMode: () => void;
}

const RATIO_ITEMS: Array<{ id: AspectRatioType; label: string; ratioTag: string }> = [
  { id: "wechat-cover-2.35", label: "微信封面", ratioTag: "3.35:1" },
  { id: "longform-3-4", label: "通用长图文", ratioTag: "3:4" },
  { id: "wide-16-9", label: "通用宽屏", ratioTag: "16:9" },
  { id: "square-1-1", label: "通用正方形", ratioTag: "1:1" },
];

export const Header: React.FC<HeaderProps> = ({
  currentRatio,
  onSelectRatio,
  zoom,
  onZoomChange,
  onAutoFit,
  isAutoFit,
  onOpenTemplates,
  isTemplateDrawerOpen,
  templateName,
  onSaveTemplate,
  onOpenAuth,
  onExport,
  isExporting,
  isAuthed,
  pageCount,
  themeMode,
  onToggleThemeMode,
}) => {
  return (
    <header className="h-14 border-b border-[#eaeaea] dark:border-[#222222] bg-white/80 dark:bg-[#000000]/80 backdrop-blur-md px-4 flex items-center justify-between select-none z-30 shrink-0 transition-colors">
      {/* Brand & Status */}
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex items-center gap-2 font-semibold text-[#171717] dark:text-white tracking-tight text-sm">
          <span className="flex items-center justify-center w-6 h-6 rounded bg-black dark:bg-white text-white dark:text-black font-black text-xs shadow-sm">
            ▲
          </span>
          <span className="hidden 2xl:inline">Typeset Studio</span>
        </div>
        <span className="text-xs text-[#888888] dark:text-[#555555] font-mono hidden 2xl:inline">v0.4.0</span>
        <div title={templateName || "未命名模板"} className="flex min-w-0 items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#f5f5f5] dark:bg-[#111111] border border-[#e5e5e5] dark:border-[#222222] text-[11px] text-emerald-600 dark:text-[#00e676]">
          <span className="w-1.5 h-1.5 shrink-0 rounded-full bg-emerald-500 dark:bg-[#00e676]" />
          <span aria-live="polite" className="max-w-40 truncate">{templateName || "未命名模板"}</span>
        </div>
      </div>

      {/* Segmented Control - 4 Core Canvas Ratios */}
      <div className="flex items-center bg-[#f5f5f5] dark:bg-[#0a0a0a] border border-[#eaeaea] dark:border-[#222222] rounded-lg p-0.5 shadow-inner">
        {RATIO_ITEMS.map((item) => {
          const isActive = currentRatio === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectRatio(item.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                isActive
                  ? "bg-white dark:bg-[#1f1f1f] text-black dark:text-white shadow-sm font-semibold"
                  : "text-[#666666] dark:text-[#888888] hover:text-[#171717] dark:hover:text-[#cccccc] hover:bg-[#eaeaea] dark:hover:bg-[#141414]"
              }`}
            >
              <span className="hidden xl:inline">{item.label}</span>
              <span
                className={`text-[10px] font-mono px-1 py-0.2 rounded ${
                  isActive
                    ? "bg-[#eaeaea] dark:bg-[#333333] text-black dark:text-white font-semibold"
                    : "bg-[#e5e5e5] dark:bg-[#181818] text-[#777777] dark:text-[#666666]"
                }`}
              >
                {item.ratioTag}
              </span>
            </button>
          );
        })}
      </div>

      {/* Action Tools */}
      <div className="flex items-center gap-2">
        {/* Zoom controls */}
        <div className="flex items-center bg-[#f5f5f5] dark:bg-[#0a0a0a] border border-[#eaeaea] dark:border-[#222222] rounded-lg p-0.5 text-xs text-[#666666] dark:text-[#888888]">
          <button
            onClick={() => onZoomChange(Math.max(0.2, Number((zoom - 0.05).toFixed(2))))}
            className="p-1 hover:text-black dark:hover:text-white rounded hover:bg-[#e8e8e8] dark:hover:bg-[#1f1f1f]"
            title="缩小"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span
            onDoubleClick={onAutoFit}
            className="w-11 text-center font-mono text-[11px] text-[#333333] dark:text-[#cccccc] cursor-pointer hover:underline select-none"
            title="双击恢复自适应"
          >
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => onZoomChange(Math.min(1.5, Number((zoom + 0.05).toFixed(2))))}
            className="p-1 hover:text-black dark:hover:text-white rounded hover:bg-[#e8e8e8] dark:hover:bg-[#1f1f1f]"
            title="放大"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          {onAutoFit && (
            <>
              <div className="w-[1px] h-3 bg-[#e0e0e0] dark:bg-[#262626] mx-0.5" />
              <button
                onClick={onAutoFit}
                className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] transition-all ${
                  isAutoFit
                    ? "bg-white dark:bg-[#1f1f1f] text-black dark:text-white shadow-xs font-semibold"
                    : "hover:text-black dark:hover:text-white hover:bg-[#e8e8e8] dark:hover:bg-[#1f1f1f]"
                }`}
                title={pageCount > 1 ? "缩放至视口内完整排列多张图片（瀑布流平铺）" : "自适应画布大小"}
              >
                <Maximize2 className="w-3 h-3" />
                <span>{pageCount > 1 ? "多图平铺" : "自适应"}</span>
              </button>
            </>
          )}
        </div>

        {/* Theme Mode Toggle (Light / Dark) */}
        <button
          onClick={onToggleThemeMode}
          className="p-2 rounded-lg border border-[#eaeaea] dark:border-[#222222] bg-white dark:bg-[#0a0a0a] hover:bg-[#f5f5f5] dark:hover:bg-[#161616] text-[#444444] dark:text-[#cccccc] transition-all btn-vercel"
          title={themeMode === "light" ? "切换至深色模式" : "切换至浅色模式"}
        >
          {themeMode === "light" ? (
            <Moon className="w-3.5 h-3.5 text-[#555555]" />
          ) : (
            <Sun className="w-3.5 h-3.5 text-amber-400" />
          )}
        </button>

        {/* 模板库开关 */}
        <button
          onClick={onOpenTemplates}
          aria-expanded={isTemplateDrawerOpen}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#eaeaea] dark:border-[#222222] bg-white dark:bg-[#0a0a0a] hover:bg-[#f5f5f5] dark:hover:bg-[#161616] text-xs text-[#333333] dark:text-[#cccccc] hover:text-black dark:hover:text-white transition-all btn-vercel"
        >
          <FolderOpen className="w-3.5 h-3.5 text-[#777777] dark:text-[#888888]" />
          <span>模板库</span>
        </button>

        <button
          onClick={onSaveTemplate}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#eaeaea] dark:border-[#222222] bg-white dark:bg-[#0a0a0a] hover:bg-[#f5f5f5] dark:hover:bg-[#161616] text-xs text-[#333333] dark:text-[#cccccc] transition-all btn-vercel"
        >
          <Save className="w-3.5 h-3.5" />
          <span>保存模板</span>
        </button>

        {/* Export image button */}
        <button
          onClick={onExport}
          disabled={isExporting}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black text-white hover:bg-[#262626] dark:bg-white dark:text-black dark:hover:bg-[#eaeaea] text-xs font-semibold transition-all btn-vercel shadow-sm disabled:opacity-50"
        >
          {isExporting ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Download className="w-3.5 h-3.5" />
          )}
          <span>{isExporting ? "导出中..." : "导出图片"}</span>
          {pageCount > 1 && (
            <span className="text-[10px] bg-white/20 dark:bg-black text-white px-1.5 py-0.2 rounded font-mono">
              {pageCount}P
            </span>
          )}
        </button>

        {/* Auth settings button */}
        <button
          onClick={onOpenAuth}
          className={`p-1.5 rounded-lg border transition-all btn-vercel ${
            isAuthed
              ? "border-[#eaeaea] dark:border-[#222222] bg-white dark:bg-[#0a0a0a] text-[#777777] dark:text-[#888888] hover:text-black dark:hover:text-white hover:bg-[#f5f5f5] dark:hover:bg-[#161616]"
              : "border-amber-500/50 bg-amber-500/10 text-amber-600 dark:text-amber-400"
          }`}
          title={isAuthed ? "超管密钥已就绪" : "配置超管密钥"}
        >
          <Key className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
};
