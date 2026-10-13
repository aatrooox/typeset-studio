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

  it("decodes Unicode SFNT family records without modifying the source", () => {
    const family = "测试字体";
    const name = Buffer.from(family, "utf16le").swap16();
    const fixture = Buffer.alloc(46 + name.length);
    fixture.writeUInt32BE(0x10000, 0);
    fixture.writeUInt16BE(1, 4);
    fixture.write("name", 12);
    fixture.writeUInt32BE(28, 20);
    fixture.writeUInt16BE(1, 30);
    fixture.writeUInt16BE(18, 32);
    fixture.writeUInt16BE(3, 34);
    fixture.writeUInt16BE(16, 40);
    fixture.writeUInt16BE(name.length, 42);
    name.copy(fixture, 46);
    const path = join(isolatedFontsDir, "Unicode.ttf");
    writeFileSync(path, fixture);
    expect(readFontFamilyName(path)).toBe(family);
    expect(readFontFamilyName(path)).toBe(family);
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
