import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { app } from "../server/index";
import { readFontFamilyName, registerServerFonts, scanLocalFonts } from "./font-loader";

describe("Project-Local Fonts Scanning & Registration", () => {
  const testFontsDir = join(process.cwd(), "public", "fonts");

  beforeAll(() => {
    if (!existsSync(testFontsDir)) {
      mkdirSync(testFontsDir, { recursive: true });
    }
  });

  it("safely handles empty or non-font directory without crashing", () => {
    const fonts = scanLocalFonts({ refresh: true });
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
    const dummyFontPath = join(testFontsDir, "MockCustomFont.ttf");
    const manifestPath = join(testFontsDir, "fonts.json");

    try {
      // Write a small dummy file
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

      const fonts = scanLocalFonts({ refresh: true });
      const found = fonts.find((f) => f.filename === "MockCustomFont.ttf");

      expect(found).toBeDefined();
      expect(found?.family).toBe("Mock Custom Font");
      expect(found?.label).toBe("模拟测试字体 (自定义标签)");
      expect(found?.url).toBe("/fonts/MockCustomFont.ttf");
    } finally {
      // Clean up mock test files
      if (existsSync(dummyFontPath)) rmSync(dummyFontPath);
      if (existsSync(manifestPath)) rmSync(manifestPath);
      scanLocalFonts({ refresh: true });
    }
  });
});
