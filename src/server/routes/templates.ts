import { existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { Hono } from "hono";
import { getDefaultConfig } from "../../core/engine";
import { TemplateSlot, TypesetConfig } from "../../core/types";
import { resolveDataDir } from "../../core/data-dir";
import { validateTemplateAssets } from "../../core/template";
import { validateCanvasStyle } from "../../core/canvas-style";
import { CANVAS_PRESETS } from "../../core/canvas-presets";

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

export const BUILTIN_PRESETS: TypesetConfig[] = [
    {
      ...getDefaultConfig("wechat-cover-2.35"),
      id: "tpl_wechat_cover_minimal",
      name: "微信纯净大图封面 (3.35:1)",
      slot: "article_cover",
      algorithm: {
        ...getDefaultConfig("wechat-cover-2.35").algorithm,
        baseFontSize: 58,
        scaleRatio: 1.4,
        verticalAlign: "center",
        textAlign: "center",
      },
      theme: {
        bgColor: "#09090b",
        textColor: "#ffffff",
        headingColor: "#ffffff",
        accentColor: "#10b981",
        quoteColor: "#71717a",
        captionColor: "#71717a",
        watermarkColor: "#3f3f46",
        cardBg: "#18181b",
      },
      typography: {
        headingFont: "PingFang SC",
        bodyFont: "Songti SC",
      },
      footerText: "",
      watermarkText: "",
      chrome: {
        showHeader: false,
        showWatermark: false,
        showPageNumber: false,
        showFooter: false,
        showFooterDivider: false,
        showFooterText: false,
        showFillRatio: false,
      },
      images: [
        {
          id: "tpl_img_cover_bg",
          src: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80",
          alt: "封面装饰图",
          isAbsolute: true,
          x: 1350,
          y: 120,
          width: 880,
          height: 760,
          zIndex: 5,
          rotate: 0,
          opacity: 0.95,
          borderRadius: 24,
          layoutPreset: "custom",
        },
      ],
    },
    {
      ...getDefaultConfig("wechat-cover-2.35"),
      id: "tpl_wechat_cover_editorial",
      name: "微信杂志标封面 (3.35:1)",
      slot: "article_cover",
      algorithm: {
        ...getDefaultConfig("wechat-cover-2.35").algorithm,
        baseFontSize: 54,
        scaleRatio: 1.35,
        verticalAlign: "center",
        textAlign: "left",
      },
      theme: {
        bgColor: "#ffffff",
        textColor: "#111827",
        headingColor: "#000000",
        accentColor: "#059669",
        quoteColor: "#4b5563",
        captionColor: "#6b7280",
        watermarkColor: "#9ca3af",
        cardBg: "#f3f4f6",
      },
      typography: {
        headingFont: "PingFang SC",
        bodyFont: "Songti SC",
      },
      footerText: "",
      watermarkText: "SPECIAL EDITION · 专栏特辑",
      chrome: {
        showHeader: true,
        showWatermark: true,
        showPageNumber: false,
        showFooter: false,
        showFooterDivider: false,
        showFooterText: false,
        showFillRatio: false,
      },
      images: [
        {
          id: "tpl_img_editorial_card",
          src: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&auto=format&fit=crop&q=80",
          alt: "杂志插图",
          isAbsolute: true,
          x: 1400,
          y: 140,
          width: 820,
          height: 720,
          zIndex: 15,
          rotate: -2,
          opacity: 1,
          borderRadius: 20,
          layoutPreset: "custom",
        },
      ],
    },
    {
      ...getDefaultConfig("longform-3-4"),
      id: "tpl_newspic_poster_cover",
      name: "贴图封面海报 (3:4)",
      slot: "newspic_cover",
      algorithm: {
        ...getDefaultConfig("longform-3-4").algorithm,
        baseFontSize: 56,
        scaleRatio: 1.35,
        verticalAlign: "center",
        textAlign: "center",
      },
      theme: {
        bgColor: "#121212",
        textColor: "#ffffff",
        headingColor: "#ffffff",
        accentColor: "#f59e0b",
        quoteColor: "#a3a3a3",
        captionColor: "#737373",
        watermarkColor: "#525252",
        cardBg: "#1c1c1c",
      },
      typography: {
        headingFont: "PingFang SC",
        bodyFont: "Songti SC",
      },
      footerText: "Typeset Studio · 贴图精选",
      watermarkText: "FEATURED NEWSPIC",
      chrome: {
        showHeader: true,
        showWatermark: true,
        showPageNumber: false,
        showFooter: true,
        showFooterDivider: false,
        showFooterText: true,
        showFillRatio: false,
      },
      images: [
        {
          id: "tpl_img_poster_bg",
          src: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80",
          alt: "海报主图",
          isAbsolute: true,
          x: 100,
          y: 780,
          width: 1000,
          height: 650,
          zIndex: 10,
          rotate: 0,
          opacity: 1,
          borderRadius: 20,
          layoutPreset: "custom",
        },
      ],
    },
    {
      ...getDefaultConfig("longform-3-4"),
      id: "tpl_longform_paper_sage",
      name: "纸白典雅长图文 (3:4)",
      slot: "newspic_content",
      theme: {
        bgColor: "#fbfcfb",
        textColor: "#1c1917",
        headingColor: "#0c0a09",
        accentColor: "#047857",
        quoteColor: "#44403c",
        captionColor: "#78716c",
        watermarkColor: "#a8a29e",
        cardBg: "#ffffff",
      },
      typography: {
        headingFont: "Songti SC",
        bodyFont: "Songti SC",
      },
      footerText: "Typeset Studio · 纯算法空间排版",
      watermarkText: "@ANTIGRAVITY",
      chrome: {
        showHeader: true,
        showWatermark: true,
        showPageNumber: true,
        showFooter: true,
        showFooterDivider: true,
        showFooterText: true,
        showFillRatio: false,
      },
    },
    {
      ...getDefaultConfig("square-1-1"),
      id: "tpl_square_quote_card",
      name: "金句留白方卡 (1:1)",
      algorithm: {
        ...getDefaultConfig("square-1-1").algorithm,
        baseFontSize: 50,
        scaleRatio: 1.3,
        verticalAlign: "center",
        textAlign: "center",
      },
      theme: {
        bgColor: "#18181b",
        textColor: "#fafafa",
        headingColor: "#ffffff",
        accentColor: "#f59e0b",
        quoteColor: "#d4d4d8",
        captionColor: "#a1a1aa",
        watermarkColor: "#71717a",
        cardBg: "#27272a",
      },
      typography: {
        headingFont: "PingFang SC",
        bodyFont: "Kaiti SC",
      },
      footerText: "",
      watermarkText: "",
      chrome: {
        showHeader: false,
        showWatermark: false,
        showPageNumber: false,
        showFooter: false,
        showFooterDivider: false,
        showFooterText: false,
        showFillRatio: false,
      },
    },
    {
      ...getDefaultConfig("wide-16-9"),
      id: "tpl_wide_tech_banner",
      name: "极简技术宽屏 (16:9)",
      algorithm: {
        ...getDefaultConfig("wide-16-9").algorithm,
        baseFontSize: 46,
        scaleRatio: 1.3,
        verticalAlign: "center",
        textAlign: "left",
      },
      theme: {
        bgColor: "#09090b",
        textColor: "#f4f4f5",
        headingColor: "#ffffff",
        accentColor: "#3b82f6",
        quoteColor: "#a1a1aa",
        captionColor: "#71717a",
        watermarkColor: "#52525b",
        cardBg: "#18181b",
      },
      typography: {
        headingFont: "PingFang SC",
        bodyFont: "SourceHanSansSC, sans-serif",
      },
      footerText: "TECH ENGINEERING INSIGHTS",
      watermarkText: "DEV // ARCHITECTURE",
      chrome: {
        showHeader: true,
        showWatermark: true,
        showPageNumber: false,
        showFooter: true,
        showFooterDivider: false,
        showFooterText: true,
        showFillRatio: false,
      },
    },
    {
      ...getDefaultConfig("longform-3-4"),
      id: "tpl_longform_vintage_news",
      name: "复古报刊多图 (3:4)",
      slot: "newspic_content",
      algorithm: {
        ...getDefaultConfig("longform-3-4").algorithm,
        baseFontSize: 38,
        scaleRatio: 1.25,
        verticalAlign: "top",
        textAlign: "left",
      },
      theme: {
        bgColor: "#f7f4ee",
        textColor: "#262320",
        headingColor: "#141210",
        accentColor: "#991b1b",
        quoteColor: "#57534e",
        captionColor: "#78716c",
        watermarkColor: "#a8a29e",
        cardBg: "#eee9df",
      },
      typography: {
        headingFont: "SourceHanSerifSC, serif",
        bodyFont: "SourceHanSerifSC, serif",
      },
      footerText: "WEEKLY REPORT · 观察与沉淀",
      watermarkText: "VOL. 42 // THE CHRONICLE",
      chrome: {
        showHeader: true,
        showWatermark: true,
        showPageNumber: true,
        showFooter: true,
        showFooterDivider: true,
        showFooterText: true,
        showFillRatio: false,
      },
    },
    ...CANVAS_PRESETS,
  ];

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
