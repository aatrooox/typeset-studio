import { Hono } from "hono";
import { registerServerFonts, scanLocalFonts } from "../../core/font-loader";

export const fontsRouter = new Hono();

// List discovered local fonts
fontsRouter.get("/", (c) => {
  const refresh = c.req.query("refresh") === "1" || c.req.query("refresh") === "true";
  const fonts = registerServerFonts({ refresh });

  return c.json({
    ok: true,
    count: fonts.length,
    fonts,
  });
});
