import { describe, expect, it } from "bun:test";
import { getOrGenerateAdminKey } from "../auth";
import { app } from "../index";
import { getSlotDefaultTemplateId, setSlotDefaultTemplateId } from "./templates";

const adminKey = getOrGenerateAdminKey();
const authHeaders = {
  "Content-Type": "application/json",
  "x-admin-key": adminKey,
};

describe("Template Slots & Fallback Compatibility", () => {
  it("provides builtin defaults for all 3 canonical slots when unconfigured", () => {
    expect(getSlotDefaultTemplateId("article_cover")).toBe("tpl_wechat_cover_minimal");
    expect(getSlotDefaultTemplateId("newspic_cover")).toBe("tpl_newspic_poster_cover");
    expect(getSlotDefaultTemplateId("newspic_content")).toBe("tpl_longform_paper_sage");
  });

  it("supports assigning different template defaults per slot and per account", () => {
    setSlotDefaultTemplateId("article_cover", "tpl_wechat_cover_editorial", "ancientone");
    expect(getSlotDefaultTemplateId("article_cover", "ancientone")).toBe("tpl_wechat_cover_editorial");
    // default account remains unaffected or uses default
    expect(getSlotDefaultTemplateId("article_cover", "default")).toBe("tpl_wechat_cover_minimal");
  });

  it("renders wechat-article route by auto-resolving article_cover slot", async () => {
    const res = await app.request("/api/render", {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        route: "wechat-article",
        title: "微信文章封面标题",
      }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.slot).toBe("article_cover");
    expect(data.result.canvasSpec.id).toBe("wechat-cover-2.35");
  });

  it("renders wechat-newspic content route by auto-resolving newspic_content slot", async () => {
    const res = await app.request("/api/render", {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        route: "wechat-newspic",
        kind: "content",
        markdown: "# 贴图内容测试\n这是贴图长图文正文",
      }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.slot).toBe("newspic_content");
    expect(data.result.canvasSpec.id).toBe("longform-3-4");
  });

  it("renders wechat-newspic cover route by auto-resolving newspic_cover slot", async () => {
    const res = await app.request("/api/render", {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        route: "wechat-newspic",
        kind: "cover",
        title: "贴图封面",
      }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.slot).toBe("newspic_cover");
    expect(data.result.canvasSpec.id).toBe("longform-3-4");
  });

  it("falls back gracefully without crashing when called with zero template or slot params", async () => {
    const res = await app.request("/api/render", {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        text: "没有任何模板配置时的纯正文输入",
      }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.result.pageCount).toBeGreaterThanOrEqual(1);
  });
});

// 鉴权、模板覆盖和数据目录共用隔离测试环境。
describe("Storage and authentication regressions", () => {
  it("rejects forged local Hosts and never returns a remote key", async () => {
    for (const host of ["localhost.attacker.example", "localhost", "127.0.0.1"]) {
      const response = await app.request("http://remote.example/api/templates", { headers: { host } });
      expect(response.status).toBe(401);
      const keyResponse = await app.request("http://remote.example/api/auth/current-key", { headers: { host } });
      expect(keyResponse.status).toBe(403);
      expect(await keyResponse.text()).not.toContain(adminKey);
    }
    const untrustedOrigin = await app.request("http://localhost/api/auth/current-key", {
      headers: { host: "localhost", origin: "https://attacker.example" },
    }, { peerAddress: "127.0.0.1" });
    expect(untrustedOrigin.status).toBe(403);
    const local = await app.request("http://localhost/api/auth/current-key", {
      headers: { host: "localhost", origin: "http://localhost:5173" },
    }, { peerAddress: "127.0.0.1" });
    expect(local.status).toBe(200);
  });

  it("rejects traversal for template CRUD and resolver paths", async () => {
    const template = { ...(await (await app.request("/api/templates/tpl_wechat_cover_minimal", { headers: authHeaders })).json()).template, id: "../escaped" };
    const save = await app.request("/api/templates", {
      method: "POST", headers: authHeaders, body: JSON.stringify(template),
    });
    expect(save.status).toBe(400);
    for (const method of ["GET", "DELETE"]) {
      const response = await app.request("/api/templates/..%2Fescaped", { method, headers: authHeaders });
      expect(response.status).toBe(400);
    }
    const resolve = await app.request("/api/templates/resolve/..%2Fescaped", { headers: authHeaders });
    expect(resolve.status).toBe(404);
  });

  it("uses saved builtin overrides and does not recreate deleted templates", async () => {
    const id = "tpl_longform_vintage_news";
    const original = (await (await app.request(`/api/templates/${id}`, { headers: authHeaders })).json()).template;
    try {
      const save = await app.request("/api/templates", {
        method: "POST", headers: authHeaders,
        body: JSON.stringify({ ...original, footerText: "磁盘覆盖" }),
      });
      expect(save.status).toBe(200);
      const resolved = await (await app.request(`/api/templates/resolve/${id}`, { headers: authHeaders })).json();
      expect(resolved.template.footerText).toBe("磁盘覆盖");
      const deleted = await app.request(`/api/templates/${id}`, { method: "DELETE", headers: authHeaders });
      expect(deleted.status).toBe(200);
      expect((await app.request(`/api/templates/${id}`, { headers: authHeaders })).status).toBe(404);
      expect((await app.request(`/api/templates/resolve/${id}`, { headers: authHeaders })).status).toBe(404);
    } finally {
      await app.request("/api/templates", { method: "POST", headers: authHeaders, body: JSON.stringify(original) });
    }
  });

  it("serves uploaded files from the configured data directory", async () => {
    const data = new FormData();
    data.append("file", new File(["uploaded-image-bytes"], "test.png", { type: "image/png" }));
    const response = await app.request("/api/upload", { method: "POST", headers: { "x-admin-key": adminKey }, body: data });
    expect(response.status).toBe(200);
    const uploaded = await response.json();
    const fetched = await app.request(uploaded.url);
    expect(fetched.status).toBe(200);
    expect(await fetched.text()).toBe("uploaded-image-bytes");
  });
});

describe("Fixed asset rendering API", () => {
  it("preserves template styles, validates identifiers, and fails for missing fixed files", async () => {
    const { getDefaultConfig } = await import("../../core/engine");
    const id = "fixed_asset_api_test";
    const template = { ...getDefaultConfig(), id, images: [
      { id: "bg", src: "/missing-background.png", alt: "", isAbsolute: true, templateAssetKey: "background", zIndex: 0 },
    ] };
    try {
      expect((await app.request("/api/templates", { method: "POST", headers: authHeaders, body: JSON.stringify(template) })).status).toBe(200);
      const response = await app.request("/api/render", { method: "POST", headers: authHeaders, body: JSON.stringify({
        template: id, markdown: "正文", preserveTemplateStyle: true,
        config: { theme: { bgColor: "#123456" }, typography: { bodyFont: "Other Font" } },
      }) });
      const rendered = await response.json();
      expect(rendered.result.config.theme.bgColor).toBe(template.theme.bgColor);
      expect(rendered.result.config.typography.bodyFont).toBe(template.typography.bodyFont);
      expect(rendered.result.pages[0].images[0].templateAssetKey).toBe("background");
      const missing = await app.request("/api/render/export", { method: "POST", headers: authHeaders, body: JSON.stringify({ template: id, markdown: "正文" }) });
      expect(missing.status).toBe(422);
      expect((await missing.json()).error).toContain("background");
      const unknown = await app.request("/api/render", { method: "POST", headers: authHeaders, body: JSON.stringify({ template: id, templateImageOverrides: { unknown: "new.png" } }) });
      expect(unknown.status).toBe(400);
      const duplicate = await app.request("/api/templates", { method: "POST", headers: authHeaders, body: JSON.stringify({ ...template, images: [...template.images, { ...template.images[0], id: "bg2" }] }) });
      expect(duplicate.status).toBe(400);
    } finally {
      await app.request(`/api/templates/${id}`, { method: "DELETE", headers: authHeaders });
    }
  });
});

it("adds Canvas presets once, preserves edits and renders saved colors through the template API", async () => {
  const { CANVAS_PRESETS } = await import("../../core/canvas-presets");
  const list = await (await app.request("/api/templates", { headers: authHeaders })).json();
  for (const preset of CANVAS_PRESETS) expect(list.templates.some((template: { id: string }) => template.id === preset.id)).toBe(true);
  const preset = CANVAS_PRESETS[0];
  try {
    const custom = { ...preset, canvasStyle: { ...preset.canvasStyle, fill: { type: "solid", color: "#123456" } } };
    expect((await app.request("/api/templates", { method: "POST", headers: authHeaders, body: JSON.stringify(custom) })).status).toBe(200);
    const loaded = await (await app.request(`/api/templates/${preset.id}`, { headers: authHeaders })).json();
    expect(loaded.template.canvasStyle.fill.color).toBe("#123456");
    const rendered = await (await app.request("/api/render", { method: "POST", headers: authHeaders, body: JSON.stringify({ template: preset.id, markdown: "# 自定义背景", preserveTemplateStyle: true, config: { canvasStyle: { fill: { type: "solid", color: "#ffffff" } } } }) })).json();
    expect(rendered.result.config.canvasStyle.fill.color).toBe("#123456");
    const invalid = await app.request("/api/templates", { method: "POST", headers: authHeaders, body: JSON.stringify({ ...custom, canvasStyle: { pattern: { pattern: "grid", color: "#123456", opacity: 1, size: 0 } } }) });
    expect(invalid.status).toBe(400);
    await app.request(`/api/templates/${preset.id}`, { method: "DELETE", headers: authHeaders });
    const again = await (await app.request("/api/templates", { headers: authHeaders })).json();
    expect(again.templates.some((template: { id: string }) => template.id === preset.id)).toBe(false);
  } finally {
    await app.request("/api/templates", { method: "POST", headers: authHeaders, body: JSON.stringify(preset) });
  }
});
