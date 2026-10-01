export type DeviceId =
  "iphone-6.9" | "iphone-6.5" | "ipad-13" | "android-phone";

export type Device = {
  id: DeviceId;
  label: string;
  store: "appstore" | "play";
  width: number;
  height: number;
  frame: "iphone" | "ipad" | "android";
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
};

export const DEVICE_IDS = Object.keys(DEVICES) as DeviceId[];

export function getDevice(id: string): Device {
  const d = DEVICES[id as DeviceId];
  if (!d) throw new Error(`Unknown device: ${id}`);
  return d;
}
