#version 300 es
precision highp float;

in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uDye;
uniform vec3 uCharcoal;
uniform vec3 uCrimson;
uniform vec3 uWine;
uniform vec3 uEmber;
uniform vec3 uSlate;
uniform vec3 uPlum;
uniform vec3 uAsh;
uniform vec2 uDyeRes;
uniform float uManualBilinear;
uniform float uContrast;

vec3 sampleDye(vec2 uv) {
  if (uManualBilinear < 0.5) {
    return texture(uDye, uv).rgb;
  }
  vec2 st = uv * uDyeRes - 0.5;
  vec2 iuv = floor(st);
  vec2 fuv = fract(st);
  vec2 a = (iuv + vec2(0.5, 0.5)) / uDyeRes;
  vec2 px = vec2(1.0 / uDyeRes.x, 0.0);
  vec2 py = vec2(0.0, 1.0 / uDyeRes.y);
  vec3 s00 = texture(uDye, a).rgb;
  vec3 s10 = texture(uDye, a + px).rgb;
  vec3 s01 = texture(uDye, a + py).rgb;
  vec3 s11 = texture(uDye, a + px + py).rgb;
  return mix(mix(s00, s10, fuv.x), mix(s01, s11, fuv.x), fuv.y);
}

vec3 screenBlend(vec3 a, vec3 b) {
  return vec3(1.0) - (vec3(1.0) - a) * (vec3(1.0) - b);
}

vec3 colorBurn(vec3 base, vec3 blend) {
  return clamp(vec3(1.0) - (vec3(1.0) - base) / max(blend, vec3(0.06)), 0.0, 1.0);
}

float concentrationOf(vec3 c) {
  float lo = uCharcoal.r;
  float hi = max(uCrimson.r, lo + 1e-4);
  return (c.r - lo) / (hi - lo);
}

void main() {
  vec2 texel = 1.0 / max(uDyeRes, vec2(1.0));
  vec3 c = max(sampleDye(vUv), vec3(0.0));
  float conc = concentrationOf(c);
  float concX = concentrationOf(max(sampleDye(vUv + vec2(texel.x, 0.0)), vec3(0.0)));
  float concY = concentrationOf(max(sampleDye(vUv + vec2(0.0, texel.y)), vec3(0.0)));
  float edge = length(vec2(concX - conc, concY - conc));

  float contrastT = clamp((uContrast - 0.4) / 2.6, 0.0, 1.0);
  float lo = mix(0.05, 0.22, contrastT);
  float hi = mix(0.85, 0.5, contrastT);
  float body = smoothstep(lo, hi, conc);
  float overshoot = max(conc - 1.0, 0.0);

  float addW = 1.0 - smoothstep(0.08, 0.38, body);
  float burnW = smoothstep(0.72, 0.98, body);
  float mulW = max(0.0, 1.0 - addW - burnW);
  float modeSum = max(addW + mulW + burnW, 1e-4);
  addW /= modeSum;
  mulW /= modeSum;
  burnW /= modeSum;

  vec3 wineBand = mix(uWine, uPlum, smoothstep(0.25, 0.6, body));
  vec3 paint = mix(uCharcoal, mix(wineBand, uCrimson, smoothstep(0.45, 0.95, body)), body);
  vec3 addPass = screenBlend(uCharcoal, paint * body);
  vec3 mulPass = mix(paint, mix(uCharcoal, paint, 0.88) * mix(vec3(1.0), wineBand, 0.22), 0.35);
  vec3 burnPass = mix(
    mix(uWine, paint, 0.55),
    colorBurn(mix(uWine, uCrimson, 0.28), mix(vec3(0.22), uCrimson, body)),
    smoothstep(0.7, 1.0, body)
  );
  vec3 graded = addPass * addW + mulPass * mulW + burnPass * burnW;

  float filament = smoothstep(0.08, 0.4, edge);
  graded = mix(graded, uSlate, filament * (1.0 - body) * 0.18);
  graded = mix(graded, uPlum, filament * body * (1.0 - body) * 0.22);
  graded = mix(graded, uEmber, filament * body * 0.12);
  graded = mix(graded, uAsh, (1.0 - body) * (1.0 - filament) * 0.08);

  float bloom = 1.0 - exp(-overshoot * 1.85);
  graded = clamp(graded + uEmber * bloom * 0.55, 0.0, 1.0);
  graded = mix(graded, uEmber, smoothstep(0.78, 1.25, conc) * 0.4);
  graded = mix(graded, min(uEmber * 1.12, vec3(1.0)), pow(body, 5.0) * 0.22);

  fragColor = vec4(clamp(graded, 0.0, 1.0), 1.0);
}
