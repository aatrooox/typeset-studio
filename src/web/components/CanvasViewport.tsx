import React, { useRef } from "react";
import { computeStageDimensions } from "../../core/geometry";
import { TypesetResult } from "../../core/types";

interface CanvasViewportProps {
  result: TypesetResult;
  zoom: number;
  viewportRef?: React.RefObject<HTMLDivElement | null>;
}

export const CanvasViewport: React.FC<CanvasViewportProps> = ({ result, zoom, viewportRef }) => {
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
      className="flex-1 min-w-0 overflow-auto bg-[#f5f5f5] dark:bg-[#050505] bg-grid flex flex-col p-8 select-none relative transition-colors"
    >
      {/* Canvas Meta Info Pill */}
      <div className="sticky top-0 z-20 self-center mb-6 px-3 py-1 rounded-full bg-white/90 dark:bg-[#111111]/90 backdrop-blur border border-[#eaeaea] dark:border-[#222222] text-[11px] font-mono text-[#666666] dark:text-[#888888] flex items-center gap-2 shadow-sm">
        <span className="text-[#171717] dark:text-white font-semibold">{canvasSpec.name}</span>
        <span>•</span>
        <span>
          {canvasSpec.width} × {canvasSpec.height}px
        </span>
        <span>•</span>
        <span>{pages.length} 页</span>
      </div>

      {/* Pages Container */}
      <div className="m-auto min-w-fit flex flex-col items-center gap-12 pb-24">
        {pages.map((page) => {
          return (
            <div
              key={page.pageNumber}
              className="relative shrink-0 shadow-xl dark:shadow-2xl rounded-sm"
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
                <div
                  className="absolute"
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
                  <span
                    className="font-mono text-sm tracking-wider uppercase opacity-40 font-semibold"
                    style={{ color: theme.watermarkColor }}
                  >
                    {config.watermarkText}
                  </span>
                  <span
                    className="font-mono text-xs px-2 py-0.5 rounded-full border border-current opacity-40"
                    style={{ color: theme.textColor }}
                  >
                    P.{String(page.pageNumber).padStart(2, "0")}
                  </span>
                </div>

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
                <div
                  className="absolute flex items-center justify-between"
                  style={{
                    left: algorithm.safeArea.left,
                    bottom: Math.max(24, Math.floor(algorithm.safeArea.bottom * 0.4)),
                    right: algorithm.safeArea.right,
                    height: 36,
                    borderTop: "1px solid currentColor",
                    opacity: 0.8,
                    paddingTop: 8,
                  }}
                >
                  <span
                    className="text-xs font-mono tracking-tight opacity-50"
                    style={{ color: theme.textColor }}
                  >
                    {config.footerText}
                  </span>

                  <span
                    className="text-[11px] font-mono px-2 py-0.5 rounded opacity-50"
                    style={{ color: theme.watermarkColor }}
                  >
                    填充率 {Math.round(page.fillRatio * 100)}%
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
};
