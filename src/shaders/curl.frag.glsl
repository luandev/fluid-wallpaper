#version 300 es
precision highp float;

in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uVelocity;
uniform vec2 uTexelSize;

void main() {
  float L = texture(uVelocity, vUv - vec2(uTexelSize.x, 0.0)).y;
  float R = texture(uVelocity, vUv + vec2(uTexelSize.x, 0.0)).y;
  float B = texture(uVelocity, vUv - vec2(0.0, uTexelSize.y)).x;
  float T = texture(uVelocity, vUv + vec2(0.0, uTexelSize.y)).x;
  float curl = R - L - T + B;
  fragColor = vec4(curl, 0.0, 0.0, 1.0);
}
