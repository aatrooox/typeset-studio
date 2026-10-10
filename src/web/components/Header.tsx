import React from "react";
import { Download, FolderOpen, Key, Layers, RefreshCw, ZoomIn, ZoomOut } from "lucide-react";
import { CANVAS_SPECS } from "../../core/geometry";
import { AspectRatioType } from "../../core/types";

interface HeaderProps {
  currentRatio: AspectRatioType;
  onSelectRatio: (ratio: AspectRatioType) => void;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  onOpenTemplates: () => void;
  onOpenAuth: () => void;
  onExport: () => void;
  isExporting: boolean;
  isAuthed: boolean;
  pageCount: number;
}

const RATIO_ITEMS: Array<{ id: AspectRatioType; label: string; ratioTag: string }> = [
  { id: "wechat-cover-2.35", label: "微信封面", ratioTag: "2.35:1" },
  { id: "longform-3-4", label: "通用长图文", ratioTag: "3:4" },
  { id: "wide-16-9", label: "通用宽屏", ratioTag: "16:9" },
  { id: "square-1-1", label: "通用正方形", ratioTag: "1:1" },
];

export const Header: React.FC<HeaderProps> = ({
  currentRatio,
  onSelectRatio,
  zoom,
  onZoomChange,
  onOpenTemplates,
  onOpenAuth,
  onExport,
  isExporting,
  isAuthed,
  pageCount,
}) => {
  return (
    <header className="h-14 border-b border-[#222222] bg-[#000000]/80 backdrop-blur-md px-4 flex items-center justify-between select-none z-30 shrink-0">
      {/* Brand & Status */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 font-semibold text-white tracking-tight text-sm">
          <span className="flex items-center justify-center w-6 h-6 rounded bg-white text-black font-black text-xs">
            ▲
          </span>
          <span>Typeset Studio</span>
        </div>
        <span className="text-xs text-[#555555] font-mono hidden md:inline">v0.1.0</span>
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#111111] border border-[#222222] text-[11px] text-[#00e676]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00e676] animate-pulse" />
          <span className="font-mono">Ready</span>
        </div>
      </div>

      {/* Segmented Control - 4 Core Canvas Ratios */}
      <div className="flex items-center bg-[#0a0a0a] border border-[#222222] rounded-lg p-0.5">
        {RATIO_ITEMS.map((item) => {
          const isActive = currentRatio === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectRatio(item.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                isActive
                  ? "bg-[#1f1f1f] text-white shadow-sm font-semibold"
                  : "text-[#888888] hover:text-[#cccccc] hover:bg-[#141414]"
              }`}
            >
              <span>{item.label}</span>
              <span
                className={`text-[10px] font-mono px-1 py-0.2 rounded ${
                  isActive ? "bg-[#333333] text-white" : "bg-[#181818] text-[#666666]"
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
        <div className="flex items-center bg-[#0a0a0a] border border-[#222222] rounded-lg p-0.5 text-xs text-[#888888]">
          <button
            onClick={() => onZoomChange(Math.max(0.2, Number((zoom - 0.1).toFixed(1))))}
            className="p-1 hover:text-white rounded hover:bg-[#1f1f1f]"
            title="缩小"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="w-11 text-center font-mono text-[11px] text-[#cccccc]">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => onZoomChange(Math.min(1.5, Number((zoom + 0.1).toFixed(1))))}
            className="p-1 hover:text-white rounded hover:bg-[#1f1f1f]"
            title="放大"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Templates Modal button */}
        <button
          onClick={onOpenTemplates}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#222222] bg-[#0a0a0a] hover:bg-[#161616] text-xs text-[#cccccc] hover:text-white transition-all btn-vercel"
        >
          <FolderOpen className="w-3.5 h-3.5 text-[#888888]" />
          <span>模板库</span>
        </button>

        {/* Export image button */}
        <button
          onClick={onExport}
          disabled={isExporting}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-black hover:bg-[#eaeaea] text-xs font-semibold transition-all btn-vercel shadow-sm disabled:opacity-50"
        >
          {isExporting ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Download className="w-3.5 h-3.5" />
          )}
          <span>导出图片</span>
          {pageCount > 1 && (
            <span className="text-[10px] bg-black text-white px-1.5 py-0.2 rounded font-mono">
              {pageCount}P
            </span>
          )}
        </button>

        {/* Auth settings button */}
        <button
          onClick={onOpenAuth}
          className={`p-1.5 rounded-lg border transition-all btn-vercel ${
            isAuthed
              ? "border-[#222222] bg-[#0a0a0a] text-[#888888] hover:text-white hover:bg-[#161616]"
              : "border-amber-500/50 bg-amber-500/10 text-amber-400"
          }`}
          title={isAuthed ? "超管密钥已就绪" : "配置超管密钥"}
        >
          <Key className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
};
