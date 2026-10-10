import { useMemo, useState } from "react";
import { getDefaultConfig, runTypeset } from "../../core/engine";
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
      x: 36,
      y: 420,
      width: 420,
      height: 280,
      captionHeight: 40,
      layoutPreset: "auto",
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

  const switchAspectRatio = (ratio: AspectRatioType) => {
    setAspectRatio(ratio);
    setConfig((prev) => {
      const nextDefault = getDefaultConfig(ratio);
      return {
        ...prev,
        aspectRatio: ratio,
        algorithm: {
          ...prev.algorithm,
          baseFontSize: nextDefault.algorithm.baseFontSize,
          safeArea: nextDefault.algorithm.safeArea,
        },
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
    const newImage: FlowImage = {
      ...image,
      id: `img_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    };
    setImages((prev) => [...prev, newImage]);
  };

  const updateImage = (id: string, partial: Partial<FlowImage>) => {
    setImages((prev) =>
      prev.map((img) => (img.id === id ? { ...img, ...partial } : img)),
    );
  };

  const removeImage = (id: string) => {
    setImages((prev) => prev.filter((img) => img.id !== id));
  };

  const loadTemplate = (tpl: TypesetConfig) => {
    setConfig(tpl);
    setAspectRatio(tpl.aspectRatio);
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
    highlightWords,
    setHighlightWords,
    result,
    updateAlgorithm,
    updateTheme,
    updateSafeArea,
    loadTemplate,
  };
}
