import { existsSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { Hono } from "hono";

const UPLOAD_DIR = join(process.cwd(), "data", "uploads");

function ensureUploadDir(): void {
  if (!existsSync(UPLOAD_DIR)) {
    mkdirSync(UPLOAD_DIR, { recursive: true });
  }
}

export const uploadRouter = new Hono();

uploadRouter.post("/", async (c) => {
  ensureUploadDir();
  const body = await c.req.parseBody();
  const file = body["file"];

  if (!file || typeof file === "string") {
    return c.json({ ok: false, error: "No file provided" }, 400);
  }

  // file is a File object in Bun/Hono
  const originalName = file.name || "image.png";
  const ext = originalName.includes(".") ? originalName.split(".").pop() : "png";
  const safeFilename = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
  const filePath = join(UPLOAD_DIR, safeFilename);

  const arrayBuffer = await file.arrayBuffer();
  writeFileSync(filePath, Buffer.from(arrayBuffer));

  const url = `/uploads/${safeFilename}`;
  return c.json({
    ok: true,
    url,
    filename: safeFilename,
    originalName,
    size: file.size,
  });
});
