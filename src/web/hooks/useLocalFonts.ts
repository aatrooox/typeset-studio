import { useCallback, useEffect, useState } from "react";
import type { LocalFontInfo } from "../../core/font-loader";

export function useLocalFonts() {
  const [fonts, setFonts] = useState<LocalFontInfo[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const fetchAndRegisterFonts = useCallback(async (refresh = false) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/fonts${refresh ? "?refresh=1" : ""}`);
      if (!res.ok) return;
      const data = await res.json();
      if (!data.ok || !Array.isArray(data.fonts)) return;

      setFonts(data.fonts);

      // Register newly discovered fonts dynamically in browser DOM via FontFace API
      if (typeof window !== "undefined" && "FontFace" in window && (document as any).fonts) {
        for (const font of data.fonts) {
          try {
            // Check if font is already added
            let alreadyAdded = false;
            (document.fonts as any).forEach((f: any) => {
              if (f.family === font.family || f.family === `"${font.family}"`) {
                alreadyAdded = true;
              }
            });

            if (!alreadyAdded) {
              const fontFace = new FontFace(font.family, `url(${font.url})`);
              const loaded = await fontFace.load();
              (document.fonts as any).add(loaded);
            }
          } catch (err) {
            console.warn(`[useLocalFonts] Failed to load web font ${font.family}:`, err);
          }
        }
      }
    } catch (err) {
      console.warn("[useLocalFonts] Failed to fetch local fonts:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAndRegisterFonts();
  }, [fetchAndRegisterFonts]);

  return {
    fonts,
    loading,
    refreshFonts: () => fetchAndRegisterFonts(true),
  };
}
