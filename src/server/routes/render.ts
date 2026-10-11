import { Hono } from "hono";
import { getDefaultConfig, runTypeset } from "../../core/engine";
import { applyTemplateImages } from "../../core/template";
import { FlowImage, TemplateSlot, TypesetConfig } from "../../core/types";
import {
  findTemplateByKeyOrName,
  getDefaultTemplateId,
  getSlotDefaultTemplateId,
} from "./templates";

export const renderRouter = new Hono();

function inferSlot(route?: string, kind?: string, aspectRatio?: string): TemplateSlot | undefined {
  if (route === "wechat-article" || kind === "article_cover" || aspectRatio === "wechat-cover-2.35") {
    return "article_cover";
  }
  if (route === "wechat-newspic") {
    if (kind === "content" || kind === "pages") {
      return "newspic_content";
    }
    return "newspic_cover";
  }
  if (kind === "cover") {
    return "article_cover";
  }
  return undefined;
}

renderRouter.post("/", async (c) => {
  const body = await c.req.json<{
    templateId?: string;
    templateKey?: string;
    template?: string;
    slot?: TemplateSlot;
    route?: string;
    kind?: string;
    account?: string;
    title?: string;
    markdown?: string;
    text?: string;
    images?: FlowImage[];
    highlightWords?: string[];
    config?: Partial<TypesetConfig>;
  }>();

  // If title was passed and no markdown, construct standard header
  let markdown = body.markdown || body.text;
  if (!markdown && body.title) {
    markdown = `# ${body.title}`;
  }
  if (!markdown) {
    markdown = "# 示例标题\n正文内容";
  }

  // 1. Resolve template by explicit templateId / templateKey / template
  const targetKey = body.templateId || body.templateKey || body.template;
  let baseConfig: TypesetConfig | null = null;
  if (targetKey) {
    baseConfig = findTemplateByKeyOrName(targetKey);
  }

  // 2. Resolve by slot and account
  const resolvedSlot = body.slot || inferSlot(body.route, body.kind, body.config?.aspectRatio);
  if (!baseConfig && resolvedSlot) {
    const slotDefaultId = getSlotDefaultTemplateId(resolvedSlot, body.account || "default");
    if (slotDefaultId) {
      baseConfig = findTemplateByKeyOrName(slotDefaultId);
    }
  }

  // 3. Fallback to global default if any
  if (!baseConfig) {
    const defaultId = getDefaultTemplateId();
    if (defaultId) {
      baseConfig = findTemplateByKeyOrName(defaultId);
    }
  }

  // 4. Native algorithmic fallback if no templates exist
  if (!baseConfig) {
    const isCover = resolvedSlot === "article_cover" || body.route === "wechat-article";
    baseConfig = getDefaultConfig(isCover ? "wechat-cover-2.35" : "longform-3-4");
  }

  // Merge any config overrides
  const effectiveConfig: TypesetConfig = {
    ...baseConfig,
    ...(body.config || {}),
    algorithm: {
      ...baseConfig.algorithm,
      ...(body.config?.algorithm || {}),
    },
    theme: {
      ...baseConfig.theme,
      ...(body.config?.theme || {}),
    },
    typography: {
      ...baseConfig.typography,
      ...(body.config?.typography || {}),
    },
  };

  const inputImages = body.images;
  const resolvedImages = inputImages && inputImages.length > 0
    ? (effectiveConfig.images ? applyTemplateImages(inputImages, effectiveConfig.images) : inputImages)
    : (effectiveConfig.images || []);

  const result = runTypeset({
    markdown,
    images: resolvedImages,
    config: effectiveConfig,
    highlightWords: body.highlightWords || [],
  });

  return c.json({
    ok: true,
    templateId: baseConfig.id,
    templateName: baseConfig.name,
    slot: resolvedSlot,
    result,
  });
});
