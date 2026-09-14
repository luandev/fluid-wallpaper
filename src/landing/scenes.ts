import { getFluidPreset } from "../presets";
import type { FluidConfig } from "../app/config";
export const LANDING_SCENES = [
  {
    id: "aurora",
    name: "Aurora",
    accent: "#7AEFDC",
    description:
      "Electric ribbons of cyan, violet and rose. Light caught in a restless current.",
    character: "Luminous / flowing / electric",
  },
  {
    id: "obsidian",
    name: "Gilded Obsidian",
    accent: "#E8BD79",
    description:
      "Gold and copper threaded through dark stone. Slow eddies, liquid metal, intricate folds.",
    character: "Metallic / sculptural / slow",
  },
  {
    id: "porcelain",
    name: "Porcelain Tide",
    accent: "#B9DDEB",
    description:
      "Indigo and sea glass drifting through warm ivory. Soft ink, fine tendrils, a quieter rhythm.",
    character: "Pigment / delicate / tidal",
  },
] as const;
export type LandingSceneId = (typeof LANDING_SCENES)[number]["id"];

export function selectLandingScene(
  requested: string | null,
  random = Math.random(),
): LandingSceneId {
  return (
    LANDING_SCENES.find((scene) => scene.id === requested)?.id ??
    LANDING_SCENES[
      Math.min(
        2,
        Math.max(0, Math.floor((Number.isFinite(random) ? random : 0) * 3)),
      )
    ]!.id
  );
}

export function createLandingConfig(id: LandingSceneId): FluidConfig {
  return getFluidPreset(id);
}
