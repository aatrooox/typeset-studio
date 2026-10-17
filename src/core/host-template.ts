import { getCanvasSpec } from "./geometry";
import type { AlgorithmParams, CanvasStyle, TemplateSlot, ThemeColors, TypesetConfig } from "./types";

export type HostTemplatePatch = Omit<Partial<TypesetConfig>, "algorithm" | "theme"> & {
  algorithm?: Partial<AlgorithmParams>;
  theme?: Partial<ThemeColors>;
};

// 仅宿主统一重复配置，原独立 Studio 和 adapter 保持既有优先级。
export function resolveHostTemplateConfig(config: TypesetConfig): TypesetConfig {
  const result = structuredClone(config);
  const cover = result.coverTheme;
  if (!cover) return result;
  result.algorithm = { ...result.algorithm, ...cover.layout, safeArea: { ...cover.layout.safeArea } };
  result.theme = {
    ...result.theme, textColor: cover.colors.text, headingColor: cover.colors.text,
    accentColor: cover.colors.accent, quoteColor: cover.colors.muted,
    captionColor: cover.colors.muted, watermarkColor: cover.colors.muted,
  };
  return result;
}

// 本次修改的一组为准，回写另一组，避免另一面板覆盖刚调整的值。
export function updateHostTemplateConfig(config: TypesetConfig, patch: HostTemplatePatch): TypesetConfig {
  const normalized = resolveHostTemplateConfig(config);
  const result = {
    ...normalized, ...structuredClone(patch),
    algorithm: { ...normalized.algorithm, ...patch.algorithm },
    theme: { ...normalized.theme, ...patch.theme },
  };
  const cover = result.coverTheme;
  if (cover && patch.algorithm) {
    const { textAlign, verticalAlign, safeArea } = patch.algorithm;
    cover.layout = { ...cover.layout, ...(textAlign ? { textAlign } : {}), ...(verticalAlign ? { verticalAlign } : {}), ...(safeArea ? { safeArea: { ...safeArea } } : {}) };
  }
  if (cover && patch.theme) {
    const theme = patch.theme;
    cover.colors = {
      ...cover.colors,
      text: theme.headingColor ?? theme.textColor ?? cover.colors.text,
      accent: theme.accentColor ?? cover.colors.accent,
      muted: theme.watermarkColor ?? theme.captionColor ?? theme.quoteColor ?? cover.colors.muted,
    };
  }
  if (cover && patch.canvasStyle) syncCanvasStyle(result, patch.canvasStyle);
  return resolveHostTemplateConfig(result);
}

function syncCanvasStyle(config: TypesetConfig, style: CanvasStyle) {
  const cover = config.coverTheme!;
  if (style.fill) cover.background = { ...cover.background, fill: structuredClone(style.fill) };
  // 扩展花纹由 canvasStyle 绘制，旧 coverTheme 只承载其原有六种花纹。
  if (style.pattern && ["none", "lines", "grid", "dots", "rings", "burst"].includes(style.pattern.pattern)) {
    cover.decoration = { ...cover.decoration, ...style.pattern, pattern: style.pattern.pattern as typeof cover.decoration.pattern };
  }
}

export function changeHostTemplateSlot(config: TypesetConfig, slot: TemplateSlot): TypesetConfig {
  const aspectRatio = slot === "article_cover" ? "wechat-cover-2.35" : "longform-3-4";
  const safeArea = { ...getCanvasSpec(aspectRatio).defaultSafeArea };
  const result = updateHostTemplateConfig(config, { slot, aspectRatio, algorithm: { safeArea } });
  if (result.coverTheme) result.coverTheme.format = slot === "article_cover" ? "wechat-cover-split" : "poster-3-4";
  return result;
}
