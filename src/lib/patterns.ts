import manifest from "../../public/patterns/manifest.json";

/**
 * Pattern Craft (github.com/megh-bari/pattern-craft, MIT, see docs/vendor/pattern-craft/LICENSE)
 * backgrounds, pre-rendered to public/patterns/<id>.png by scripts/fetch-patterns.sh since their
 * CSS (radial gradients with %, mask-image, fine grids) renders wrong through satori.
 */
export type PatternCategory = "gradients" | "geometric" | "decorative" | "effects";
export type PatternMeta = { id: string; name: string; category: PatternCategory };

export const PATTERNS: PatternMeta[] = manifest as PatternMeta[];
export const PATTERN_IDS = PATTERNS.map((p) => p.id);
export const PATTERN_CATEGORIES: PatternCategory[] = ["gradients", "geometric", "decorative", "effects"];

export function patternSrc(id: string) {
  return `/patterns/${id}.png`;
}
