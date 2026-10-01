import { json } from "@/lib/api";
import { DEVICES } from "@/lib/devices";
import { TEMPLATE_IDS, TEMPLATE_LABELS } from "@/lib/templates";
import { FONTS, FONT_WEIGHTS } from "@/lib/fonts";

export function GET() {
  return json({
    devices: Object.values(DEVICES),
    templates: TEMPLATE_IDS.map((id) => ({ id, label: TEMPLATE_LABELS[id] })),
    fonts: FONTS.map((f) => ({
      id: f.id,
      name: f.name,
      scripts: f.scripts,
      weights: FONT_WEIGHTS,
    })),
  });
}
