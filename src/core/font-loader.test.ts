import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { app } from "../server/index";
import { readFontFamilyName, registerServerFonts, scanLocalFonts } from "./font-loader";

describe("Project-Local Fonts Scanning & Registration", () => {
  const isolatedCwd = join(process.cwd(), "tmp", `test-fonts-${Date.now()}`);
  const isolatedFontsDir = join(isolatedCwd, "public", "fonts");

  beforeAll(() => {
    mkdirSync(isolatedFontsDir, { recursive: true });
  });

  afterAll(() => {
    if (existsSync(isolatedCwd)) {
      rmSync(isolatedCwd, { recursive: true, force: true });
    }
  });

  it("safely handles empty or non-font directory without crashing", () => {
    const fonts = scanLocalFonts({ cwd: isolatedCwd, refresh: true });
    expect(Array.isArray(fonts)).toBe(true);
  });

  it("exposes /api/fonts endpoint via Hono server", async () => {
    const res = await app.request("/api/fonts");
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(typeof data.count).toBe("number");
    expect(Array.isArray(data.fonts)).toBe(true);
  });

  it("recognizes fonts.json manifest metadata when present", () => {
    const dummyFontPath = join(isolatedFontsDir, "MockCustomFont.ttf");
    const manifestPath = join(isolatedFontsDir, "fonts.json");

    writeFileSync(dummyFontPath, "dummy-font-content");
    writeFileSync(
      manifestPath,
      JSON.stringify({
        "MockCustomFont.ttf": {
          family: "Mock Custom Font",
          label: "模拟测试字体 (自定义标签)",
        },
      }),
    );

    const fonts = scanLocalFonts({ cwd: isolatedCwd, refresh: true });
    const found = fonts.find((f) => f.filename === "MockCustomFont.ttf");

    expect(found).toBeDefined();
    expect(found?.family).toBe("Mock Custom Font");
    expect(found?.label).toBe("模拟测试字体 (自定义标签)");
    expect(found?.url).toBe("/fonts/MockCustomFont.ttf");
  });
});
