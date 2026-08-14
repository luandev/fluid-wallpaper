#version 300 es
precision highp float;

in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uDye;
uniform vec3 uCharcoal;
uniform vec3 uCrimson;
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
  float luma = dot(c, vec3(0.42, 0.08, 0.06));
  float t = smoothstep(0.06, 0.22, luma);
  t = t * t * (3.0 - 2.0 * t);
  vec3 graded = mix(uCharcoal, uCrimson, t);
  graded = mix(graded, min(uCrimson * 1.22, vec3(1.0)), pow(t, 5.0));
  fragColor = vec4(graded, 1.0);
}
