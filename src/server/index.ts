import { existsSync, mkdirSync } from "fs";
import { join } from "path";
import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { authMiddleware, getOrGenerateAdminKey, isLocalRequest } from "./auth";
import { renderRouter } from "./routes/render";
import { templatesRouter } from "./routes/templates";
import { uploadRouter } from "./routes/upload";
import { fontsRouter } from "./routes/fonts";
import { resolveDataDir } from "../core/data-dir";

export const app = new Hono();


// Health check (public)
app.get("/api/health", (c) => {
  return c.json({
    status: "ok",
    name: "Typeset Studio Server",
    version: "0.3.0",
    time: new Date().toISOString(),
  });
});

// Discovered project-local fonts (public)
app.route("/api/fonts", fontsRouter);

// Verify auth key (public check)
app.post("/api/auth/verify", async (c) => {
  const body = await c.req.json<{ key?: string }>();
  const adminKey = getOrGenerateAdminKey();
  const isValid = body.key === adminKey;
  return c.json({ ok: isValid });
});

// Get active admin key for seamless local development
app.get("/api/auth/current-key", (c) => {
  if (!isLocalRequest(c)) return c.json({ ok: false, isLocal: false }, 403);
  const adminKey = getOrGenerateAdminKey();
  return c.json({
    ok: true,
    key: adminKey,
    isLocal: true,
  });
});

// Protected API routes
app.use("/api/templates*", authMiddleware);
app.use("/api/upload*", authMiddleware);
app.use("/api/render*", authMiddleware);

app.route("/api/templates", templatesRouter);
app.route("/api/upload", uploadRouter);
app.route("/api/render", renderRouter);

// Static uploads serving
const UPLOAD_DIR = join(resolveDataDir(), "uploads");
if (!existsSync(UPLOAD_DIR)) {
  mkdirSync(UPLOAD_DIR, { recursive: true });
}
app.use("/uploads/*", serveStatic({ root: resolveDataDir() }));

// Static local font serving
app.get("/fonts/:filename", async (c) => {
  const filename = c.req.param("filename");
  const candidates = [
    join(process.cwd(), "public", "fonts", filename),
    join(process.cwd(), "fonts", filename),
    join(process.cwd(), "dist", "fonts", filename),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      const file = Bun.file(candidate);
      return new Response(file, {
        headers: {
          "Content-Type": file.type || "font/ttf",
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    }
  }
  return c.notFound();
});

// Production: serve built static files from dist/
const DIST_DIR = join(process.cwd(), "dist");
if (existsSync(DIST_DIR)) {
  app.use("/*", serveStatic({ root: "./dist" }));
  app.get("/*", serveStatic({ path: "./dist/index.html" }));
} else {
  app.get("/", (c) => {
    return c.html(`
      <!doctype html>
      <html>
        <head><title>Typeset Studio</title></head>
        <body style="background:#0a0a0a;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
          <div style="text-align:center;">
            <h2>Typeset Studio Server is running!</h2>
            <p style="color:#888;">Web assets are compiling. Run <code>bun run build</code> to produce production assets, or run <code>bun run dev</code> for Vite HMR.</p>
          </div>
        </body>
      </html>
    `);
  });
}

const PORT = Number(process.env.PORT || 4890);
getOrGenerateAdminKey();

console.log(`
┌────────────────────────────────────────────────────────┐
│               ⚡ Typeset Studio Server                 │
├────────────────────────────────────────────────────────┤
│  Web URL:    http://localhost:${PORT}                   │
│  Protected:  X-Admin-Key header required               │
└────────────────────────────────────────────────────────┘
`);

export default {
  hostname: process.env.TYPESET_HOST || "127.0.0.1",
  port: PORT,
  fetch: (request: Request, server: Bun.Server<undefined>) =>
    app.fetch(request, { peerAddress: server.requestIP(request)?.address }),
};
