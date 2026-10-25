import { FONTS, fontFile, fontWeights } from "@/lib/fonts";

/** @font-face rules for every registry family so the editor matches the exporter. */
export function FontFaces() {
  const css = FONTS.flatMap((f) =>
    fontWeights(f).map(
      (w) =>
        `@font-face{font-family:"${f.name}";font-weight:${w};font-style:normal;font-display:block;src:url(/fonts/${fontFile(f, w)}) format("truetype")}`,
    ),
  ).join("\n");
  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}
