#version 300 es
precision highp float;

in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uVelocity;
uniform sampler2D uDye;
uniform vec4 uViscosity;
uniform vec4 uEnabled;
uniform float uBaseDecay;
uniform float uDt;

void main() {
  vec4 vel = texture(uVelocity, vUv);
  vec4 conc = max(texture(uDye, vUv), vec4(0.0)) * uEnabled;
  float extra = dot(conc, uViscosity);
  float damp = exp(-(max(uBaseDecay, 0.0) + extra) * max(uDt, 0.0));
  fragColor = vec4(vel.xy * damp, vel.z, vel.w);
}
