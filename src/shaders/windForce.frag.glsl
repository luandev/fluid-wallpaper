#version 300 es
precision highp float;

in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uVelocity;
uniform float uAspect;
uniform float uDt;
uniform float uStrength;
uniform int uStationCount;
uniform vec2 uStationUv[8];
uniform float uStationHeading[8];
uniform float uStationSpeed[8];
uniform float uStationSpin[8];
uniform float uStationRadius[8];

const float TAU = 6.28318530718;

void main() {
  vec2 vel = texture(uVelocity, vUv).xy;
  vec2 streamNum = vec2(0.0);
  float streamDen = 0.0;
  vec2 vortex = vec2(0.0);

  for (int i = 0; i < 8; i++) {
    if (i < uStationCount) {
      vec2 delta = vUv - uStationUv[i];
      delta.x *= uAspect;
      float r2 = dot(delta, delta);
      float idw = 1.0 / max(r2, 1e-6);
      float angle = uStationHeading[i] * TAU;
      streamNum += vec2(cos(angle), sin(angle)) * uStationSpeed[i] * idw;
      streamDen += idw;
      float radius = max(uStationRadius[i], 1e-4);
      float envelope = exp(-r2 / (radius * radius));
      float swirl = uStationSpin[i] / (r2 + 4e-4);
      vortex += vec2(-delta.y, delta.x) * swirl * envelope;
    }
  }

  vec2 stream = streamDen > 0.0 ? streamNum / streamDen : vec2(0.0);
  vel += (stream + vortex) * uStrength * uDt;
  fragColor = vec4(vel, 0.0, 1.0);
}
