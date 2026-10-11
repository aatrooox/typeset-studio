import React, { useRef } from "react";
import { LayoutGrid, Rows, ZoomIn } from "lucide-react";
import { computeStageDimensions } from "../../core/geometry";
import { TypesetResult } from "../../core/types";

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
  const { algorithm, theme } = config;
  const { stageWidth, stageHeight, stageX, stageY } = computeStageDimensions(
    canvasSpec,
    algorithm.safeArea,
    algorithm.contentBottomGap,
  );

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
              {/* Scaled Page Container */}
              <div
                id={`typeset-page-${page.pageNumber}`}
                className="typeset-page absolute top-0 left-0 overflow-hidden border border-[#e0e0e0] dark:border-[#222222]"
                style={{
                  width: canvasSpec.width,
                  height: canvasSpec.height,
                  transform: `scale(${zoom})`,
                  transformOrigin: "top left",
                  backgroundColor: theme.bgColor,
                  color: theme.textColor,
                }}
              >
                {/* Header Brand Bar (for cover or article top) */}
                {(() => {
                  const chrome = config.chrome;
                  const showHeader = chrome?.showHeader ?? Boolean(config.watermarkText?.trim());
                  const showWatermark = (chrome?.showWatermark ?? true) && Boolean(config.watermarkText?.trim());
                  const showPageNum = chrome?.showPageNumber ?? (config.aspectRatio === "longform-3-4" && pages.length > 1);

                  if (!showHeader || (!showWatermark && !showPageNum)) {
                    return null;
                  }

                  return (
                    <div
                      className="absolute pointer-events-none"
                      style={{
                        left: algorithm.safeArea.left,
                        top: Math.max(20, algorithm.safeArea.top - 60),
                        right: algorithm.safeArea.right,
                        height: 40,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      {showWatermark ? (
                        <span
                          className="font-mono text-sm tracking-wider uppercase opacity-40 font-semibold"
                          style={{ color: theme.watermarkColor }}
                        >
                          {config.watermarkText}
                        </span>
                      ) : <span />}

                      {showPageNum && (
                        <span
                          className="font-mono text-xs px-2 py-0.5 rounded-full border border-current opacity-40"
                          style={{ color: theme.textColor }}
                        >
                          P.{String(page.pageNumber).padStart(2, "0")}
                        </span>
                      )}
                    </div>
                  );
                })()}

                {/* Content Stage (where text and obstacles flow) */}
                <div
                  className="absolute"
                  style={{
                    left: stageX,
                    top: stageY,
                    width: stageWidth,
                    height: stageHeight,
                  }}
                >
                  {/* Obstacle Images & Free Layers */}
                  {page.images.map((img) => (
                    <React.Fragment key={img.id}>
                      <img
                        src={img.src}
                        alt={img.alt}
                        className="absolute object-cover shadow-md transition-all duration-300 ease-out select-none"
                        style={{
                          left: img.x,
                          top: img.y,
                          width: img.width,
                          height: img.height,
                          zIndex: img.zIndex ?? (img.isAbsolute ? 20 : 5),
                          transform: `rotate(${img.rotate || 0}deg)`,
                          transformOrigin: "center center",
                          opacity: img.opacity ?? 1,
                          borderRadius: `${img.borderRadius ?? 12}px`,
                          backgroundColor: theme.cardBg || "#1a1a1a",
                        }}
                      />
                      {img.caption && (
                        <div
                          className="absolute text-center truncate px-2 transition-all duration-300 ease-out"
                          style={{
                            left: img.x,
                            top: img.y + img.height + 8,
                            width: img.width,
                            zIndex: (img.zIndex ?? (img.isAbsolute ? 20 : 5)) + 1,
                            transform: `rotate(${img.rotate || 0}deg)`,
                            opacity: img.opacity ?? 1,
                            color: theme.captionColor,
                            fontSize: Math.max(14, Math.round(algorithm.baseFontSize * 0.45)),
                            lineHeight: "24px",
                          }}
                        >
                          {img.caption}
                        </div>
                      )}
                    </React.Fragment>
                  ))}

                  {/* Flowed Text Lines */}
                  {page.lines.map((line, lIdx) => (
                    <React.Fragment key={lIdx}>
                      {/* Bullet point if list item */}
                      {line.bullet && typeof line.bulletX === "number" && (
                        <div
                          className="absolute font-semibold pointer-events-none"
                          style={{
                            left: line.bulletX,
                            top: line.y,
                            zIndex: 10,
                            font: line.font,
                            lineHeight: `${line.lineHeight}px`,
                            color: theme.accentColor,
                          }}
                        >
                          {line.bullet}
                        </div>
                      )}

                      <div
                        className={`absolute whitespace-pre select-text ${line.className}`}
                        style={{
                          left: line.x,
                          top: line.y,
                          width: line.maxWidth,
                          zIndex: 10,
                          font: line.font,
                          lineHeight: `${line.lineHeight}px`,
                          color:
                            line.className === "body-quote"
                              ? theme.quoteColor
                              : line.className.includes("heading")
                                ? (theme.headingColor || theme.textColor)
                                : theme.textColor,
                        }}
                      >
                        {line.fragments.map((frag, fIdx) => (
                          <span
                            key={fIdx}
                            style={{
                              font: frag.font,
                              fontWeight: frag.bold ? 700 : undefined,
                              fontStyle: frag.italic ? "italic" : undefined,
                              marginLeft: frag.gapBefore,
                              display: "inline-block",
                              verticalAlign: "top",
                              width: frag.occupiedWidth,
                              color: frag.highlight ? theme.accentColor : undefined,
                            }}
                          >
                            {frag.text}
                          </span>
                        ))}
                      </div>
                    </React.Fragment>
                  ))}
                </div>

                {/* Footer Bar */}
                {(() => {
                  const chrome = config.chrome;
                  const showFooter = chrome?.showFooter ?? Boolean(config.footerText?.trim());
                  const showFooterText = (chrome?.showFooterText ?? true) && Boolean(config.footerText?.trim());
                  const showFillRatio = chrome?.showFillRatio === true;
                  const showDivider = chrome?.showFooterDivider ?? showFooterText;

                  if (!showFooter || (!showFooterText && !showFillRatio)) {
                    return null;
                  }

                  return (
                    <div
                      className="absolute flex items-center justify-between pointer-events-none"
                      style={{
                        left: algorithm.safeArea.left,
                        bottom: Math.max(24, Math.floor(algorithm.safeArea.bottom * 0.4)),
                        right: algorithm.safeArea.right,
                        height: 36,
                        borderTop: showDivider ? "1px solid currentColor" : "none",
                        opacity: 0.8,
                        paddingTop: showDivider ? 8 : 0,
                      }}
                    >
                      {showFooterText ? (
                        <span
                          className="text-xs font-mono tracking-tight opacity-50"
                          style={{ color: theme.textColor }}
                        >
                          {config.footerText}
                        </span>
                      ) : <span />}

                      {showFillRatio && (
                        <span
                          className="text-[11px] font-mono px-2 py-0.5 rounded opacity-50"
                          style={{ color: theme.watermarkColor }}
                        >
                          填充率 {Math.round(page.fillRatio * 100)}%
                        </span>
                      )}
                    </div>
                  );
                })()}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
};
