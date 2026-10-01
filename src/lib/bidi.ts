import bidiFactory from "bidi-js";

export type Dir = "ltr" | "rtl";
export type Run = { text: string; dir: Dir };
/** Word = ordered tokens; a token is an Arabic/Hebrew letter cluster or a single other char. */
export type Word = { tokens: string[] } | { space: string };
export type Laid = { base: Dir; runs: { dir: Dir; words: Word[] }[] };

const bidi = bidiFactory();
const RTL_RE = /[\u0590-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]/;
const STRONG_LTR_RE = /[A-Za-z\u00C0-\u024F\u0370-\u03FF\u0400-\u04FF]/;
/** Letter clusters that the shaper must see together (joining + marks). */
const ARABIC_DIGITS_RE = /[\u0660-\u0669\u06F0-\u06F9]/;
const RTL_CLUSTER_RE =
  /[\p{Script=Arabic}\p{Script=Hebrew}\p{M}\u0640]+|\s+|./gu;

/** First strong character decides, like CSS `dir="auto"`. */
export function detectDir(text: string): Dir {
  for (const ch of text) {
    if (RTL_RE.test(ch)) return "rtl";
    if (STRONG_LTR_RE.test(ch)) return "ltr";
  }
  return "ltr";
}

export function hasRtl(text: string) {
  return RTL_RE.test(text);
}

/** Logical-order runs of uniform direction (UAX #9 via bidi-js). */
export function bidiRuns(paragraph: string, base: Dir): Run[] {
  if (!paragraph) return [];
  const { levels } = bidi.getEmbeddingLevels(paragraph, base);
  const runs: Run[] = [];
  let start = 0;
  for (let i = 1; i <= paragraph.length; i++) {
    if (i === paragraph.length || levels[i] % 2 !== levels[start] % 2) {
      runs.push({
        text: paragraph.slice(start, i),
        dir: levels[start] % 2 ? "rtl" : "ltr",
      });
      start = i;
    }
  }
  return runs;
}

/**
 * Prepare a paragraph for the shared renderer. satori shapes an Arabic
 * letter cluster correctly but orders neutrals (punctuation, digits) as if
 * the line were LTR and ignores CSS `direction`. So ordering is done with
 * flex: the renderer lays words out with `row-reverse` for RTL, and each RTL
 * word is itself a `row-reverse` of tokens where letter clusters stay whole
 * and every other char is its own span. Browsers get the same tree.
 */
export function layoutParagraph(paragraph: string, base: Dir): Laid {
  const runs = bidiRuns(paragraph, base).map((r) => ({
    dir: r.dir,
    words: words(r.text, r.dir),
  }));
  return { base, runs };
}

function words(text: string, dir: Dir): Word[] {
  const out: Word[] = [];
  for (const piece of text.split(/(\s+)/)) {
    if (!piece) continue;
    if (/^\s+$/.test(piece)) out.push({ space: piece });
    else if (dir === "rtl")
      out.push({ tokens: piece.match(RTL_CLUSTER_RE) ?? [piece] });
    // satori emits an Arabic-Indic digit sequence reversed even in an LTR run;
    // one span per char keeps them in reading order.
    else if (ARABIC_DIGITS_RE.test(piece)) out.push({ tokens: [...piece] });
    else out.push({ tokens: [piece] });
  }
  return out;
}
