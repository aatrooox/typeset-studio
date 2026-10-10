import { ContentBlock, InlineTextRun } from "./types";

export function normalizeMixedTextSpacing(text: string): string {
  return text.replace(/[ \t]+/g, " ");
}

export function parseInlineRuns(text: string, highlightWords: string[] = []): InlineTextRun[] {
  const runs: InlineTextRun[] = [];
  // Tokenize markdown bold **text**, italic *text*, highlight ==text==, or matching highlightWords
  // Simple token regex
  const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*|==[^=]+==)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  function pushTextWithHighlights(str: string, baseStyle: Partial<InlineTextRun> = {}) {
    if (!str) return;
    if (highlightWords.length === 0) {
      runs.push({ text: str, ...baseStyle });
      return;
    }

    // Match any of highlightWords
    const escapedWords = highlightWords.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    const hlRegex = new RegExp(`(${escapedWords.join("|")})`, "g");
    let hlLast = 0;
    let hlMatch: RegExpExecArray | null;

    while ((hlMatch = hlRegex.exec(str)) !== null) {
      if (hlMatch.index > hlLast) {
        runs.push({ text: str.slice(hlLast, hlMatch.index), ...baseStyle });
      }
      runs.push({ text: hlMatch[0], ...baseStyle, highlight: true });
      hlLast = hlMatch.index + hlMatch[0].length;
    }

    if (hlLast < str.length) {
      runs.push({ text: str.slice(hlLast), ...baseStyle });
    }
  }

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      pushTextWithHighlights(text.slice(lastIndex, match.index));
    }

    const token = match[0];
    if (token.startsWith("**") && token.endsWith("**")) {
      pushTextWithHighlights(token.slice(2, -2), { bold: true });
    } else if (token.startsWith("*") && token.endsWith("*")) {
      pushTextWithHighlights(token.slice(1, -1), { italic: true });
    } else if (token.startsWith("==") && token.endsWith("==")) {
      runs.push({ text: token.slice(2, -2), highlight: true, bold: true });
    }

    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    pushTextWithHighlights(text.slice(lastIndex));
  }

  return runs.length > 0 ? runs : [{ text }];
}

export function parseContentBlocks(rawMarkdown: string): ContentBlock[] {
  const lines = rawMarkdown.replaceAll("\r\n", "\n").split("\n");
  const blocks: ContentBlock[] = [];
  let paragraphBuffer: string[] = [];

  function flushParagraph(): void {
    const value = normalizeMixedTextSpacing(paragraphBuffer.join(" ").trim());
    if (value.length > 0) {
      blocks.push({ kind: "paragraph", text: value });
    }
    paragraphBuffer = [];
  }

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line.length === 0) {
      flushParagraph();
      continue;
    }

    // Ignore page markers during block parsing (they are handled in segment splitter)
    if (isPageMarkerLine(line)) {
      flushParagraph();
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      const level = heading[1]!.length;
      blocks.push({
        kind: level === 1 ? "heading" : level === 2 ? "subheading" : "minor-heading",
        text: normalizeMixedTextSpacing(heading[2]!),
      });
      continue;
    }

    if (line.startsWith(">")) {
      flushParagraph();
      blocks.push({
        kind: "quote",
        text: normalizeMixedTextSpacing(line.replace(/^>\s?/, "").trim()),
      });
      continue;
    }

    const listItem = line.match(/^(\d+[.)]|[-*+])\s+(.+)$/);
    if (listItem) {
      flushParagraph();
      blocks.push({
        kind: "list-item",
        text: normalizeMixedTextSpacing(listItem[2]!),
        bullet: /^\d/.test(listItem[1]!) ? listItem[1] : "•",
      });
      continue;
    }

    paragraphBuffer.push(line);
  }

  flushParagraph();
  return blocks;
}

export function isPageMarkerLine(line: string): boolean {
  const trimmed = line.trim();
  return /^【第([一二三四五六七八九十百两\d]+)页】$/.test(trimmed) || /^【Page\s*(\d+)】$/i.test(trimmed);
}

export function splitTextByPages(text: string): string[] {
  const lines = text.replaceAll("\r\n", "\n").split("\n");
  const pages: string[][] = [[]];

  for (const line of lines) {
    if (isPageMarkerLine(line)) {
      // Start a new page if the current page has content
      if (pages[pages.length - 1]!.length > 0) {
        pages.push([]);
      }
      continue;
    }
    pages[pages.length - 1]!.push(line);
  }

  return pages.map((pageLines) => pageLines.join("\n").trim()).filter((p) => p.length > 0);
}
