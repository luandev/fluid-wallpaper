#version 300 es
precision highp float;

in vec2 vUv;
out vec4 fragColor;

uniform float uAspect;
uniform float uZoom;
uniform vec3 uCrimson;
uniform vec3 uCharcoal;

// #include noise

void main() {
  float n = marbleField(vUv, uAspect, uZoom);
  vec2 p = marbleDomain(vUv, uAspect, uZoom);
  vec2 q = vec2(fbm(p * 1.6), fbm(p * 1.6 + vec2(5.2, 1.3)));
  float veins = 1.0 - abs(sin(n * 4.2 + q.x * 2.4));
  veins = pow(clamp(veins, 0.0, 1.0), 14.0);
  float body = smoothstep(0.46, 0.54, n);
  body = body * body * (3.0 - 2.0 * body);
  vec3 color = mix(uCharcoal, uCrimson, body);
  color = mix(color, uCrimson, veins);
  fragColor = vec4(color, 1.0);
}
