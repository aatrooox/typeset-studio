import {
  ensurePretextRuntime,
  layoutNextRichInlineLineRange,
  materializeRichInlineLineRange,
  prepareRichInline,
  type RichInlineCursor,
} from "./pretext";
import { FlowBlock, FlowImage, FlowLine, FlowPage, InlineTextRun } from "./types";

const START: RichInlineCursor = { itemIndex: 0, segmentIndex: 0, graphemeIndex: 0 };

function runFont(font: string, run: InlineTextRun): string {
  const weighted = run.bold ? font.replace(/^\d+\s+/, "700 ") : font;
  return run.italic ? "italic " + weighted : weighted;
}

function compareCursor(a: RichInlineCursor, b: RichInlineCursor): number {
  return (
    a.itemIndex - b.itemIndex ||
    a.segmentIndex - b.segmentIndex ||
    a.graphemeIndex - b.graphemeIndex
  );
}

export interface PaginateOptions {
  obstacleGap?: number;
  pageImageLimit?: number;
  minPages?: number;
  maxPages?: number;
}

/**
 * Paginates FlowBlocks and FlowImages into pixel-perfect FlowPages.
 * Places text into available free horizontal slots around obstacles.
 */
export function paginateBlocks(
  blocks: FlowBlock[],
  stageWidth: number,
  stageHeight: number,
  allImages: FlowImage[],
  options: PaginateOptions = {},
): FlowPage[] {
  ensurePretextRuntime();

  const gap = options.obstacleGap ?? 24;
  const imageLimit = options.pageImageLimit ?? 2;

  // Precompute pretext rich inline data for all blocks
  const prepared = blocks.map((block) => {
    const runs = block.runs.map((run) => ({
      ...run,
      font: runFont(block.font, run),
    }));
    return {
      ...block,
      runs,
      prepared: prepareRichInline(runs),
    };
  });

  type PreparedBlock = (typeof prepared)[number];
  type PlacedLine = FlowLine & { start: RichInlineCursor; end: RichInlineCursor };

  function place(
    block: PreparedBlock,
    cursor: RichInlineCursor,
    initialY: number,
    images: FlowImage[],
    limit = Infinity,
  ) {
    const lines: PlacedLine[] = [];
    let y = initialY;

    while (y + block.lineHeight <= stageHeight && lines.length < limit) {
      if (!layoutNextRichInlineLineRange(block.prepared, stageWidth, cursor)) {
        return { lines, cursor, y, done: true };
      }

      const indent = block.textIndent ?? 0;
      let intervals = [{ left: 0, right: stageWidth }];

      // Filter obstacles that collide with this line vertically
      const blockers = images.filter(
        (img) =>
          y + block.lineHeight > img.y - gap &&
          y < img.y + img.height + (img.captionHeight ?? 0) + gap,
      );

      // Subtract blockers from horizontal intervals
      for (const img of blockers) {
        intervals = intervals
          .flatMap((interval) => {
            if (img.x - gap >= interval.right || img.x + img.width + gap <= interval.left) {
              return [interval];
            }
            return [
              { left: interval.left, right: Math.min(interval.right, img.x - gap) },
              { left: Math.max(interval.left, img.x + img.width + gap), right: interval.right },
            ];
          })
          .filter((interval) => interval.right > interval.left);
      }

      const fontSize = Number(block.font.match(/(\d+(?:\.\d+)?)px/)?.[1] ?? 36);
      let best: {
        line: NonNullable<ReturnType<typeof layoutNextRichInlineLineRange>>;
        left: number;
        width: number;
      } | null = null;

      // Find the best interval (slot that fits the most text)
      for (const interval of intervals) {
        const slotWidth = interval.right - interval.left - indent;
        if (slotWidth < fontSize * (blockers.length ? 2.5 : 1)) continue;

        const line = layoutNextRichInlineLineRange(block.prepared, slotWidth, cursor);
        if (!line || line.width > slotWidth + 0.5) continue;

        if (!best || compareCursor(line.end, best.line.end) > 0) {
          best = { line, left: interval.left + indent, width: slotWidth };
        }
      }

      if (!best) {
        if (!blockers.length) {
          // Stage width is too narrow for this font
          break;
        }
        // Jump down below the lowest blocker
        y = Math.min(
          ...blockers.map((img) => img.y + img.height + (img.captionHeight ?? 0) + gap),
        );
        continue;
      }

      if (compareCursor(best.line.end, cursor) <= 0) {
        // No progress
        break;
      }

      const lineData = materializeRichInlineLineRange(block.prepared, best.line);
      const fragments = lineData.fragments.map((frag) => {
        const originalRun = block.runs[frag.itemIndex]!;
        return {
          text: frag.text,
          font: originalRun.font ?? block.font,
          bold: originalRun.bold,
          italic: originalRun.italic,
          highlight: originalRun.highlight,
          gapBefore: frag.gapBefore,
          occupiedWidth: frag.occupiedWidth,
        };
      });

      lines.push({
        text: fragments.map((f) => f.text).join(""),
        fragments,
        x: best.left,
        y,
        className: block.className,
        font: block.font,
        lineHeight: block.lineHeight,
        maxWidth: best.width,
        start: cursor,
        end: best.line.end,
        bullet: compareCursor(cursor, START) === 0 ? block.bullet : undefined,
        bulletX:
          compareCursor(cursor, START) === 0 && block.bullet ? best.left - indent : undefined,
      });

      cursor = best.line.end;
      y += block.lineHeight;
    }

    return {
      lines,
      cursor,
      y,
      done: layoutNextRichInlineLineRange(block.prepared, stageWidth, cursor) === null,
    };
  }

  const pages: FlowPage[] = [];
  let blockIndex = 0;
  let cursor = START;
  let imageIndex = 0;

  // Pagination loop
  while (blockIndex < prepared.length || imageIndex < allImages.length) {
    const pageNum = pages.length + 1;
    // Assign images for this page (either explicitly tagged with pageIndex === pageNum or sliced by limit)
    const pageExplicitImages = allImages.filter((img) => img.pageIndex === pageNum);
    const pageAutoImages =
      pageExplicitImages.length > 0
        ? pageExplicitImages
        : allImages.filter((img) => !img.pageIndex).slice(imageIndex, imageIndex + imageLimit);

    const images = pageAutoImages;
    const lines: FlowLine[] = [];
    let y = 0;

    const initialBlockIndex = blockIndex;
    const initialCursor = cursor;

    while (blockIndex < prepared.length) {
      const block = prepared[blockIndex]!;
      const startsBlock = compareCursor(cursor, START) === 0;
      const startY = y + (startsBlock && lines.length ? block.gapBefore ?? 0 : 0);

      // Keep heading with following lines
      if (startsBlock && block.keepWithNext && lines.length) {
        let probeY = startY;
        let fits = true;
        for (let idx = blockIndex; idx < prepared.length; idx++) {
          const f = prepared[idx]!;
          if (idx > blockIndex) probeY += f.gapBefore ?? 0;
          const probe = place(f, START, probeY, images, f.keepWithNext ? Infinity : 2);
          if (f.keepWithNext ? !probe.done : probe.lines.length < 2 && !probe.done) {
            fits = false;
            break;
          }
          if (!f.keepWithNext) break;
          probeY = probe.y + (f.gapAfter ?? 0);
        }
        if (!fits) break;
      }

      const chunk = place(block, cursor, startY, images);
      // Orphan line prevention: if only 1 line remains for next page, take 1 back if possible
      if (!chunk.done && chunk.lines.length) {
        const remainder = place(block, chunk.cursor, 0, [], 2);
        if (remainder.done && remainder.lines.length === 1 && chunk.lines.length >= 2) {
          const moved = chunk.lines.pop()!;
          chunk.cursor = moved.start;
          chunk.y = moved.y;
        }
        if (startsBlock && chunk.lines.length < 2 && lines.length) {
          break;
        }
      }

      lines.push(...chunk.lines);
      cursor = chunk.cursor;
      y = chunk.y;

      if (!chunk.done) break;

      blockIndex++;
      cursor = START;
      y += block.gapAfter ?? 0;
    }

    if (
      blockIndex === initialBlockIndex &&
      compareCursor(cursor, initialCursor) === 0 &&
      !images.length
    ) {
      // Emergency escape to prevent infinite loop
      break;
    }

    if (!lines.length && !images.length) {
      break;
    }

    const textBottom = lines.reduce((max, l) => Math.max(max, l.y + l.lineHeight), 0);
    const imageBottom = images.reduce(
      (max, img) => Math.max(max, img.y + img.height + (img.captionHeight ?? 0)),
      0,
    );
    const contentBottom = Math.max(textBottom, imageBottom);
    const fillRatio = stageHeight > 0 ? Math.min(1, contentBottom / stageHeight) : 0;

    pages.push({
      pageNumber: pageNum,
      lines,
      images,
      textBottom,
      fillRatio,
    });

    if (!pageExplicitImages.length) {
      imageIndex += pageAutoImages.length;
    }
  }

  return pages;
}
