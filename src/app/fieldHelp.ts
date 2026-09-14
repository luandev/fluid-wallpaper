export const MATERIAL_FIELD_HELP = {
  enabled: "When off, this slot is skipped in mix and look.",
  color: "Albedo A for this material’s concentration.",
  colorB: "Albedo B; tween speed on Scene mixes A↔B over time.",
  viscosity: "Damps velocity where this material is dense.",
  roughness: "How matte the shaded surface looks.",
  metallic: "Shifts lighting from Lambert toward a metal spec.",
  sheen: "Soft grazing highlight on the 2.5D look.",
  glow: "Emissive lift in the display pass.",
} as const;

export const EMITTER_FIELD_HELP = {
  enabled: "When off, this emitter injects no dye.",
  kind: "Field is noise, point is a fixed UV, pointer follows the cursor.",
  material: "Which material channel this emitter writes.",
  rate: "Dye dose per simulation second. The result is independent of display frame rate.",
  radius: "Splat size in field units.",
  uvX: "Drag the marker on the field, or type a value.",
  uvY: "Drag the marker on the field, or type a value.",
  noiseOffset: "Shifts the field noise so two field emitters do not overlap.",
} as const;

export const WIND_FIELD_HELP = {
  enabled: "When off, this station adds no force.",
  uvX: "Drag the marker on the field, or type a value.",
  uvY: "Drag the marker on the field, or type a value.",
  heading: "Stream direction (0 is east, increasing counterclockwise).",
  speed: "How hard the station pushes along its heading.",
  spin: "Local vorticity. Positive is counterclockwise.",
  radius: "How far the spin envelope reaches.",
} as const;

export const VALUE_EMITTER_FIELD_HELP = {
  enabled: "Disabled emitters hold their From value and drive nothing.",
  kind: "Wave shape. Audio pulse is a beat kick; audio spectrum is a log FFT band. Camera and tilt stay at 0.5.",
  rate: "Cycles per second of the wave. Unused for audio kinds.",
  phase: "Offset along the wave, 0–1 of a cycle. Unused for audio kinds.",
  from: "Low end of the A↔B tween (scale 1).",
  to: "High end of the A↔B tween (scale 1).",
  scale: "Amplitude around the From/To midpoint. 1 is a full A↔B tween; 0 sits in the middle.",
  band: "Log-frequency pick, 0 bass through 1 treble, like a Winamp bar.",
  amount: "How far this binding pulls the target from its base toward the wave.",
} as const;
