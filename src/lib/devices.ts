export type DeviceId =
  "iphone-6.9" | "iphone-6.5" | "iphone-6.1" | "ipad-13" | "android-phone";

export type Device = {
  id: DeviceId;
  label: string;
  store: "appstore" | "play";
  width: number;
  height: number;
  frame: "iphone" | "ipad" | "android";
  /** App Store Connect display-size folder name. */
  ascFolder: string;
  /** Rendered by scaling this device's scene instead of needing its own scenes (same aspect family). */
  derivedFrom?: DeviceId;
};

export const DEVICES: Record<DeviceId, Device> = {
  "iphone-6.9": {
    id: "iphone-6.9",
    label: 'iPhone 6.9"',
    store: "appstore",
    width: 1320,
    height: 2868,
    frame: "iphone",
    ascFolder: "iPhone 6.9",
  },
  "iphone-6.5": {
    id: "iphone-6.5",
    label: 'iPhone 6.5"',
    store: "appstore",
    width: 1242,
    height: 2688,
    frame: "iphone",
    ascFolder: "iPhone 6.5",
    derivedFrom: "iphone-6.9",
  },
  "iphone-6.1": {
    id: "iphone-6.1",
    label: 'iPhone 6.1"',
    store: "appstore",
    width: 1179,
    height: 2556,
    frame: "iphone",
    ascFolder: "iPhone 6.1",
    derivedFrom: "iphone-6.9",
  },
  "ipad-13": {
    id: "ipad-13",
    label: 'iPad 13"',
    store: "appstore",
    width: 2064,
    height: 2752,
    frame: "ipad",
    ascFolder: "iPad 13",
  },
  "android-phone": {
    id: "android-phone",
    label: "Google Play phone",
    store: "play",
    width: 1080,
    height: 1920,
    frame: "android",
    ascFolder: "Android phone",
  },
};

export const DEVICE_IDS = Object.keys(DEVICES) as DeviceId[];
/** Devices that own scenes (not derived). */
export const SCENE_DEVICE_IDS = DEVICE_IDS.filter(
  (id) => !DEVICES[id].derivedFrom,
);

export function getDevice(id: string): Device {
  const d = DEVICES[id as DeviceId];
  if (!d) throw new Error(`Unknown device: ${id}`);
  return d;
}
