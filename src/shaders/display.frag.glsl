#version 300 es
precision highp float;

in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uDye;
uniform vec3 uAlbedo[4];
uniform float uRoughness[4];
uniform float uMetallic[4];
uniform float uSheen[4];
uniform float uGlow[4];
uniform float uEnabled[4];
uniform vec2 uDyeRes;
uniform float uManualBilinear;
uniform float uContrast;

vec4 sampleDye(vec2 uv) {
  if (uManualBilinear < 0.5) {
    return texture(uDye, uv);
  }
  vec2 st = uv * uDyeRes - 0.5;
  vec2 iuv = floor(st);
  vec2 fuv = fract(st);
  vec2 a = (iuv + vec2(0.5, 0.5)) / uDyeRes;
  vec2 px = vec2(1.0 / uDyeRes.x, 0.0);
  vec2 py = vec2(0.0, 1.0 / uDyeRes.y);
  vec4 s00 = texture(uDye, a);
  vec4 s10 = texture(uDye, a + px);
  vec4 s01 = texture(uDye, a + py);
  vec4 s11 = texture(uDye, a + px + py);
  return mix(mix(s00, s10, fuv.x), mix(s01, s11, fuv.x), fuv.y);
}

vec4 gatedConc(vec4 raw) {
  return vec4(
    max(raw.r, 0.0) * uEnabled[0],
    max(raw.g, 0.0) * uEnabled[1],
    max(raw.b, 0.0) * uEnabled[2],
    max(raw.a, 0.0) * uEnabled[3]
  );
}

float contrastPower() {
  float contrastT = clamp((uContrast - 0.4) / 2.6, 0.0, 1.0);
  return mix(1.0, 4.0, contrastT);
}

void mixLooks(vec4 conc, out vec3 albedo, out float roughness, out float metallic, out float sheen, out float glow, out float height) {
  float power = contrastPower();
  vec4 weights = vec4(0.0);
  height = conc.r + conc.g + conc.b + conc.a;
  albedo = vec3(0.0);
  roughness = 0.5;
  metallic = 0.0;
  sheen = 0.0;
  glow = 0.0;
  if (height <= 1e-6) {
    return;
  }
  for (int i = 0; i < 4; i++) {
    float amount = conc[i];
    weights[i] = amount > 0.0 ? pow(amount, power) : 0.0;
  }
  float weightSum = max(weights.r + weights.g + weights.b + weights.a, 1e-6);
  roughness = 0.0;
  for (int i = 0; i < 4; i++) {
    float w = weights[i] / weightSum;
    albedo += uAlbedo[i] * w;
    roughness += uRoughness[i] * w;
    metallic += uMetallic[i] * w;
    sheen += uSheen[i] * w;
    glow += uGlow[i] * w;
  }
}

void main() {
  vec2 texel = 1.0 / max(uDyeRes, vec2(1.0));
  vec4 conc = gatedConc(sampleDye(vUv));
  vec4 concX = gatedConc(sampleDye(vUv + vec2(texel.x, 0.0)));
  vec4 concY = gatedConc(sampleDye(vUv + vec2(0.0, texel.y)));

  vec3 albedo;
  float roughness;
  float metallic;
  float sheenAmt;
  float glow;
  float height;
  mixLooks(conc, albedo, roughness, metallic, sheenAmt, glow, height);

  float heightX = concX.r + concX.g + concX.b + concX.a;
  float heightY = concY.r + concY.g + concY.b + concY.a;
  vec3 normal = normalize(vec3((height - heightX) * 4.0, (height - heightY) * 4.0, 1.0));

  vec3 lightDir = normalize(vec3(0.35, 0.6, 0.85));
  vec3 viewDir = vec3(0.0, 0.0, 1.0);
  vec3 halfDir = normalize(lightDir + viewDir);
  float nDotL = max(dot(normal, lightDir), 0.0);
  float nDotH = max(dot(normal, halfDir), 0.0);
  float nDotV = max(dot(normal, viewDir), 0.0);
  float specPower = mix(8.0, 128.0, 1.0 - clamp(roughness, 0.0, 1.0));
  float spec = pow(nDotH, specPower) * mix(0.04, 1.0, clamp(metallic, 0.0, 1.0)) * nDotL;
  float fresnel = pow(1.0 - nDotV, 5.0);
  float diffuse = 0.18 + 0.82 * nDotL;
  vec3 sheenCol = albedo * sheenAmt * fresnel;
  vec3 emissive = albedo * glow * 0.55;
  float overshoot = max(height - 1.0, 0.0);
  float bloom = (1.0 - exp(-overshoot * 1.85)) * glow;

  vec3 color = albedo * diffuse + vec3(spec) + sheenCol + emissive + albedo * bloom * 0.45;
  fragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
