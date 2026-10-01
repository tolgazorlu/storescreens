import { json } from "@/lib/api";
import { DEVICES } from "@/lib/devices";
import { TEMPLATE_IDS, TEMPLATE_LABELS } from "@/lib/templates";

export function GET() {
  return json({
    devices: Object.values(DEVICES),
    templates: TEMPLATE_IDS.map((id) => ({ id, label: TEMPLATE_LABELS[id] })),
  });
}
