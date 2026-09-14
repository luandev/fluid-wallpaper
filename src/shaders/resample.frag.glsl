#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uSource;
uniform vec2 uSourceRes;
uniform vec4 uScale;

vec4 cell(ivec2 p) {
  return texelFetch(uSource, clamp(p, ivec2(0), ivec2(uSourceRes) - 1), 0);
}
void main() {
  vec2 p = vUv * uSourceRes - .5;
  ivec2 i = ivec2(floor(p));
  vec2 f = fract(p);
  // Manual bilinear works for both half/float targets without float-linear extensions.
  fragColor = mix(mix(cell(i), cell(i + ivec2(1,0)), f.x),
                  mix(cell(i + ivec2(0,1)), cell(i + ivec2(1,1)), f.x), f.y) * uScale;
}
