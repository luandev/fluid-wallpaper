#version 300 es
precision highp float;

in vec2 vUv;
out vec4 fragColor;

uniform vec4 uValue;

void main() {
  fragColor = uValue;
}
