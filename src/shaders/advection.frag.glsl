#version 300 es
precision highp float;

in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uSource;
uniform sampler2D uVelocity;
uniform vec2 uInvSimSize;
uniform vec2 uSourceRes;
uniform float uDt;
uniform float uDecay;
uniform float uManualBilinear;

vec4 sampleManual(sampler2D tex, vec2 uv, vec2 res) {
  vec2 st = uv * res - 0.5;
  vec2 iuv = floor(st);
  vec2 fuv = fract(st);
  vec2 a = (iuv + vec2(0.5, 0.5)) / res;
  vec2 px = vec2(1.0 / res.x, 0.0);
  vec2 py = vec2(0.0, 1.0 / res.y);
  vec4 s00 = texture(tex, a);
  vec4 s10 = texture(tex, a + px);
  vec4 s01 = texture(tex, a + py);
  vec4 s11 = texture(tex, a + px + py);
  return mix(mix(s00, s10, fuv.x), mix(s01, s11, fuv.x), fuv.y);
}

void main() {
  vec2 vel = texture(uVelocity, vUv).xy;
  vec2 coord = clamp(vUv - uDt * vel * uInvSimSize, uInvSimSize, 1.0 - uInvSimSize);
  vec4 sampled = uManualBilinear > 0.5
    ? sampleManual(uSource, coord, uSourceRes)
    : texture(uSource, coord);
  fragColor = vec4(sampled.xyz * uDecay, 1.0);
}
