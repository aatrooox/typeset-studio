import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { Hono } from "hono";
import { getDefaultConfig, runTypeset } from "../../core/engine";
import { FlowImage, TypesetConfig } from "../../core/types";

const TEMPLATES_DIR = join(process.cwd(), "data", "templates");

export const renderRouter = new Hono();

renderRouter.post("/", async (c) => {
  const body = await c.req.json<{
    templateId?: string;
    markdown?: string;
    text?: string;
    images?: FlowImage[];
    highlightWords?: string[];
    config?: Partial<TypesetConfig>;
  }>();

  const markdown = body.markdown || body.text || "# 标题\n正文内容";
  let baseConfig: TypesetConfig = getDefaultConfig("longform-3-4");

  if (body.templateId) {
    const tplPath = join(TEMPLATES_DIR, `${body.templateId}.json`);
    if (existsSync(tplPath)) {
      try {
        baseConfig = JSON.parse(readFileSync(tplPath, "utf-8"));
      } catch {
        // fallback to default
      }
    }
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

  const result = runTypeset({
    markdown,
    images: body.images || [],
    config: effectiveConfig,
    highlightWords: body.highlightWords || [],
  });

  return c.json({
    ok: true,
    result,
  });
});
