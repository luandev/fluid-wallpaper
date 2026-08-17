#version 300 es
precision highp float;

in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uDye;
uniform float uAspect;
uniform float uTime;
uniform float uNoiseScale;
uniform float uZoom;
uniform float uBroad;
uniform float uMedium;
uniform float uFine;
uniform float uInject;
uniform int uNoiseType;
uniform int uEmitterCount;
uniform int uEmitterKind[8];
uniform int uEmitterMaterial[8];
uniform float uEmitterRate[8];
uniform vec2 uEmitterUv[8];
uniform float uEmitterRadius[8];
uniform float uEmitterNoiseOffset[8];

// #include perlin

void addChannel(inout vec4 conc, int mat, float amount) {
  if (mat == 0) {
    conc.r += amount;
  } else if (mat == 1) {
    conc.g += amount;
  } else if (mat == 2) {
    conc.b += amount;
  } else if (mat == 3) {
    conc.a += amount;
  }
}

void lerpChannel(inout vec4 conc, int mat, float target, float amount) {
  float a = clamp(amount, 0.0, 1.0);
  if (mat == 0) {
    conc.r = mix(conc.r, target, a);
  } else if (mat == 1) {
    conc.g = mix(conc.g, target, a);
  } else if (mat == 2) {
    conc.b = mix(conc.b, target, a);
  } else if (mat == 3) {
    conc.a = mix(conc.a, target, a);
  }
}

void main() {
  vec4 conc = max(texture(uDye, vUv), vec4(0.0));
  float n = composerPotential(vUv, uAspect, uTime, uNoiseScale, uZoom, uBroad, uMedium, uFine, uNoiseType);
  float t = dyeMixT(n);

  for (int i = 0; i < 8; i++) {
    if (i < uEmitterCount) {
      int kind = uEmitterKind[i];
      int mat = uEmitterMaterial[i];
      float rate = max(uEmitterRate[i], 0.0);
      if (kind == 0) {
        float mask = mix(t, 1.0 - t, clamp(uEmitterNoiseOffset[i], 0.0, 1.0));
        lerpChannel(conc, mat, mask, rate * uInject);
      } else {
        vec2 p = vUv - uEmitterUv[i];
        p.x *= uAspect;
        float splat = exp(-dot(p, p) / max(uEmitterRadius[i], 1e-6));
        addChannel(conc, mat, splat * rate);
      }
    }
  }

  fragColor = max(conc, vec4(0.0));
}
