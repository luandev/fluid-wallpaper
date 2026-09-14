import { defaultConfig, sanitizeConfig, type FluidConfig, type FluidMaterial, type FluidEmitter, type WindStation } from "../app/config";

export const LANDING_SCENES = [
  { id: "aurora", name: "Aurora", accent: "#7AEFDC", description: "Electric ribbons of cyan, violet and rose. Light caught in a restless current.", character: "Luminous / flowing / electric" },
  { id: "obsidian", name: "Gilded Obsidian", accent: "#E8BD79", description: "Gold and copper threaded through dark stone. Slow eddies, liquid metal, intricate folds.", character: "Metallic / sculptural / slow" },
  { id: "porcelain", name: "Porcelain Tide", accent: "#B9DDEB", description: "Indigo and sea glass drifting through warm ivory. Soft ink, fine tendrils, a quieter rhythm.", character: "Pigment / delicate / tidal" },
] as const;
export type LandingSceneId = (typeof LANDING_SCENES)[number]["id"];

export function selectLandingScene(requested: string | null, random = Math.random()): LandingSceneId {
  return LANDING_SCENES.find(scene => scene.id === requested)?.id
    ?? LANDING_SCENES[Math.min(2, Math.max(0, Math.floor((Number.isFinite(random) ? random : 0) * 3)))]!.id;
}

const material = (id: string, name: string, color: string, colorB: string, roughness: number, metallic: number, glow: number, viscosity: number): FluidMaterial =>
  ({ id, name, enabled: true, color, colorB, roughness, metallic, glow, viscosity, sheen: .65 });
const emitter = (id: string, materialId: string, kind: FluidEmitter["kind"], rate: number, uvX = .5, uvY = .5, radius = .018, noiseOffset = 0): FluidEmitter =>
  ({ id, name: id, materialId, kind, enabled: true, rate, uvX, uvY, radius, noiseOffset });
const wind = (id: string, uvX: number, uvY: number, spin: number, heading: number, radius = .25): WindStation =>
  ({ id, name: id, enabled: true, uvX, uvY, spin, heading, radius, speed: .35 });

/** Independent authored scenes; never read/write the tuner's persisted configuration. */
export function createLandingConfig(id: LandingSceneId): FluidConfig {
  const common: FluidConfig = {
    ...defaultConfig,
    simResolution: 256, dyeResolution: 768, pressureIterations: 28, warmupSteps: 36,
    pointerEnabled: true, splatForce: 900, splatRadius: .0006,
    dyeInject: .32, dyeDecay: .012, videoReveal: 0, backgroundMode: "gradient", youtubeUrl: "",
    wiggleAmount: .13, colorTweenSpeed: .025,
    valueEmitters: [{ id: "breath", name: "Slow current", enabled: true, kind: "sine", rate: .035, phase: .2, from: .18, to: .38, scale: 1, band: 0 }],
    valueBindings: [{ id: "current", emitterId: "breath", path: "noiseTime", amount: .6 }],
  };
  if (id === "aurora") return sanitizeConfig({
    ...common, noiseType: "simplex", noiseScale: 3.8, viewZoom: 1.1,
    composerStrength: 34, composerBroad: 1.2, composerMedium: .9, composerFine: .48,
    seedVelocityScale: 15, vorticity: 24, velocityDecay: .55, noiseTime: .38, windStrength: 14, contrast: 2.2,
    materials: [
      material("cyan", "Ion cyan", "#27E8D1", "#389DEE", .22, .12, .48, .08),
      material("night", "Ultraviolet", "#100D38", "#28103D", .6, .05, .12, .2),
      material("rose", "Plasma rose", "#EC498E", "#9F56EA", .25, .2, .5, .12),
      material("ice", "Glacial light", "#A7F5EF", "#98B7FF", .3, .25, .24, .06),
    ],
    emitters: [emitter("Cyan ribbons", "cyan", "field", .85), emitter("Violet depths", "night", "field", 1, .5, .5, .018, 1), emitter("Rose bloom", "rose", "point", .8, .76, .7, .035), emitter("Rose undertow", "rose", "point", .5, .28, .22, .022), emitter("Ice filament", "ice", "point", .55, .92, .34, .009), emitter("Paint with light", "ice", "pointer", .22, .5, .5, .0007)],
    windStations: [wind("Rising arc", .72, .6, .12, .25), wind("Returning arc", .32, .3, -.09, .7)],
  });
  if (id === "obsidian") return sanitizeConfig({
    ...common, noiseType: "value", noiseScale: 7.2, viewZoom: 1.15,
    composerStrength: 22, composerBroad: .7, composerMedium: 1.2, composerFine: 1.25,
    seedVelocityScale: 9, vorticity: 18, velocityDecay: 1.15, noiseTime: .18, windStrength: 9, contrast: 2.7,
    colorTweenSpeed: .012,
    materials: [
      material("gold", "Brushed gold", "#DDB16B", "#B88848", .32, .85, .06, .6),
      material("stone", "Obsidian", "#111820", "#20151B", .23, .6, 0, .75),
      material("copper", "Copper seam", "#B65E3A", "#CF7848", .4, .8, .05, .45),
      material("silver", "Pale alloy", "#DDD6B8", "#B2BBB7", .25, .9, .03, .4),
    ],
    emitters: [emitter("Gold folds", "gold", "field", .72), emitter("Stone body", "stone", "field", 1, .5, .5, .018, 1), emitter("Copper seam", "copper", "point", .62, .78, .28, .023), emitter("Copper seam north", "copper", "point", .45, .18, .82, .016), emitter("Alloy thread", "silver", "point", .42, .83, .8, .009), emitter("Draw gold", "gold", "pointer", .3, .5, .5, .0005)],
    windStations: [wind("Slow fold", .7, .48, .07, .08, .36), wind("Counterfold", .25, .65, -.045, .55, .3)],
  });
  return sanitizeConfig({
    ...common, noiseType: "perlin", noiseScale: 3.1, viewZoom: 1.05,
    composerStrength: 27, composerBroad: 1.1, composerMedium: .8, composerFine: .35,
    seedVelocityScale: 12, vorticity: 14, velocityDecay: .78, noiseTime: .25, windStrength: 12, contrast: 2.1,
    dyeDecay: .02, colorTweenSpeed: .018,
    materials: [
      material("ivory", "Porcelain", "#E8E0CA", "#DBE8DF", .88, .02, 0, .3),
      material("ink", "Indigo ink", "#173957", "#253C68", .76, .03, .02, .18),
      material("glass", "Sea glass", "#46A69A", "#70B5BA", .65, .1, .03, .12),
      material("coral", "Coral trace", "#D98C75", "#D9B383", .84, .02, 0, .25),
    ],
    emitters: [emitter("Porcelain wash", "ivory", "field", 1), emitter("Indigo tide", "ink", "field", .8, .5, .5, .018, 1), emitter("Sea glass inlet", "glass", "point", .7, .8, .65, .04), emitter("Sea glass return", "glass", "point", .4, .32, .18, .022), emitter("Coral trace", "coral", "point", .45, .89, .22, .012), emitter("Draw indigo", "ink", "pointer", .22, .5, .5, .0006)],
    windStations: [wind("Incoming tide", .82, .42, -.055, .48, .35), wind("Outgoing tide", .28, .75, .065, .02, .3)],
  });
}
