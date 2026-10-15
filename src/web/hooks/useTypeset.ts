import { clearCache } from "@chenglou/pretext";
import { useEffect, useMemo, useRef, useState } from "react";
import { getDefaultConfig, runTypeset } from "../../core/engine";
import { computeStageDimensions, getCanvasSpec } from "../../core/geometry";
import { resolveImagePlacement } from "../../core/image-layout";
import { applyTemplateImages, validateTemplateAssets } from "../../core/template";
import { backgroundImageLayout, restoreImageLayout, snapshotImageLayout, type ImageLayout } from "./image-layout";
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

// 统一预设配图的页内序号计算，手动坐标和自由图层保持原样。
function resolvePresetImage(
  image: FlowImage,
  images: FlowImage[],
  stageWidth: number,
  stageHeight: number,
): FlowImage {
  if (image.isAbsolute || !image.layoutPreset || image.layoutPreset === "custom") return image;
  const page = image.pageIndex || 1;
  const indexOnPage = images.filter((item) => Boolean(item.templateAssetKey) === Boolean(image.templateAssetKey) && (item.pageIndex || 1) === page)
    .findIndex((item) => item.id === image.id);
  return resolveImagePlacement(image, indexOnPage, stageWidth, stageHeight);
}

export function useTypeset(adminKey: string, isVerified: boolean | null) {
  const [error, setError] = useState<string | null>(null);
  const [fontVersion, setFontVersion] = useState(0);
  const [config, setConfig] = useState<TypesetConfig>(() => getDefaultConfig("longform-3-4"));
  const aspectRatio = config.aspectRatio;
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
  // 上传或应用模板时记录初始布局，背景切换另存一份勾选前的布局。
  const initialImageLayouts = useRef(new Map(images.map((image) => [image.id, snapshotImageLayout(image)])));
  const [backgroundLayouts, setBackgroundLayouts] = useState<Record<string, ImageLayout>>({});

  // Calculate typeset result synchronously (instant 60fps)
  const { result, layoutError } = useMemo(() => {
    try {
      return { result: runTypeset({ markdown, images, config, highlightWords }), layoutError: null };
    } catch (err) {
      return {
        result: { pages: [], pageCount: 0, canvasSpec: getCanvasSpec(config.aspectRatio), config } satisfies TypesetResult,
        layoutError: err instanceof Error ? err.message : "排版失败",
      };
    }
  }, [markdown, images, config, highlightWords, fontVersion]);

  useEffect(() => {
    let active = true;
    let refreshTimer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      if (!active) return;
      clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => {
        clearCache();
        setFontVersion((version) => version + 1);
      }, 0);
    };
    document.fonts.ready.then(refresh);
    document.fonts.addEventListener("loadingdone", refresh);
    window.addEventListener("typeset-fonts-loaded", refresh);
    return () => {
      active = false;
      clearTimeout(refreshTimer);
      document.fonts.removeEventListener("loadingdone", refresh);
      window.removeEventListener("typeset-fonts-loaded", refresh);
    };
  }, []);

  useEffect(() => {
    if (!isVerified) return;
    let active = true;
    const headers = { "x-admin-key": adminKey };
    const readTemplate = async (url: string) => {
      const response = await fetch(url, { headers });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.message || data.error || "加载模板失败");
      return data;
    };
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
          const data = await readTemplate(`/api/templates/resolve/${encodeURIComponent(urlTemplate)}`);
          if (data.ok && data.template) {
            if (active) loadTemplate(data.template);
            return;
          }
        }

        // 2. Handle slot loading
        if (urlSlot) {
          const data = await readTemplate(`/api/templates/slots?account=${encodeURIComponent(urlAccount)}`);
          if (data.ok && data.slots?.[urlSlot]?.template) {
            if (active) loadTemplate(data.slots[urlSlot].template);
            return;
          }
        }

        // 3. If no template or slot in URL, check slot defaults or global default
        const data = await readTemplate(`/api/templates/slots?account=${encodeURIComponent(urlAccount)}`);
        if (data.ok && data.slots?.newspic_content?.template) {
          if (active) loadTemplate(data.slots.newspic_content.template);
          return;
        }

        // 4. Fallback default
        const defData = await readTemplate("/api/templates/default");
        if (defData.ok && defData.template) {
          if (active) loadTemplate(defData.template);
        }
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "加载模板失败");
      }
    };

    setError(null);
    initFromUrlAndDefaults();
    return () => { active = false; };
  }, [adminKey, isVerified]);

  const switchAspectRatio = (ratio: AspectRatioType) => {
    const spec = getCanvasSpec(ratio);
    const nextDefault = getDefaultConfig(ratio);
    const { stageWidth, stageHeight } = computeStageDimensions(
      spec,
      nextDefault.algorithm.safeArea,
      nextDefault.algorithm.contentBottomGap,
    );
    setImages((prev) => prev.map((image) => resolvePresetImage(image, prev, stageWidth, stageHeight)));
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
      ...(partial.bgColor ? { canvasStyle: { ...prev.canvasStyle, fill: { type: "solid" as const, color: partial.bgColor } } } : {}),
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
    const samePageImages = images.filter((im) => !im.templateAssetKey && (im.pageIndex || 1) === targetPage);
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
    initialImageLayouts.current.set(newImage.id, snapshotImageLayout(newImage));
    setImages((prev) => [...prev, newImage]);
  };

  const updateImage = (id: string, partial: Partial<FlowImage>) => {
    const previousBackground = partial.isAbsolute === false ? backgroundLayouts[id] : undefined;
    if (previousBackground) clearBackgroundLayout(id);
    setImages((prev) => {
      const nextImages = prev.map((img) => {
        if (img.id !== id) return img;
        const merged = restoreImageLayout(img, { ...previousBackground, ...partial });
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
        const spec = getCanvasSpec(aspectRatio);
        const { stageWidth, stageHeight } = computeStageDimensions(
          spec,
          config.algorithm.safeArea,
          config.algorithm.contentBottomGap,
        );
        return nextImages.map((image) => image.id === id
          ? resolvePresetImage(image, nextImages, stageWidth, stageHeight)
          : image);
      }

      return nextImages;
    });
  };

  // 清除背景状态，避免恢复布局后复选框仍处于选中状态。
  const clearBackgroundLayout = (id: string) => setBackgroundLayouts((prev) => {
    const next = { ...prev };
    delete next[id];
    return next;
  });

  // 背景复选框只覆盖当前布局，取消时恢复勾选前的快照。
  const toggleImageBackground = (id: string, enabled: boolean) => {
    const image = images.find((item) => item.id === id);
    if (!image) return;
    if (enabled) {
      if (backgroundLayouts[id]) return;
      setBackgroundLayouts((prev) => ({ ...prev, [id]: snapshotImageLayout(image) }));
      updateImage(id, backgroundImageLayout(config));
    } else {
      const layout = backgroundLayouts[id];
      if (!layout) return;
      clearBackgroundLayout(id);
      setImages((prev) => prev.map((item) => item.id === id ? restoreImageLayout(item, layout) : item));
    }
  };

  // 重置到本次上传或应用模板时的布局，不改内容和固定素材标识。
  const resetImageLayout = (id: string) => {
    const layout = initialImageLayouts.current.get(id);
    if (!layout) return;
    clearBackgroundLayout(id);
    setImages((prev) => prev.map((image) => image.id === id ? restoreImageLayout(image, layout) : image));
  };

  const removeImage = (id: string) => {
    initialImageLayouts.current.delete(id);
    clearBackgroundLayout(id);
    setImages((prev) => {
      const remaining = prev.filter((img) => img.id !== id);
      const spec = getCanvasSpec(aspectRatio);
      const { stageWidth, stageHeight } = computeStageDimensions(
        spec,
        config.algorithm.safeArea,
        config.algorithm.contentBottomGap,
      );
      return remaining.map((image) => resolvePresetImage(image, remaining, stageWidth, stageHeight));
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

      return next.map((image) => resolvePresetImage(image, next, stageWidth, stageHeight));
    });
  };

  const loadTemplate = (tpl: TypesetConfig) => {
    try {
      validateTemplateAssets(tpl.images);
      // 套用后编辑的是副本，名称用于顶部状态栏和另存为模板。
      setConfig({ ...tpl, name: `${tpl.name || "未命名模板"}-副本` });
      setBackgroundLayouts({});
      setImages((prev) => {
        const next = applyTemplateImages(prev, tpl.images);
        initialImageLayouts.current = new Map(next.map((image) => [image.id, snapshotImageLayout(image)]));
        return next;
      });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "模板素材无效");
    }
  };

  const updateTypography = (partial: Partial<TypesetConfig["typography"]>) => {
    setConfig((prev) => ({
      ...prev,
      typography: { ...prev.typography, ...partial },
    }));
  };

  return {
    error: layoutError || error,
    aspectRatio,
    switchAspectRatio,
    config,
    setConfig,
    markdown,
    setMarkdown,
    images,
    addImage,
    updateImage,
    toggleImageBackground,
    resetImageLayout,
    backgroundImageIds: Object.keys(backgroundLayouts),
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
