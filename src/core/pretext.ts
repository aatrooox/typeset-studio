export {
  prepareRichInline,
  layoutNextRichInlineLineRange,
  materializeRichInlineLineRange,
} from "@chenglou/pretext/rich-inline";
export type { RichInlineCursor } from "@chenglou/pretext/rich-inline";

// Node ESM 使用标准加载器，浏览器不会加载原生模块。
const requireFn = typeof process !== "undefined" && process.versions?.node
  ? (await import("node:module")).createRequire(import.meta.url)
  : undefined;
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
