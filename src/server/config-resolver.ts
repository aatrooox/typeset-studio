import { getDefaultConfig } from "../core/engine";
import { applyTemplateImages } from "../core/template";
import type { FlowImage, TemplateSlot, TypesetConfig } from "../core/types";
import { findTemplateByKeyOrName, getDefaultTemplateId, getSlotDefaultTemplateId } from "./routes/templates";

export interface TypesetConfigRequest {
  templateId?: string;
  templateKey?: string;
  template?: string;
  slot?: TemplateSlot;
  route?: string;
  kind?: string;
  account?: string;
  config?: Omit<Partial<TypesetConfig>, "algorithm" | "theme" | "typography"> & {
    algorithm?: Partial<TypesetConfig["algorithm"]>;
    theme?: Partial<TypesetConfig["theme"]>;
    typography?: Partial<TypesetConfig["typography"]>;
  };
  images?: FlowImage[];
  templateImageOverrides?: Record<string, string>;
  preserveTemplateStyle?: boolean;
}

export interface ResolvedTypesetConfig {
  config: TypesetConfig;
  source: "explicit" | "slot-default" | "global-default" | "builtin";
  templateId?: string;
  templateName?: string;
  slot?: TemplateSlot;
  resources: Array<{ key: string; src: string }>;
}

function inferSlot(route?: string, kind?: string, aspectRatio?: string): TemplateSlot | undefined {
  if (route === "wechat-article" || kind === "article_cover" || aspectRatio === "wechat-cover-2.35") return "article_cover";
  if (route === "wechat-newspic") return kind === "content" || kind === "pages" ? "newspic_content" : "newspic_cover";
  if (kind === "cover") return "article_cover";
  return undefined;
}

/** 渲染保留原模板配置，实际素材与配置分开，兼容既有 result.config。 */
export function resolveTypesetRenderConfig(body: TypesetConfigRequest) {
  const targetKey = body.templateId || body.templateKey || body.template;
  let baseConfig: TypesetConfig | null = null;
  let source: ResolvedTypesetConfig["source"] = "builtin";
  if (targetKey) {
    baseConfig = findTemplateByKeyOrName(targetKey);
    if (!baseConfig) throw new RangeError(`Template '${targetKey}' not found`);
    source = "explicit";
  }
  const slot = body.slot || inferSlot(body.route, body.kind, body.config?.aspectRatio);
  if (!baseConfig && slot) {
    const id = getSlotDefaultTemplateId(slot, body.account || "default");
    if (id) baseConfig = findTemplateByKeyOrName(id);
    if (baseConfig) source = "slot-default";
  }
  if (!baseConfig) {
    const id = getDefaultTemplateId();
    if (id) baseConfig = findTemplateByKeyOrName(id);
    if (baseConfig) source = "global-default";
  }
  if (!baseConfig) baseConfig = getDefaultConfig(slot === "article_cover" || body.route === "wechat-article" ? "wechat-cover-2.35" : "longform-3-4");

  const overrides = body.preserveTemplateStyle && baseConfig.id ? {} : body.config;
  const config: TypesetConfig = {
    ...baseConfig, ...(overrides || {}),
    algorithm: { ...baseConfig.algorithm, ...overrides?.algorithm },
    theme: { ...baseConfig.theme, ...overrides?.theme },
    typography: { ...baseConfig.typography, ...overrides?.typography },
    chrome: { ...baseConfig.chrome, ...overrides?.chrome },
  };
  const images = applyTemplateImages(body.images || [], config.images, body.templateImageOverrides);
  return { config, images, source, templateId: baseConfig.id, templateName: baseConfig.name, slot };
}

/** 可信服务端只解析配置与依赖，不测量、绘制或下载资源。 */
export function resolveTypesetConfig(body: TypesetConfigRequest): ResolvedTypesetConfig {
  const { config, images, ...provenance } = resolveTypesetRenderConfig(body);
  const resources = images.map((image, index) => ({ key: `images.${index}`, src: image.src }));
  for (const key of ["background", "decoration"] as const) {
    const image = config.coverTheme?.[key].image;
    if (image) resources.push({ key: `coverTheme.${key}.image`, src: image.src });
  }
  return structuredClone({ config: { ...config, images }, ...provenance, resources });
}
