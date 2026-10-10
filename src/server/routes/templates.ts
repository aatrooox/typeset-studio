import { existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from "fs";
import { join } from "path";
import { Hono } from "hono";
import { getDefaultConfig } from "../../core/engine";
import { TypesetConfig } from "../../core/types";

const TEMPLATES_DIR = join(process.cwd(), "data", "templates");

function ensureTemplatesDir(): void {
  if (!existsSync(TEMPLATES_DIR)) {
    mkdirSync(TEMPLATES_DIR, { recursive: true });
    seedDefaultTemplates();
  }
}

function seedDefaultTemplates(): void {
  const presets: TypesetConfig[] = [
    {
      ...getDefaultConfig("wechat-cover-2.35"),
      id: "tpl_wechat_cover_editorial",
      name: "微信大字质感封面 (2.35:1)",
      theme: {
        bgColor: "#0d0d0d",
        textColor: "#f5f5f5",
        accentColor: "#00e676",
        quoteColor: "#a3a3a3",
        captionColor: "#737373",
        watermarkColor: "#525252",
        cardBg: "#171717",
      },
    },
    {
      ...getDefaultConfig("longform-3-4"),
      id: "tpl_longform_paper_sage",
      name: "纸白典雅长图文 (3:4)",
      theme: {
        bgColor: "#f9fcfa",
        textColor: "#22201d",
        accentColor: "#1d4f39",
        quoteColor: "#474038",
        captionColor: "#6a6257",
        watermarkColor: "#8c857b",
        cardBg: "#ffffff",
      },
    },
    {
      ...getDefaultConfig("wide-16-9"),
      id: "tpl_wide_tech_banner",
      name: "极简技术宽屏 (16:9)",
      theme: {
        bgColor: "#09090b",
        textColor: "#fafafa",
        accentColor: "#3b82f6",
        quoteColor: "#a1a1aa",
        captionColor: "#71717a",
        watermarkColor: "#52525b",
        cardBg: "#18181b",
      },
    },
    {
      ...getDefaultConfig("square-1-1"),
      id: "tpl_square_quote_card",
      name: "金句留白方版 (1:1)",
      theme: {
        bgColor: "#18181b",
        textColor: "#ffffff",
        accentColor: "#f59e0b",
        quoteColor: "#d4d4d8",
        captionColor: "#a1a1aa",
        watermarkColor: "#71717a",
        cardBg: "#27272a",
      },
    },
  ];

  for (const preset of presets) {
    const filePath = join(TEMPLATES_DIR, `${preset.id}.json`);
    writeFileSync(filePath, JSON.stringify(preset, null, 2), "utf-8");
  }
}

export const templatesRouter = new Hono();

// List all templates
templatesRouter.get("/", (c) => {
  ensureTemplatesDir();
  const files = readdirSync(TEMPLATES_DIR).filter((f) => f.endsWith(".json"));
  const templates: TypesetConfig[] = [];

  for (const file of files) {
    try {
      const content = readFileSync(join(TEMPLATES_DIR, file), "utf-8");
      const parsed = JSON.parse(content);
      templates.push(parsed);
    } catch {
      // Ignore corrupted files
    }
  }

  return c.json({ ok: true, templates });
});

// Get a template by id
templatesRouter.get("/:id", (c) => {
  ensureTemplatesDir();
  const id = c.req.param("id");
  const filePath = join(TEMPLATES_DIR, `${id}.json`);

  if (!existsSync(filePath)) {
    return c.json({ ok: false, error: "Template not found" }, 404);
  }

  const content = readFileSync(filePath, "utf-8");
  return c.json({ ok: true, template: JSON.parse(content) });
});

// Save or update a template
templatesRouter.post("/", async (c) => {
  ensureTemplatesDir();
  const body = await c.req.json<TypesetConfig>();

  if (!body.name) {
    return c.json({ ok: false, error: "Template name is required" }, 400);
  }

  const id = body.id || `tpl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const templateToSave: TypesetConfig = {
    ...body,
    id,
  };

  const filePath = join(TEMPLATES_DIR, `${id}.json`);
  writeFileSync(filePath, JSON.stringify(templateToSave, null, 2), "utf-8");

  return c.json({ ok: true, template: templateToSave });
});

// Delete a template
templatesRouter.delete("/:id", (c) => {
  ensureTemplatesDir();
  const id = c.req.param("id");
  const filePath = join(TEMPLATES_DIR, `${id}.json`);

  if (existsSync(filePath)) {
    unlinkSync(filePath);
    return c.json({ ok: true, message: "Template deleted" });
  }

  return c.json({ ok: false, error: "Template not found" }, 404);
});
