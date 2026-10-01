declare module "bidi-js" {
  type Embedding = {
    levels: Uint8Array;
    paragraphs: { start: number; end: number; level: number }[];
  };
  type Bidi = {
    getEmbeddingLevels(text: string, dir?: "ltr" | "rtl" | "auto"): Embedding;
    getReorderSegments(text: string, embedding: Embedding): [number, number][];
  };
  export default function bidiFactory(): Bidi;
}
