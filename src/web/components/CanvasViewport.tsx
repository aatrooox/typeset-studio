import React, { useEffect, useRef, useState } from "react";
import { LayoutGrid, Rows, ZoomIn } from "lucide-react";
import { drawPageToContext } from "../../core/canvas-draw";
import { CanvasSpec, FlowPage, TypesetConfig, TypesetResult } from "../../core/types";

interface CanvasCardProps {
  page: FlowPage;
  spec: CanvasSpec;
  config: TypesetConfig;
  totalPageCount: number;
  zoom: number;
}

const CanvasCard: React.FC<CanvasCardProps> = ({
  page,
  spec,
  config,
  totalPageCount,
  zoom,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [paintError, setPaintError] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.dataset.renderState = "loading";
    setPaintError(null);
    let cancelled = false;
    const controller = new AbortController();

    const getImage = (src: string) => {
      if (!src) return Promise.resolve(null);
      return new Promise((resolve) => {
        const img = new Image();
        let fallback: HTMLImageElement | undefined;
        const finish = (image: HTMLImageElement | null) => {
          controller.signal.removeEventListener("abort", abort);
          img.onload = img.onerror = null;
          if (fallback) fallback.onload = fallback.onerror = null;
          resolve(image);
        };
        const abort = () => finish(null);
        if (controller.signal.aborted) { finish(null); return; }
        controller.signal.addEventListener("abort", abort, { once: true });
        img.crossOrigin = "anonymous";
        img.onload = () => finish(img);
        img.onerror = () => {
          fallback = new Image();
          fallback.onload = () => finish(fallback!);
          fallback.onerror = () => finish(null);
          fallback.src = src;
        };
        img.src = src;
      });
    };

    // 每次绘制使用独立缓冲画布，只提交当前代的完整结果。
    const paint = async () => {
      const buffer = document.createElement("canvas");
      buffer.width = spec.width;
      buffer.height = spec.height;
      const bufferContext = buffer.getContext("2d");
      if (!bufferContext) return;
      await drawPageToContext(bufferContext, {
        page, spec, config, totalPageCount, getImage, isServer: false,
      });
      if (!cancelled) {
        ctx.clearRect(0, 0, spec.width, spec.height);
        ctx.drawImage(buffer, 0, 0);
        canvas.dataset.renderState = "ready";
      }
    };
    paint().catch((error) => {
      if (cancelled) return;
      canvas.dataset.renderState = "error";
      ctx.clearRect(0, 0, spec.width, spec.height);
      setPaintError(error instanceof Error ? error.message : "画布绘制失败");
    });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [page, spec, config, totalPageCount]);

  return (
    <>
      <canvas
        id={`typeset-page-${page.pageNumber}`}
        ref={canvasRef}
        width={spec.width}
        height={spec.height}
        className="typeset-page absolute top-0 left-0 border border-[#e0e0e0] dark:border-[#222222] shadow-sm select-none"
        style={{
          width: spec.width * zoom,
          height: spec.height * zoom,
          backgroundColor: config.theme.bgColor,
        }}
      />
      {paintError && <div role="alert" className="absolute inset-0 flex items-center justify-center bg-white/90 p-4 text-sm text-red-600">{paintError}</div>}
    </>
  );
};

interface CanvasViewportProps {
  result: TypesetResult;
  zoom: number;
  viewportRef?: React.RefObject<HTMLDivElement | null>;
  onAutoFit?: () => void;
  isAutoFit?: boolean;
  viewMode?: "grid" | "stack";
  onToggleViewMode?: (mode: "grid" | "stack") => void;
  onFocusPage?: (pageNumber: number) => void;
}

export const CanvasViewport: React.FC<CanvasViewportProps> = ({
  result,
  zoom,
  viewportRef,
  onAutoFit,
  isAutoFit,
  viewMode = "grid",
  onToggleViewMode,
  onFocusPage,
}) => {
  const { pages, canvasSpec, config } = result;

  return (
    <main
      ref={viewportRef}
      className="flex-1 min-w-0 overflow-auto bg-[#f5f5f5] dark:bg-[#050505] bg-grid flex flex-col p-6 select-none relative transition-colors"
    >
      {/* Canvas Meta Info Pill */}
      <div className="sticky top-0 z-20 self-center mb-6 px-3.5 py-1.5 rounded-full bg-white/90 dark:bg-[#111111]/90 backdrop-blur border border-[#eaeaea] dark:border-[#222222] text-[11px] font-mono text-[#666666] dark:text-[#888888] flex items-center gap-2.5 shadow-sm">
        <span className="text-[#171717] dark:text-white font-semibold">{canvasSpec.name}</span>
        <span>•</span>
        <span>
          {canvasSpec.width} × {canvasSpec.height}px
        </span>
        <span>•</span>
        <span className="text-black dark:text-white font-medium">
          {pages.length} 张图片
        </span>

        {pages.length > 1 && onToggleViewMode && (
          <>
            <span>•</span>
            <div className="flex items-center bg-[#eaeaea] dark:bg-[#1a1a1a] rounded-md p-0.5 border border-[#dfdfdf] dark:border-[#262626]">
              <button
                onClick={() => onToggleViewMode("grid")}
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium transition-all ${
                  viewMode === "grid"
                    ? "bg-white dark:bg-[#2b2b2b] text-black dark:text-white shadow-xs font-semibold"
                    : "text-[#666666] dark:text-[#888888] hover:text-black dark:hover:text-white"
                }`}
                title="多图瀑布流平铺全览"
              >
                <LayoutGrid className="w-3 h-3" />
                <span>多图平铺</span>
              </button>
              <button
                onClick={() => onToggleViewMode("stack")}
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium transition-all ${
                  viewMode === "stack"
                    ? "bg-white dark:bg-[#2b2b2b] text-black dark:text-white shadow-xs font-semibold"
                    : "text-[#666666] dark:text-[#888888] hover:text-black dark:hover:text-white"
                }`}
                title="单列纵向逐页滚动"
              >
                <Rows className="w-3 h-3" />
                <span>纵向单列</span>
              </button>
            </div>
          </>
        )}

        {onAutoFit && (
          <>
            <span>•</span>
            <button
              onClick={onAutoFit}
              className={`hover:text-black dark:hover:text-white transition-colors underline underline-offset-2 ${
                isAutoFit ? "text-emerald-600 dark:text-emerald-400 font-semibold" : ""
              }`}
              title={pages.length > 1 ? "缩放至视口内完整排列多张图片" : "自适应画布比例"}
            >
              {isAutoFit ? (pages.length > 1 ? "已平铺适配" : "已自适应") : (pages.length > 1 ? "平铺适配" : "自适应")}
            </button>
          </>
        )}
      </div>

      {/* Pages Container */}
      <div className="min-w-fit w-full flex-1 flex flex-col items-center justify-start pb-32">
        <div
          className={`flex items-start justify-center gap-7 transition-all duration-300 ${
            viewMode === "grid" ? "flex-wrap max-w-full" : "flex-col items-center"
          }`}
        >
          {pages.map((page) => {
            return (
              <div key={page.pageNumber} className="flex flex-col items-center">
                {/* Multi-page Card Badge Indicator */}
                {pages.length > 1 && (
                  <div
                    className="mb-2 px-2.5 py-1 rounded-md bg-white/90 dark:bg-[#181818]/90 border border-[#eaeaea] dark:border-[#262626] text-[11px] font-mono text-[#666666] dark:text-[#888888] shadow-xs flex items-center justify-between transition-colors"
                    style={{
                      width: canvasSpec.width * zoom,
                    }}
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="font-semibold text-[#171717] dark:text-white">
                        第 {page.pageNumber} / {pages.length} 页
                      </span>
                      <span>•</span>
                      <span className="truncate">{canvasSpec.name}</span>
                    </div>
                    {onFocusPage && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onFocusPage(page.pageNumber);
                        }}
                        className="shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-[#f5f5f5] dark:bg-[#242424] hover:bg-[#eaeaea] dark:hover:bg-[#333333] text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors flex items-center gap-1 cursor-pointer"
                        title="放大聚焦此页"
                      >
                        <ZoomIn className="w-2.5 h-2.5" />
                        <span>聚焦单图</span>
                      </button>
                    )}
                  </div>
                )}
                <div
                  onDoubleClick={() => onFocusPage?.(page.pageNumber)}
                  className="relative shrink-0 shadow-xl dark:shadow-2xl rounded-sm transition-shadow hover:shadow-2xl cursor-pointer"
                  title={pages.length > 1 ? "双击放大聚焦此页" : undefined}
                  style={{
                    width: canvasSpec.width * zoom,
                    height: canvasSpec.height * zoom,
                  }}
                >
                  <CanvasCard
                    page={page}
                    spec={canvasSpec}
                    config={config}
                    totalPageCount={pages.length}
                    zoom={zoom}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
};
