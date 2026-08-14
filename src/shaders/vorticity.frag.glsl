#version 300 es
precision highp float;

in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uVelocity;
uniform sampler2D uCurl;
uniform vec2 uTexelSize;
uniform float uVorticity;
uniform float uDt;

void main() {
  float L = texture(uCurl, vUv - vec2(uTexelSize.x, 0.0)).x;
  float R = texture(uCurl, vUv + vec2(uTexelSize.x, 0.0)).x;
  float B = texture(uCurl, vUv - vec2(0.0, uTexelSize.y)).x;
  float T = texture(uCurl, vUv + vec2(0.0, uTexelSize.y)).x;
  float C = texture(uCurl, vUv).x;

  vec2 eta = vec2(abs(R) - abs(L), abs(T) - abs(B));
  vec2 N = eta / (length(eta) + 1e-5);
  vec2 force = uVorticity * vec2(N.y * C, -N.x * C);

  vec2 vel = texture(uVelocity, vUv).xy;
  vel += force * uDt;
  fragColor = vec4(vel, 0.0, 1.0);
}
