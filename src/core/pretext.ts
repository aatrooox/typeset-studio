export {
  prepareRichInline,
  layoutNextRichInlineLineRange,
  materializeRichInlineLineRange,
  measureRichInlineStats,
} from "@chenglou/pretext/rich-inline";
export type { RichInlineCursor } from "@chenglou/pretext/rich-inline";

export {
  prepare,
  layoutNextLineRange,
  materializeLineRange,
  measureLineStats,
} from "@chenglou/pretext";

let initialized = false;

/**
 * Ensures OffscreenCanvas runtime exists in environment:
 * - In Browser: native OffscreenCanvas is used directly; falls back to document.createElement("canvas").
 * - In Bun / Node: @napi-rs/canvas is used for headless text measurement.
 */
export function ensurePretextRuntime(): void {
  if (initialized) return;

  if (typeof globalThis.OffscreenCanvas !== "undefined") {
    initialized = true;
    return;
  }

  // Browser environment fallback
  if (typeof document !== "undefined") {
    const hidden = document.createElement("canvas");
    class DomOffscreenCanvas {
      width = 1000;
      height = 1000;
      getContext(type: string) {
        return hidden.getContext(type as any);
      }
    }
    (globalThis as any).OffscreenCanvas = DomOffscreenCanvas;
    initialized = true;
    return;
  }

  // Node/Bun headless environment
  try {
    // Dynamic import to prevent bundler errors in browser
    const requireFn = (import.meta as any).require || (globalThis as any).require;
    if (requireFn) {
      const { createCanvas } = requireFn("@napi-rs/canvas");

      class BunOffscreenCanvas {
        width: number;
        height: number;
        #canvas: any;

        constructor(width: number, height: number) {
          this.width = width;
          this.height = height;
          this.#canvas = createCanvas(width, height);
        }

        getContext(type: string) {
          if (type !== "2d") return null;
          return this.#canvas.getContext("2d");
        }
      }

      (globalThis as any).OffscreenCanvas = BunOffscreenCanvas;
      initialized = true;
    }
  } catch {
    console.warn("Pretext requires OffscreenCanvas or @napi-rs/canvas for text measurement.");
  }
}
