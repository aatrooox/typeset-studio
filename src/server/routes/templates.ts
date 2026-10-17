import { existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { Hono } from "hono";
import { getDefaultConfig } from "../../core/engine";
import { TemplateSlot, TypesetConfig } from "../../core/types";
import { resolveDataDir } from "../../core/data-dir";
import { validateTemplateAssets } from "../../core/template";
import { validateCanvasStyle } from "../../core/canvas-style";
import { CANVAS_PRESETS } from "../../core/canvas-presets";
import { BUILTIN_PRESETS } from "../../core/presets";
export { BUILTIN_PRESETS } from "../../core/presets";

export { resolveDataDir } from "../../core/data-dir";

const TEMPLATES_DIR = join(resolveDataDir(), "templates");

function ensureTemplatesDir(): void {
  if (!existsSync(TEMPLATES_DIR)) {
    try {
      mkdirSync(TEMPLATES_DIR, { recursive: true });
    } catch {
      // Ignore write errors in read-only environments
    }
  }
  const seedMarker = join(TEMPLATES_DIR, ".initialized");
  if (!existsSync(seedMarker)) {
    seedDefaultTemplates();
    try { writeFileSync(seedMarker, "1"); } catch { /* 只读安装目录保留读取能力。 */ }
  }
  // 新预设仅补充一次，不覆盖已编辑模板，也不重新生成用户删除的预设。
  const canvasMarker = join(TEMPLATES_DIR, ".canvas-presets-v1");
  if (!existsSync(canvasMarker)) {
    try {
      for (const preset of CANVAS_PRESETS) {
        const path = join(TEMPLATES_DIR, `${preset.id}.json`);
        if (!existsSync(path)) writeFileSync(path, JSON.stringify(preset, null, 2), "utf-8");
      }
      writeFileSync(canvasMarker, "1");
    } catch { /* 只读安装目录继续使用现有模板。 */ }
  }
}


function seedDefaultTemplates(): void {
  if (!existsSync(TEMPLATES_DIR)) return;
  for (const preset of BUILTIN_PRESETS) {
    const filePath = join(TEMPLATES_DIR, `${preset.id}.json`);
    if (!existsSync(filePath)) {
      try {
        writeFileSync(filePath, JSON.stringify(preset, null, 2), "utf-8");
      } catch {
        // Ignore write failures in package directories
      }
    }
  }
}

const DEFAULT_SETTINGS_PATH = join(resolveDataDir(), "default-template.json");

export const BUILTIN_SLOT_DEFAULTS: Record<TemplateSlot, string> = {
  article_cover: "tpl_wechat_cover_minimal",
  newspic_cover: "tpl_newspic_poster_cover",
  newspic_content: "tpl_longform_paper_sage",
};

export function getSlotDefaultTemplateId(slot: TemplateSlot, account = "default"): string {
  if (existsSync(DEFAULT_SETTINGS_PATH)) {
    try {
      const data = JSON.parse(readFileSync(DEFAULT_SETTINGS_PATH, "utf-8"));
      if (account && data.accounts?.[account]?.[slot]) {
        return data.accounts[account][slot];
      }
      if (data.slots?.[slot]) {
        return data.slots[slot];
      }
    } catch {
      // ignore
    }
  }
  return BUILTIN_SLOT_DEFAULTS[slot] || "tpl_wechat_cover_minimal";
}

export function setSlotDefaultTemplateId(slot: TemplateSlot, templateId: string, account = "default"): void {
  const dir = dirname(DEFAULT_SETTINGS_PATH);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  let current: any = { slots: { ...BUILTIN_SLOT_DEFAULTS }, accounts: {} };
  if (existsSync(DEFAULT_SETTINGS_PATH)) {
    try {
      current = JSON.parse(readFileSync(DEFAULT_SETTINGS_PATH, "utf-8"));
    } catch {
      // ignore
    }
  }
  if (!current.slots) current.slots = { ...BUILTIN_SLOT_DEFAULTS };
  if (!current.accounts) current.accounts = {};

  if (!account || account === "default") {
    current.slots[slot] = templateId;
  } else {
    if (!current.accounts[account]) current.accounts[account] = {};
    current.accounts[account][slot] = templateId;
  }
  writeFileSync(DEFAULT_SETTINGS_PATH, JSON.stringify(current, null, 2), "utf-8");
}

export function getDefaultTemplateId(): string | null {
  if (existsSync(DEFAULT_SETTINGS_PATH)) {
    try {
      const data = JSON.parse(readFileSync(DEFAULT_SETTINGS_PATH, "utf-8"));
      return data.defaultTemplateId || data.slots?.article_cover || null;
    } catch {
      return null;
    }
  }
  return BUILTIN_SLOT_DEFAULTS.article_cover;
}

export function setDefaultTemplateId(id: string): void {
  const dir = dirname(DEFAULT_SETTINGS_PATH);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  let current: any = { slots: { ...BUILTIN_SLOT_DEFAULTS }, accounts: {} };
  if (existsSync(DEFAULT_SETTINGS_PATH)) {
    try {
      current = JSON.parse(readFileSync(DEFAULT_SETTINGS_PATH, "utf-8"));
    } catch {
      // ignore
    }
  }
  current.defaultTemplateId = id;
  writeFileSync(DEFAULT_SETTINGS_PATH, JSON.stringify(current, null, 2), "utf-8");
}

export function findTemplateByKeyOrName(key: string): TypesetConfig | null {
  const lowerKey = key.trim().toLowerCase();

  if (!lowerKey) return null;
  ensureTemplatesDir();
  if (!existsSync(TEMPLATES_DIR)) return BUILTIN_PRESETS.find((p) =>
    p.id?.toLowerCase() === lowerKey || p.name.toLowerCase() === lowerKey) ?? null;

  const directPath = templatePath(key);
  if (directPath && existsSync(directPath)) {
    try {
      return JSON.parse(readFileSync(directPath, "utf-8"));
    } catch {
      // continue
    }
  }

  // Scan all templates on disk
  const files = readdirSync(TEMPLATES_DIR).filter((f) => f.endsWith(".json"));

  const templates: TypesetConfig[] = [];
  for (const file of files) {
    try {
      const content = readFileSync(join(TEMPLATES_DIR, file), "utf-8");
      const tpl = JSON.parse(content) as TypesetConfig;
      if (tpl.id?.toLowerCase() === lowerKey || tpl.name.toLowerCase() === lowerKey) {
        return tpl;
      }
      templates.push(tpl);
    } catch {
      // ignore
    }
  }

  // 精确匹配优先，名称模糊匹配复用已读取的模板。
  return templates.find((tpl) => tpl.name.toLowerCase().includes(lowerKey)) ?? null;
}

// 模板标识只用作文件名，名称查询继续支持中文和模糊匹配。
function templatePath(id: string): string | null {
  return /^[a-zA-Z0-9_-]+$/.test(id) ? join(TEMPLATES_DIR, `${id}.json`) : null;
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

// Get slots configuration (article_cover, newspic_cover, newspic_content)
templatesRouter.get("/slots", (c) => {
  ensureTemplatesDir();
  const account = c.req.query("account") || "default";
  const articleCoverId = getSlotDefaultTemplateId("article_cover", account);
  const newspicCoverId = getSlotDefaultTemplateId("newspic_cover", account);
  const newspicContentId = getSlotDefaultTemplateId("newspic_content", account);

  return c.json({
    ok: true,
    account,
    slots: {
      article_cover: {
        id: articleCoverId,
        template: findTemplateByKeyOrName(articleCoverId),
      },
      newspic_cover: {
        id: newspicCoverId,
        template: findTemplateByKeyOrName(newspicCoverId),
      },
      newspic_content: {
        id: newspicContentId,
        template: findTemplateByKeyOrName(newspicContentId),
      },
    },
  });
});

// Set slot default template
templatesRouter.post("/slots", async (c) => {
  ensureTemplatesDir();
  const body = await c.req.json<{
    slot: TemplateSlot;
    templateId: string;
    account?: string;
  }>();
  if (!body.slot || !body.templateId) {
    return c.json({ ok: false, error: "slot and templateId are required" }, 400);
  }
  const tpl = findTemplateByKeyOrName(body.templateId);
  if (!tpl) {
    return c.json({ ok: false, error: `Template '${body.templateId}' not found` }, 404);
  }
  const account = body.account || "default";
  setSlotDefaultTemplateId(body.slot, tpl.id || body.templateId, account);
  return c.json({
    ok: true,
    slot: body.slot,
    account,
    templateId: tpl.id || body.templateId,
    template: tpl,
  });
});

// Get default template (backwards compatibility)
templatesRouter.get("/default", (c) => {
  ensureTemplatesDir();
  const defaultId = getDefaultTemplateId();
  let template: TypesetConfig | null = null;
  if (defaultId) {
    template = findTemplateByKeyOrName(defaultId);
  }
  return c.json({ ok: true, defaultTemplateId: defaultId, template });
});

// Set default template (backwards compatibility)
templatesRouter.post("/default", async (c) => {
  ensureTemplatesDir();
  const body = await c.req.json<{ templateId?: string; templateKey?: string }>();
  const id = body.templateId || body.templateKey;
  if (!id) {
    return c.json({ ok: false, error: "templateId is required" }, 400);
  }
  const tpl = findTemplateByKeyOrName(id);
  if (!tpl) {
    return c.json({ ok: false, error: "Template not found" }, 404);
  }
  setDefaultTemplateId(tpl.id || id);
  return c.json({ ok: true, defaultTemplateId: tpl.id || id, template: tpl });
});

// Resolve template by key or name
templatesRouter.get("/resolve/:key", (c) => {
  ensureTemplatesDir();
  const key = c.req.param("key");
  const tpl = findTemplateByKeyOrName(key);
  if (!tpl) {
    return c.json({ ok: false, error: `Template matching '${key}' not found` }, 404);
  }
  return c.json({ ok: true, template: tpl });
});

// Get a template by id
templatesRouter.get("/:id", (c) => {
  ensureTemplatesDir();
  const id = c.req.param("id");
  const filePath = templatePath(id);
  if (!filePath) return c.json({ ok: false, error: "Invalid template id" }, 400);

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

  try {
    validateTemplateAssets(body.images);
    validateCanvasStyle(body.canvasStyle);
  } catch (error) {
    return c.json({ ok: false, error: error instanceof Error ? error.message : "无效的模板素材" }, 400);
  }

  const id = body.id || `tpl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const templateToSave: TypesetConfig = {
    ...body,
    id,
  };

  const filePath = templatePath(id);
  if (!filePath) return c.json({ ok: false, error: "Invalid template id" }, 400);
  writeFileSync(filePath, JSON.stringify(templateToSave, null, 2), "utf-8");

  return c.json({ ok: true, template: templateToSave });
});

// Delete a template
templatesRouter.delete("/:id", (c) => {
  ensureTemplatesDir();
  const id = c.req.param("id");
  const filePath = templatePath(id);
  if (!filePath) return c.json({ ok: false, error: "Invalid template id" }, 400);

  if (existsSync(filePath)) {
    unlinkSync(filePath);
    return c.json({ ok: true, message: "Template deleted" });
  }

  return c.json({ ok: false, error: "Template not found" }, 404);
});
