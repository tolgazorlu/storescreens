export type DeviceId =
  | "iphone-6.9"
  | "iphone-6.5"
  | "ipad-13"
  | "android-phone"
  | "iphone-duo-outer"
  | "iphone-duo-inner"
  | "appstore-header"
  | "appstore-search"
  | "appstore-universal";

export type Device = {
  id: DeviceId;
  label: string;
  store: "appstore" | "play";
  width: number;
  height: number;
  frame: "iphone" | "ipad" | "android" | "duo-outer" | "duo-inner";
  /** screenshot (default) or an App Store creative asset (iOS 27+). */
  kind?: "screenshot" | "creative";
  /** Apple's "Art Safe Area" from the official template: keep key content inside. */
  safeArea?: { x: number; y: number; w: number; h: number };
};

export const DEVICES: Record<DeviceId, Device> = {
  "iphone-6.9": {
    id: "iphone-6.9",
    label: 'iPhone 6.9"',
    store: "appstore",
    width: 1320,
    height: 2868,
    frame: "iphone",
  },
  "iphone-6.5": {
    id: "iphone-6.5",
    label: 'iPhone 6.5"',
    store: "appstore",
    width: 1242,
    height: 2688,
    frame: "iphone",
  },
  "ipad-13": {
    id: "ipad-13",
    label: 'iPad 13"',
    store: "appstore",
    width: 2064,
    height: 2752,
    frame: "ipad",
  },
  "android-phone": {
    id: "android-phone",
    label: "Google Play phone",
    store: "play",
    width: 1080,
    height: 1920,
    frame: "android",
  },
  /** iPhone Duo (foldable): its own App Store Connect screenshot slots.
   * Outer = compact cover display, inner = the unfolded panel. Support for
   * uploading these in App Store Connect ships later in 2026 and becomes
   * required April 2027. */
  "iphone-duo-outer": {
    id: "iphone-duo-outer",
    label: "iPhone Duo (outer)",
    store: "appstore",
    width: 1398,
    height: 2034,
    frame: "duo-outer",
  },
  "iphone-duo-inner": {
    id: "iphone-duo-inner",
    label: "iPhone Duo (inner, unfolded)",
    store: "appstore",
    width: 2007,
    height: 2853,
    frame: "duo-inner",
  },
  // Creative assets (Apple templates, developer.apple.com/app-store/asset-best-practices).
  "appstore-header": {
    id: "appstore-header",
    label: "App Store product page header",
    store: "appstore",
    width: 3840,
    height: 1646,
    frame: "iphone",
    kind: "creative",
    safeArea: { x: 1097, y: 493, w: 1646, h: 661 },
  },
  "appstore-search": {
    id: "appstore-search",
    label: "App Store search result asset",
    store: "appstore",
    width: 3840,
    height: 2560,
    frame: "iphone",
    kind: "creative",
    safeArea: { x: 836, y: 765, w: 2168, h: 1030 },
  },
  "appstore-universal": {
    id: "appstore-universal",
    label: "App Store universal creative asset",
    store: "appstore",
    width: 5244,
    height: 2950,
    frame: "iphone",
    kind: "creative",
    safeArea: { x: 1921, y: 660, w: 1402, h: 962 },
  },
};



export function isCreative(id: string) {
  return DEVICES[id as DeviceId]?.kind === "creative";
}

/** Safe area for a canvas size, if it matches a creative asset device. */
export function safeAreaForSize(w: number, h: number) {
  return Object.values(DEVICES).find((d) => d.width === w && d.height === h)
    ?.safeArea;
}

export const DEVICE_IDS = Object.keys(DEVICES) as DeviceId[];

export function getDevice(id: string): Device {
  const d = DEVICES[id as DeviceId];
  if (!d) throw new Error(`Unknown device: ${id}`);
  return d;
}
