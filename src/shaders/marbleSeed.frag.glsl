#version 300 es
precision highp float;

in vec2 vUv;
out vec4 fragColor;

uniform float uAspect;
uniform vec3 uCrimson;
uniform vec3 uCharcoal;

// #include noise

void main() {
  float n = marbleField(vUv, uAspect);
  vec2 p = marbleDomain(vUv, uAspect);
  vec2 q = vec2(fbm(p), fbm(p + vec2(5.2, 1.3)));
  float veins = 1.0 - abs(sin(n * 12.0 + q.x * 6.0));
  veins = pow(clamp(veins, 0.0, 1.0), 8.0);
  float body = smoothstep(0.32, 0.72, n);
  vec3 color = mix(uCharcoal, uCrimson, body);
  color = mix(color, uCrimson * 1.18, veins);
  color = mix(color, uCharcoal, pow(1.0 - body, 2.0) * 0.28);
  fragColor = vec4(color, 1.0);
}
