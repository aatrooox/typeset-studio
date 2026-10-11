import React, { useEffect, useRef, useState } from "react";
import { toPng } from "html-to-image";
import { AuthModal } from "./components/AuthModal";
import { CanvasViewport } from "./components/CanvasViewport";
import { EditorSidebar } from "./components/EditorSidebar";
import { Header } from "./components/Header";
import { ParamsInspector } from "./components/ParamsInspector";
import { TemplateModal } from "./components/TemplateModal";
import { useAuth } from "./hooks/useAuth";
import { useTypeset } from "./hooks/useTypeset";

export const App: React.FC = () => {
  const {
    aspectRatio,
    switchAspectRatio,
    config,
    markdown,
    setMarkdown,
    images,
    addImage,
    updateImage,
    removeImage,
    moveImage,
    highlightWords,
    setHighlightWords,
    result,
    updateAlgorithm,
    updateTheme,
    updateTypography,
    updateSafeArea,
    loadTemplate,
    setConfig,
  } = useTypeset();

  const { adminKey, setAdminKey, isVerified } = useAuth();

  // Default to Light Mode per user requirement
  const [themeMode, setThemeMode] = useState<"light" | "dark">(() => {
    return (localStorage.getItem("typeset_studio_theme_mode") as "light" | "dark") || "light";
  });

  useEffect(() => {
    if (themeMode === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("typeset_studio_theme_mode", themeMode);
  }, [themeMode]);

  const toggleThemeMode = () => {
    setThemeMode((prev) => (prev === "light" ? "dark" : "light"));
  };

  const [viewMode, setViewMode] = useState<"grid" | "stack">("grid");
  const [zoom, setZoom] = useState<number>(0.45);
  const [isAutoFit, setIsAutoFit] = useState<boolean>(true);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);

  // Auto-fit zoom calculation:
  // - Single page or stack mode: fits single card completely into viewport
  // - Multi-page in grid mode: shrinks pages down and finds best column layout so that
  //   all pages are concurrently visible inside the viewport as a waterfall/gallery grid!
  const calculateAutoFitZoom = (mode: "grid" | "stack" = viewMode) => {
    if (!viewportRef.current) return 0.45;
    const { clientWidth, clientHeight } = viewportRef.current;
    if (clientWidth <= 0 || clientHeight <= 0) return 0.45;
    const spec = result.canvasSpec;
    const count = result.pages.length;

    // Single page or vertical stack mode: fits single card to viewport
    if (count <= 1 || mode === "stack") {
      const paddingX = 64;
      const paddingY = 120;
      const availW = Math.max(200, clientWidth - paddingX);
      const availH = Math.max(200, clientHeight - paddingY);
      const fitZoom = Math.min(availW / spec.width, availH / spec.height);
      return Math.max(0.2, Math.min(1.2, Math.round(fitZoom * 100) / 100));
    }

    // Multi-page grid/waterfall auto-fit:
    // Fits multiple cards side-by-side or in a compact grid within the current viewport
    const paddingX = 48;
    const paddingY = 96;
    const gap = 28;
    const badgeHeight = 36;
    const availW = Math.max(200, clientWidth - paddingX);
    const availH = Math.max(200, clientHeight - paddingY);

    let bestZoom = 0.2;
    const maxCols = Math.min(count, 4);

    for (let cols = 1; cols <= maxCols; cols++) {
      const rows = Math.ceil(count / cols);
      const totalGapW = (cols - 1) * gap;
      const totalGapH = (rows - 1) * gap;
      const totalBadgeH = rows * badgeHeight;

      const availForCardsW = availW - totalGapW;
      const availForCardsH = availH - totalGapH - totalBadgeH;

      if (availForCardsW > 60 && availForCardsH > 60) {
        const zoomW = availForCardsW / (cols * spec.width);
        const zoomH = availForCardsH / (rows * spec.height);
        const candidateZoom = Math.min(zoomW, zoomH);
        if (candidateZoom > bestZoom) {
          bestZoom = candidateZoom;
        }
      }
    }

    // Floor at 0.22 so that even with many pages, text remains reasonably legible
    const clamped = Math.max(0.22, Math.min(0.9, Math.round(bestZoom * 100) / 100));
    return clamped;
  };

  const handleAutoFit = () => {
    setIsAutoFit(true);
    const newZoom = calculateAutoFitZoom(viewMode);
    setZoom(newZoom);
  };

  const handleZoomChange = (newZoom: number) => {
    setIsAutoFit(false);
    setZoom(newZoom);
  };

  const handleToggleViewMode = (newMode: "grid" | "stack") => {
    setViewMode(newMode);
    setIsAutoFit(true);
    const newZoom = calculateAutoFitZoom(newMode);
    setZoom(newZoom);
  };

  const handleFocusPage = (pageNumber: number) => {
    setIsAutoFit(false);
    if (!viewportRef.current) return;
    const { clientWidth, clientHeight } = viewportRef.current;
    const spec = result.canvasSpec;
    const singleZoom = Math.max(
      0.2,
      Math.min(1.2, Math.round(Math.min((clientWidth - 64) / spec.width, (clientHeight - 120) / spec.height) * 100) / 100)
    );
    setZoom(singleZoom);
    setTimeout(() => {
      const el = document.getElementById(`typeset-page-${pageNumber}`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 60);
  };

  // Re-calculate auto-fit zoom when aspectRatio, dimensions, page count, or view mode changes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isAutoFit) {
        const newZoom = calculateAutoFitZoom(viewMode);
        setZoom(newZoom);
      }
    }, 60);
    return () => clearTimeout(timer);
  }, [aspectRatio, result.canvasSpec.width, result.canvasSpec.height, result.pages.length, viewMode]);

  // Handle window and viewport resizing dynamically
  useEffect(() => {
    if (!viewportRef.current) return;
    const observer = new ResizeObserver(() => {
      if (isAutoFit) {
        const newZoom = calculateAutoFitZoom(viewMode);
        setZoom(newZoom);
      }
    });
    observer.observe(viewportRef.current);
    return () => observer.disconnect();
  }, [isAutoFit, result.canvasSpec.width, result.canvasSpec.height, result.pages.length, viewMode]);

  // WYSIWYG Direct Canvas export with graceful server-side fallback
  const handleExport = async () => {
    setIsExporting(true);
    try {
      const canvasElements = document.querySelectorAll<HTMLCanvasElement>("canvas.typeset-page");
      if (canvasElements.length > 0) {
        let exportSucceeded = true;
        for (let i = 0; i < canvasElements.length; i++) {
          const canvas = canvasElements[i]!;
          try {
            const dataUrl = canvas.toDataURL("image/png");
            const link = document.createElement("a");
            link.download = `typeset-${aspectRatio}-p${i + 1}-${Date.now()}.png`;
            link.href = dataUrl;
            link.click();
          } catch (taintErr) {
            console.warn("Canvas is tainted by external non-CORS image, falling back to server export:", taintErr);
            exportSucceeded = false;
            break;
          }
        }
        if (exportSucceeded) {
          setIsExporting(false);
          return;
        }
      }

      // Server-side native Canvas fallback (e.g. When tainted by external images)
      const response = await fetch("/api/render/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(adminKey ? { "X-Admin-Key": adminKey } : {}),
        },
        body: JSON.stringify({
          result,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }

      const data = await response.json();
      if (!data.ok || !data.pages?.length) {
        throw new Error(data.error || "No pages returned from server-side render");
      }

      for (const pageItem of data.pages) {
        const link = document.createElement("a");
        link.download = `typeset-${aspectRatio}-p${pageItem.pageNumber}-${Date.now()}.png`;
        link.href = pageItem.dataUrl;
        link.click();
      }
    } catch (err) {
      console.error("Export failed:", err);
      alert("导出失败，请检查网络或后端服务连接");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#fafafa] dark:bg-[#000000] text-[#171717] dark:text-[#ededed] transition-colors">
      {/* Top Header */}
      <Header
        currentRatio={aspectRatio}
        onSelectRatio={switchAspectRatio}
        zoom={zoom}
        onZoomChange={handleZoomChange}
        onAutoFit={handleAutoFit}
        isAutoFit={isAutoFit}
        onOpenTemplates={() => setIsTemplateModalOpen(true)}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onExport={handleExport}
        isExporting={isExporting}
        isAuthed={Boolean(isVerified)}
        pageCount={result.pageCount}
        themeMode={themeMode}
        onToggleThemeMode={toggleThemeMode}
      />

      {/* Main Workspace (3-column layout) */}
      <div className="flex flex-1 min-h-0 overflow-hidden relative">
        {/* Left: Content Editor Sidebar */}
        <EditorSidebar
          markdown={markdown}
          onMarkdownChange={setMarkdown}
          images={images}
          onAddImage={addImage}
          onUpdateImage={updateImage}
          onRemoveImage={removeImage}
          onMoveImage={moveImage}
          pageCount={result.pageCount}
          highlightWords={highlightWords}
          onHighlightWordsChange={setHighlightWords}
          adminKey={adminKey}
        />

        {/* Middle: Canvas Viewport */}
        <CanvasViewport
          result={result}
          zoom={zoom}
          viewportRef={viewportRef}
          onAutoFit={handleAutoFit}
          isAutoFit={isAutoFit}
          viewMode={viewMode}
          onToggleViewMode={handleToggleViewMode}
          onFocusPage={handleFocusPage}
        />

        {/* Right: Algorithm & Parameters Inspector */}
        <ParamsInspector
          config={config}
          onUpdateAlgorithm={updateAlgorithm}
          onUpdateTheme={updateTheme}
          onUpdateTypography={updateTypography}
          onUpdateSafeArea={updateSafeArea}
          onUpdateBranding={(footer, watermark) => {
            setConfig((prev) => ({
              ...prev,
              footerText: footer,
              watermarkText: watermark,
            }));
          }}
          onUpdateChrome={(partial) => {
            setConfig((prev) => ({
              ...prev,
              chrome: {
                ...prev.chrome,
                ...partial,
              },
            }));
          }}
        />
      </div>

      {/* Modals */}
      <TemplateModal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        currentConfig={{
          ...config,
          images,
        }}
        onApplyTemplate={loadTemplate}
        adminKey={adminKey}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentKey={adminKey}
        onSaveKey={setAdminKey}
        isVerified={isVerified}
      />
    </div>
  );
};
