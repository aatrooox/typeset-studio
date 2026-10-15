import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { isAbsolute } from "node:path";
import { GlobalFonts } from "@napi-rs/canvas";
import { clearCache } from "@chenglou/pretext";
import { ARTICLE_COVER_FONT } from "./core/article-cover";

let registered = false;

/** 字体路径只由可信部署指定，字节身份不匹配时禁止排版。 */
export function registerArticleCoverFont({ path }: { path: string }): typeof ARTICLE_COVER_FONT {
  if (typeof path !== "string" || !isAbsolute(path)) throw new Error("Article cover font requires a trusted absolute path");
  let bytes: Buffer;
  try { bytes = readFileSync(path); }
  catch { throw new Error("Article cover font file is unavailable"); }
  if (createHash("sha256").update(bytes).digest("hex") !== ARTICLE_COVER_FONT.sha256) throw new Error("Article cover font hash mismatch");
  if (!registered || !GlobalFonts.has(ARTICLE_COVER_FONT.family)) {
    if (!GlobalFonts.registerFromPath(path, ARTICLE_COVER_FONT.family) || !GlobalFonts.has(ARTICLE_COVER_FONT.family)) throw new Error("Article cover font registration failed");
    registered = true;
    clearCache();
  }
  return ARTICLE_COVER_FONT;
}
