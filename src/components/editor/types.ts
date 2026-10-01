import type { Scene } from "@/lib/scene";

export type AssetDto = {
  id: string;
  kind: string;
  name: string;
  url: string;
  width: number;
  height: number;
};
export type ScreenDto = {
  id: string;
  locale: string;
  device: string;
  position: number;
  scene: Scene;
};
export type ProjectDto = { id: string; name: string; slug: string };
