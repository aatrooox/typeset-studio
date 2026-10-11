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
