#version 300 es
precision highp float;

in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uTarget;
uniform float uAspect;
uniform vec3 uColor;
uniform vec2 uPoint;
uniform float uRadius;

void main() {
  vec3 base = texture(uTarget, vUv).xyz;
  vec2 p = vUv - uPoint;
  p.x *= uAspect;
  float splat = exp(-dot(p, p) / max(uRadius, 1e-6));
  fragColor = vec4(base + uColor * splat, 1.0);
}
