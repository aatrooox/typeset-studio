import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, extname, join, resolve } from "node:path";

export interface LocalFontInfo {
  family: string;
  label: string;
  filename: string;
  path: string;
  url: string;
  format: "truetype" | "opentype" | "woff2" | "woff";
  fileSizeBytes: number;
}

/**
 * Parses OpenType / TrueType SFNT 'name' table to extract the font family name.
 * Supports platform 0 (Unicode), 1 (Macintosh), and 3 (Windows).
 */
export function readFontFamilyName(filePath: string): string | null {
  try {
    const buf = readFileSync(filePath);
    if (buf.length < 12) return null;

    // Check SFNT magic (0x00010000, 'OTTO', 'true', 'typ1')
    const numTables = buf.readUInt16BE(4);
    let nameTableOffset = 0;

    for (let i = 0; i < numTables; i++) {
      const offset = 12 + i * 16;
      if (offset + 16 > buf.length) break;
      const tag = buf.toString("utf8", offset, offset + 4);
      if (tag === "name") {
        nameTableOffset = buf.readUInt32BE(offset + 8);
        break;
      }
    }

    if (!nameTableOffset || nameTableOffset + 6 > buf.length) return null;

    const count = buf.readUInt16BE(nameTableOffset + 2);
    const stringOffset = nameTableOffset + buf.readUInt16BE(nameTableOffset + 4);
    let familyName: string | null = null;
    let preferredFamily: string | null = null;

    for (let i = 0; i < count; i++) {
      const recOffset = nameTableOffset + 6 + i * 12;
      if (recOffset + 12 > buf.length) break;

      const platformId = buf.readUInt16BE(recOffset);
      const nameId = buf.readUInt16BE(recOffset + 6);
      const length = buf.readUInt16BE(recOffset + 8);
      const strOffset = stringOffset + buf.readUInt16BE(recOffset + 10);

      if (strOffset + length > buf.length) continue;

      // nameID 1 = Font Family, nameID 16 = Typographic Family / Preferred Family
      if (nameId === 1 || nameId === 16) {
        let str = "";
        if (platformId === 0 || platformId === 3) {
          str = buf.toString("utf16be", strOffset, strOffset + length).trim();
        } else {
          str = buf.toString("utf8", strOffset, strOffset + length).trim();
        }

        // Filter out null-byte artefacts or corrupted strings
        str = str.replace(/\0/g, "").trim();
        if (str) {
          if (nameId === 16) preferredFamily = str;
          if (nameId === 1 && !familyName) familyName = str;
        }
      }
    }

    return preferredFamily || familyName || null;
  } catch {
    return null;
  }
}

const SUPPORTED_EXTS = new Set([".ttf", ".otf", ".woff2", ".woff"]);

const FORMAT_MAP: Record<string, LocalFontInfo["format"]> = {
  ".ttf": "truetype",
  ".otf": "opentype",
  ".woff2": "woff2",
  ".woff": "woff",
};

let cachedFonts: LocalFontInfo[] | null = null;
let registeredServerFonts = false;

/**
 * Scans standard local font directories (public/fonts and root fonts/).
 */
export function scanLocalFonts(options?: { refresh?: boolean; cwd?: string }): LocalFontInfo[] {
  if (cachedFonts && !options?.refresh) {
    return cachedFonts;
  }

  const cwd = options?.cwd || process.cwd();
  const searchDirs = [
    join(cwd, "public", "fonts"),
    join(cwd, "dist", "fonts"),
    join(cwd, "fonts"),
  ];

  const foundMap = new Map<string, LocalFontInfo>();

  for (const dir of searchDirs) {
    if (!existsSync(dir)) continue;

    let manifest: Record<string, { label?: string; family?: string }> = {};
    const manifestPath = join(dir, "fonts.json");
    if (existsSync(manifestPath)) {
      try {
        manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
      } catch (err) {
        console.warn(`[font-loader] Failed to parse manifest ${manifestPath}:`, err);
      }
    }

    let files: string[] = [];
    try {
      files = readdirSync(dir);
    } catch {
      continue;
    }

    for (const filename of files) {
      const ext = extname(filename).toLowerCase();
      if (!SUPPORTED_EXTS.has(ext)) continue;

      const fullPath = resolve(dir, filename);
      let fileStat;
      try {
        fileStat = statSync(fullPath);
        if (!fileStat.isFile()) continue;
      } catch {
        continue;
      }

      const rawBase = basename(filename, ext);
      const customMeta = manifest[filename] || manifest[rawBase] || {};

      // Resolve font family name (manifest > OpenType header > filename)
      const parsedFamily = ext === ".ttf" || ext === ".otf" ? readFontFamilyName(fullPath) : null;
      const family = customMeta.family || parsedFamily || rawBase;

      const label = customMeta.label || `${family} (本地字体)`;

      if (!foundMap.has(family)) {
        foundMap.set(family, {
          family,
          label,
          filename,
          path: fullPath,
          url: `/fonts/${encodeURIComponent(filename)}`,
          format: FORMAT_MAP[ext] || "truetype",
          fileSizeBytes: fileStat.size,
        });
      }
    }
  }

  cachedFonts = Array.from(foundMap.values());
  return cachedFonts;
}

/**
 * Registers all discovered local fonts into @napi-rs/canvas GlobalFonts on the server.
 */
export function registerServerFonts(options?: { refresh?: boolean }): LocalFontInfo[] {
  const fonts = scanLocalFonts({ refresh: options?.refresh });

  if (registeredServerFonts && !options?.refresh) {
    return fonts;
  }

  try {
    const { GlobalFonts } = require("@napi-rs/canvas");
    if (GlobalFonts && typeof GlobalFonts.registerFromPath === "function") {
      for (const font of fonts) {
        try {
          GlobalFonts.registerFromPath(font.path, font.family);
          const rawBase = basename(font.filename, extname(font.filename));
          if (rawBase !== font.family) {
            GlobalFonts.registerFromPath(font.path, rawBase);
          }
        } catch (err) {
          console.warn(`[font-loader] Failed to register font ${font.filename} in Skia:`, err);
        }
      }
      registeredServerFonts = true;
    }
  } catch {
    // Client-side or @napi-rs/canvas not available
  }

  return fonts;
}
