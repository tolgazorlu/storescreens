import { json } from "@/lib/api";
import { DEVICES } from "@/lib/devices";
import { TEMPLATE_IDS, TEMPLATE_LABELS } from "@/lib/templates";
import { FONTS, fontWeights } from "@/lib/fonts";
import { BRAND_PRESETS, PRESET_GROUPS } from "@/lib/brand";
import { ICON_IDS } from "@/lib/icons";
import { IPHONE_FRAMES, LAYOUTS, STYLES } from "@/lib/layouts";
import { BACKGROUND_TYPES, TEXTURE_TYPES } from "@/lib/scene";

export function GET() {
  return json({
    devices: Object.values(DEVICES),
    templates: TEMPLATE_IDS.map((id) => ({ id, label: TEMPLATE_LABELS[id] })),
    themes: Object.entries(BRAND_PRESETS).map(([id, p]) => ({
      id,
      label: p.label,
      group: p.group,
      brand: p.brand,
    })),
    themeGroups: PRESET_GROUPS,
    backgroundTypes: BACKGROUND_TYPES,
    textureTypes: TEXTURE_TYPES,
    // kept for older clients
    brandPresets: Object.entries(BRAND_PRESETS).map(([id, p]) => ({
      id,
      label: p.label,
      brand: p.brand,
    })),
    icons: ICON_IDS,
    layouts: Object.values(LAYOUTS).map(({ key, label, description, span }) => ({ id: key, label, description, span })),
    styles: Object.entries(STYLES).map(([id, s]) => ({ id, ...s })),
    frames: [...IPHONE_FRAMES, "pixel-10-pro"],
    fonts: FONTS.map((f) => ({
      id: f.id,
      name: f.name,
      scripts: f.scripts,
      weights: fontWeights(f),
    })),
  });
}
