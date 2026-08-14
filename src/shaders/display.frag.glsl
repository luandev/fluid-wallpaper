#version 300 es
precision highp float;

in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uDye;
uniform vec3 uCharcoal;
uniform vec2 uDyeRes;
uniform float uManualBilinear;

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

void main() {
  vec3 c = max(sampleDye(vUv), vec3(0.0));
  c = pow(c, vec3(0.92));
  float luma = dot(c, vec3(0.299, 0.587, 0.114));
  c = mix(uCharcoal, c, smoothstep(0.02, 0.08, luma) * 1.06);
  fragColor = vec4(c, 1.0);
}
