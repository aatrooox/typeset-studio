import { useEffect, useMemo, useState } from "react";
import { getDefaultConfig, runTypeset } from "../../core/engine";
import { computeStageDimensions, getCanvasSpec } from "../../core/geometry";
import { resolveImagePlacement } from "../../core/image-layout";
import { applyTemplateImages } from "../../core/template";
import {
  AlgorithmParams,
  AspectRatioType,
  FlowImage,
  ThemeColors,
  TypesetConfig,
  TypesetResult,
} from "../../core/types";

const INITIAL_MARKDOWN = `# 大模型纯算法排版深度剖析

这是一篇利用纯几何计算与字符分词度量排版的示例文章。无论是字号、行距、还是图片避让，均由算法自动寻优。

> 排版的美感在于克制与韵律，让机器承担繁琐的对齐与换行，让人专注思想的表达。

### 为什么选择纯算法绕排？

传统排版依赖 DOM 回流与重绘，无法在无头环境中进行确定性的页面切割。而结合 Canvas 字符测距与空间网格，我们可以在微秒级求解最优文字流向。

- 零 DOM 依赖，多端极速运行
- 亚像素级字宽计算与平滑孤行控制
- 任意画板比例智能自适应
`;

export function useTypeset() {
  const [aspectRatio, setAspectRatio] = useState<AspectRatioType>("longform-3-4");
  const [config, setConfig] = useState<TypesetConfig>(() => getDefaultConfig("longform-3-4"));
  const [markdown, setMarkdown] = useState<string>(INITIAL_MARKDOWN);
  const [images, setImages] = useState<FlowImage[]>([
    {
      id: "img_demo_1",
      src: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80",
      alt: "抽象建筑线条",
      caption: "图 1：建筑结构中的空间秩序感",
      x: 16,
      y: 420,
      width: 420,
      height: 280,
      captionHeight: 40,
      layoutPreset: "mid-left",
    },
  ]);
  const [highlightWords, setHighlightWords] = useState<string[]>(["算法排版", "确定性", "空间秩序"]);

  // Calculate typeset result synchronously (instant 60fps)
  const result: TypesetResult = useMemo(() => {
    return runTypeset({
      markdown,
      images,
      config,
      highlightWords,
    });
  }, [markdown, images, config, highlightWords]);

  useEffect(() => {
    const initFromUrlAndDefaults = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const urlTemplate = params.get("template") || params.get("templateId") || params.get("templateKey");
        const urlSlot = params.get("slot");
        const urlAccount = params.get("account") || "default";
        const urlTitle = params.get("title");
        const urlMarkdown = params.get("markdown") || params.get("text");

        // Handle title or markdown if passed
        if (urlMarkdown) {
          setMarkdown(urlMarkdown);
        } else if (urlTitle) {
          setMarkdown(`# ${urlTitle}\n\n在此输入正文内容...`);
        }

        // 1. Handle explicit template loading
        if (urlTemplate) {
          const res = await fetch(`/api/templates/resolve/${encodeURIComponent(urlTemplate)}`);
          const data = await res.json();
          if (data.ok && data.template) {
            loadTemplate(data.template);
            return;
          }
        }

        // 2. Handle slot loading
        if (urlSlot) {
          const res = await fetch(`/api/templates/slots?account=${encodeURIComponent(urlAccount)}`);
          const data = await res.json();
          if (data.ok && data.slots?.[urlSlot]?.template) {
            loadTemplate(data.slots[urlSlot].template);
            return;
          }
        }

        // 3. If no template or slot in URL, check slot defaults or global default
        const res = await fetch(`/api/templates/slots?account=${encodeURIComponent(urlAccount)}`);
        const data = await res.json();
        if (data.ok && data.slots?.newspic_content?.template) {
          loadTemplate(data.slots.newspic_content.template);
          return;
        }

        // 4. Fallback default
        const defRes = await fetch("/api/templates/default");
        const defData = await defRes.json();
        if (defData.ok && defData.template) {
          loadTemplate(defData.template);
        }
      } catch {
        // ignore
      }
    };

    initFromUrlAndDefaults();
  }, []);

  const switchAspectRatio = (ratio: AspectRatioType) => {
    setAspectRatio(ratio);
    const spec = getCanvasSpec(ratio);
    const nextDefault = getDefaultConfig(ratio);
    const { stageWidth, stageHeight } = computeStageDimensions(
      spec,
      nextDefault.algorithm.safeArea,
      nextDefault.algorithm.contentBottomGap,
    );
    setImages((prev) =>
      prev.map((img) => {
        if (!img.isAbsolute && img.layoutPreset && img.layoutPreset !== "custom") {
          const page = img.pageIndex || 1;
          const samePageList = prev.filter((im) => (im.pageIndex || 1) === page);
          const indexOnPage = Math.max(0, samePageList.findIndex((im) => im.id === img.id));
          const resolved = resolveImagePlacement(img, indexOnPage, stageWidth, stageHeight);
          return {
            ...img,
            x: resolved.x,
            y: resolved.y,
            width: resolved.width,
            height: resolved.height,
          };
        }
        return img;
      }),
    );
    setConfig((prev) => {
      return {
        ...prev,
        aspectRatio: ratio,
        algorithm: {
          ...prev.algorithm,
          baseFontSize: nextDefault.algorithm.baseFontSize,
          scaleRatio: nextDefault.algorithm.scaleRatio,
          safeArea: nextDefault.algorithm.safeArea,
          textAlign: nextDefault.algorithm.textAlign,
          verticalAlign: nextDefault.algorithm.verticalAlign,
          contentBottomGap: nextDefault.algorithm.contentBottomGap,
        },
        chrome: {
          ...nextDefault.chrome,
        },
        watermarkText: nextDefault.watermarkText,
        footerText: nextDefault.footerText,
      };
    });
  };

  const updateAlgorithm = (partial: Partial<AlgorithmParams>) => {
    setConfig((prev) => ({
      ...prev,
      algorithm: { ...prev.algorithm, ...partial },
    }));
  };

  const updateTheme = (partial: Partial<ThemeColors>) => {
    setConfig((prev) => ({
      ...prev,
      theme: { ...prev.theme, ...partial },
    }));
  };

  const updateSafeArea = (partial: Partial<AlgorithmParams["safeArea"]>) => {
    setConfig((prev) => ({
      ...prev,
      algorithm: {
        ...prev.algorithm,
        safeArea: { ...prev.algorithm.safeArea, ...partial },
      },
    }));
  };

  const addImage = (image: Omit<FlowImage, "id">) => {
    const spec = getCanvasSpec(aspectRatio);
    const { stageWidth, stageHeight } = computeStageDimensions(
      spec,
      config.algorithm.safeArea,
      config.algorithm.contentBottomGap,
    );
    const targetPage = image.pageIndex || 1;
    const samePageImages = images.filter((im) => (im.pageIndex || 1) === targetPage);
    const indexOnPage = samePageImages.length;

    const temp: FlowImage = {
      ...image,
      id: `img_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    };
    const resolved = resolveImagePlacement(temp, indexOnPage, stageWidth, stageHeight);
    const newImage: FlowImage = {
      ...temp,
      x: resolved.x,
      y: resolved.y,
      width: resolved.width,
      height: resolved.height,
    };
    setImages((prev) => [...prev, newImage]);
  };

  const updateImage = (id: string, partial: Partial<FlowImage>) => {
    setImages((prev) => {
      const nextImages = prev.map((img) => {
        if (img.id !== id) return img;
        const merged: FlowImage = { ...img, ...partial };
        if (partial.layoutPreset && partial.layoutPreset !== "custom") {
          // Clear stale preset coordinates when switching presets
          delete merged.x;
          delete merged.y;
          delete merged.width;
          delete merged.height;
        }
        return merged;
      });

      const updatedImg = nextImages.find((im) => im.id === id);
      if (!updatedImg) return prev;

      // If non-custom flow preset, recalculate clean coordinates based on its page index
      if (!updatedImg.isAbsolute && updatedImg.layoutPreset && updatedImg.layoutPreset !== "custom") {
        const page = updatedImg.pageIndex || 1;
        const samePageList = nextImages.filter((im) => (im.pageIndex || 1) === page);
        const indexOnPage = Math.max(0, samePageList.findIndex((im) => im.id === id));

        const spec = getCanvasSpec(aspectRatio);
        const { stageWidth, stageHeight } = computeStageDimensions(
          spec,
          config.algorithm.safeArea,
          config.algorithm.contentBottomGap,
        );
        const resolved = resolveImagePlacement(updatedImg, indexOnPage, stageWidth, stageHeight);
        return nextImages.map((im) =>
          im.id === id
            ? {
                ...im,
                x: resolved.x,
                y: resolved.y,
                width: resolved.width,
                height: resolved.height,
              }
            : im,
        );
      }

      return nextImages;
    });
  };

  const removeImage = (id: string) => {
    setImages((prev) => {
      const remaining = prev.filter((img) => img.id !== id);
      const spec = getCanvasSpec(aspectRatio);
      const { stageWidth, stageHeight } = computeStageDimensions(
        spec,
        config.algorithm.safeArea,
        config.algorithm.contentBottomGap,
      );
      return remaining.map((img) => {
        if (!img.isAbsolute && img.layoutPreset && img.layoutPreset !== "custom") {
          const page = img.pageIndex || 1;
          const samePageList = remaining.filter((im) => (im.pageIndex || 1) === page);
          const indexOnPage = Math.max(0, samePageList.findIndex((im) => im.id === img.id));
          const resolved = resolveImagePlacement(img, indexOnPage, stageWidth, stageHeight);
          return {
            ...img,
            x: resolved.x,
            y: resolved.y,
            width: resolved.width,
            height: resolved.height,
          };
        }
        return img;
      });
    });
  };

  const moveImage = (id: string, direction: "up" | "down") => {
    setImages((prev) => {
      const index = prev.findIndex((img) => img.id === id);
      if (index === -1) return prev;
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;
      const next = [...prev];
      const temp = next[index]!;
      next[index] = next[targetIndex]!;
      next[targetIndex] = temp;

      const spec = getCanvasSpec(aspectRatio);
      const { stageWidth, stageHeight } = computeStageDimensions(
        spec,
        config.algorithm.safeArea,
        config.algorithm.contentBottomGap,
      );

      return next.map((img) => {
        if (!img.isAbsolute && img.layoutPreset && img.layoutPreset !== "custom") {
          const page = img.pageIndex || 1;
          const samePageList = next.filter((im) => (im.pageIndex || 1) === page);
          const indexOnPage = Math.max(0, samePageList.findIndex((im) => im.id === img.id));
          const resolved = resolveImagePlacement(img, indexOnPage, stageWidth, stageHeight);
          return {
            ...img,
            x: resolved.x,
            y: resolved.y,
            width: resolved.width,
            height: resolved.height,
          };
        }
        return img;
      });
    });
  };

  const loadTemplate = (tpl: TypesetConfig) => {
    setConfig(tpl);
    setAspectRatio(tpl.aspectRatio);
    if (tpl.images) {
      setImages((prev) => applyTemplateImages(prev, tpl.images));
    }
  };

  const updateTypography = (partial: Partial<TypesetConfig["typography"]>) => {
    setConfig((prev) => ({
      ...prev,
      typography: { ...prev.typography, ...partial },
    }));
  };

  return {
    aspectRatio,
    switchAspectRatio,
    config,
    setConfig,
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
  };
}
