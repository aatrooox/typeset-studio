import { existsSync, readFileSync, writeFileSync } from "fs";
import { resolve } from "path";
import type { Context, Next } from "hono";

const ENV_PATH = resolve(process.cwd(), ".env");

let cachedAdminKey: string | null = null;

export function getOrGenerateAdminKey(): string {
  if (cachedAdminKey) return cachedAdminKey;

  // Check process.env
  if (process.env.TYPESET_ADMIN_KEY && process.env.TYPESET_ADMIN_KEY.trim().length > 0) {
    cachedAdminKey = process.env.TYPESET_ADMIN_KEY.trim();
    return cachedAdminKey;
  }

  // Check .env file
  if (existsSync(ENV_PATH)) {
    const envContent = readFileSync(ENV_PATH, "utf-8");
    const match = envContent.match(/^TYPESET_ADMIN_KEY=(.+)$/m);
    if (match && match[1]?.trim()) {
      cachedAdminKey = match[1].trim();
      return cachedAdminKey;
    }
  }

  // Generate a new secure key
  const randomSuffix = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
  const newKey = `tsk_${randomSuffix}`;

  try {
    let existingEnv = existsSync(ENV_PATH) ? readFileSync(ENV_PATH, "utf-8") : "";
    if (!existingEnv.endsWith("\n") && existingEnv.length > 0) existingEnv += "\n";
    existingEnv += `TYPESET_ADMIN_KEY=${newKey}\n`;
    writeFileSync(ENV_PATH, existingEnv, "utf-8");
  } catch (err) {
    console.error("Failed to write ADMIN_KEY to .env:", err);
  }

  cachedAdminKey = newKey;
  return newKey;
}

export async function authMiddleware(c: Context, next: Next) {
  const adminKey = getOrGenerateAdminKey();

  // Extract key from header, query, or Bearer auth
  const headerKey = c.req.header("x-admin-key");
  const authHeader = c.req.header("authorization");
  const bearerKey = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const queryKey = c.req.query("key");

  const providedKey = headerKey || bearerKey || queryKey;

  // Seamless local use: requests from localhost / loopback are trusted for dev
  const host = c.req.header("host") || "";
  const isLocal =
    host.includes("localhost") ||
    host.includes("127.0.0.1") ||
    host.includes("0.0.0.0") ||
    host.includes("[::1]");

  if (isLocal) {
    return next();
  }

  if (!providedKey || providedKey !== adminKey) {
    return c.json(
      {
        ok: false,
        error: "Unauthorized",
        message: "Invalid or missing X-Admin-Key. Please provide the superadmin key in headers or settings.",
      },
      401,
    );
  }

  return next();
}
