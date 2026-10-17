import { expect, test } from "bun:test";
import { createCanvas } from "@napi-rs/canvas";
import { createArticleCoverConfig, DEFAULT_ARTICLE_COVER_CONTROLS } from "./article-cover";
import { drawPageToContext } from "./canvas-draw";
import { runTypeset } from "./engine";
import { changeHostTemplateSlot, resolveHostTemplateConfig, updateHostTemplateConfig } from "./host-template";
import { validateTypesetTemplateConfig } from "./validate-config";

function nativeCover() {
  const config = createArticleCoverConfig({ id: "11111111-1111-4111-8111-111111111111", name: "Host", controls: DEFAULT_ARTICLE_COVER_CONTROLS, assetId: "22222222-2222-4222-8222-222222222222" });
  config.algorithm.targetFillRatio = 0.8;
  config.coverTheme!.decoration.size = 56;
  config.images = [];
  return config;
}

test("host cover layout and colors reach the unchanged engine and drawing path", async () => {
  const source = nativeCover();
  source.coverTheme!.layout = { textAlign: "right", verticalAlign: "bottom", safeArea: { top: 80, right: 900, bottom: 100, left: 140 } };
  source.coverTheme!.colors = { text: "#bb1234", accent: "#12bb34", muted: "#1234bb" };
  const config = resolveHostTemplateConfig(source);
  const result = runTypeset({ markdown: "# Host", config, maxPages: 1 });
  const before = runTypeset({ markdown: "# Host", config: source, maxPages: 1 });
  expect(result.pages[0]!.lines[0]!.x).not.toBe(before.pages[0]!.lines[0]!.x);
  expect(result.pages[0]!.lines[0]!.y).toBeGreaterThan(before.pages[0]!.lines[0]!.y);
  const context = createCanvas(3350, 1000).getContext("2d");
  const colors: string[] = [];
  const drawText = context.fillText.bind(context);
  context.fillText = (...args: Parameters<typeof drawText>) => { colors.push(context.fillStyle as string); return drawText(...args); };
  await drawPageToContext(context, { page: result.pages[0]!, spec: result.canvasSpec, config, getImage: () => null });
  expect(colors).toContain("#bb1234");
  expect(source.algorithm.textAlign).toBe("left");
  const changed = updateHostTemplateConfig(config, { algorithm: { textAlign: "center", safeArea: { top: 60, right: 700, bottom: 90, left: 110 } }, theme: { headingColor: "#abcdef", accentColor: "#fedcba", captionColor: "#334455" } });
  expect(changed.coverTheme!.layout.textAlign).toBe("center");
  expect(changed.coverTheme!.layout.safeArea).toEqual(changed.algorithm.safeArea);
  expect(changed.coverTheme!.colors).toEqual({ text: "#abcdef", accent: "#fedcba", muted: "#334455" });
  expect(updateHostTemplateConfig(changed, { footerText: "Saved" }).theme.headingColor).toBe("#abcdef");
});

test("host slot transitions and true canvas dimensions remain valid", () => {
  let config = nativeCover();
  for (const slot of ["newspic_cover", "newspic_content", "article_cover"] as const) {
    config = changeHostTemplateSlot(config, slot);
    expect(validateTypesetTemplateConfig(config).slot).toBe(slot);
    expect(config.coverTheme!.layout.safeArea).toEqual(config.algorithm.safeArea);
    expect(config.coverTheme!.format).toBe(slot === "article_cover" ? "wechat-cover-split" : "poster-3-4");
  }
  const square = changeHostTemplateSlot(config, "newspic_content");
  square.aspectRatio = "square-1-1";
  square.algorithm.safeArea = { top: 0, bottom: 0, left: 550, right: 550 };
  square.coverTheme!.layout.safeArea = { ...square.algorithm.safeArea };
  expect(validateTypesetTemplateConfig(square).aspectRatio).toBe("square-1-1");
  square.aspectRatio = "wide-16-9";
  square.algorithm.safeArea = { top: 550, bottom: 550, left: 0, right: 0 };
  expect(() => validateTypesetTemplateConfig(square)).toThrow();
  const invalidCoverLayout = nativeCover(); invalidCoverLayout.coverTheme!.layout.safeArea = { top: 500, bottom: 500, left: 0, right: 0 };
  expect(() => validateTypesetTemplateConfig(invalidCoverLayout)).toThrow();
  expect(() => validateTypesetTemplateConfig({ ...nativeCover(), canvasStyle: { arbitrary: true } })).toThrow();
});

test("host background controls synchronize theme fill and supported decoration", () => {
  const config = updateHostTemplateConfig(nativeCover(), { canvasStyle: { fill: { type: "linear", angle: 45, stops: [{ color: "#ffffff", offset: 0 }, { color: "#000000", offset: 100 }] }, pattern: { pattern: "grid", color: "#112233", opacity: 0.2, size: 64 } } });
  expect(config.coverTheme!.background.fill).toEqual(config.canvasStyle!.fill!);
  expect(config.coverTheme!.decoration).toMatchObject(config.canvasStyle!.pattern!);
  expect(validateTypesetTemplateConfig(config)).toEqual(config);
});
