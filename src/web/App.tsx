import React, { useRef, useState } from "react";
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
    highlightWords,
    setHighlightWords,
    result,
    updateAlgorithm,
    updateTheme,
    updateSafeArea,
    loadTemplate,
    setConfig,
  } = useTypeset();

  const { adminKey, setAdminKey, isVerified } = useAuth();

  const [zoom, setZoom] = useState<number>(0.45);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);

  // Client-side instant PNG download using html-to-image
  const handleExport = async () => {
    setIsExporting(true);
    try {
      const pageElements = document.querySelectorAll<HTMLElement>(".typeset-page");
      if (!pageElements.length) return;

      for (let i = 0; i < pageElements.length; i++) {
        const node = pageElements[i]!;
        // Temporarily reset transform scale for crisp 1:1 render
        const originalTransform = node.style.transform;
        node.style.transform = "none";

        const dataUrl = await toPng(node, {
          pixelRatio: 2, // High-DPI export
          cacheBust: true,
        });

        node.style.transform = originalTransform;

        const link = document.createElement("a");
        link.download = `typeset-${aspectRatio}-p${i + 1}-${Date.now()}.png`;
        link.href = dataUrl;
        link.click();
      }
    } catch (err) {
      console.error("Export failed:", err);
      alert("导出失败，请重试或检查图片跨域策略");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#000000] text-[#ededed]">
      {/* Top Header */}
      <Header
        currentRatio={aspectRatio}
        onSelectRatio={switchAspectRatio}
        zoom={zoom}
        onZoomChange={setZoom}
        onOpenTemplates={() => setIsTemplateModalOpen(true)}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onExport={handleExport}
        isExporting={isExporting}
        isAuthed={Boolean(isVerified)}
        pageCount={result.pageCount}
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
          highlightWords={highlightWords}
          onHighlightWordsChange={setHighlightWords}
          adminKey={adminKey}
        />

        {/* Middle: Canvas Viewport */}
        <CanvasViewport
          result={result}
          zoom={zoom}
          viewportRef={viewportRef}
        />

        {/* Right: Algorithm & Parameters Inspector */}
        <ParamsInspector
          config={config}
          onUpdateAlgorithm={updateAlgorithm}
          onUpdateTheme={updateTheme}
          onUpdateSafeArea={updateSafeArea}
          onUpdateBranding={(footer, watermark) => {
            setConfig((prev) => ({
              ...prev,
              footerText: footer,
              watermarkText: watermark,
            }));
          }}
        />
      </div>

      {/* Modals */}
      <TemplateModal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        currentConfig={config}
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
