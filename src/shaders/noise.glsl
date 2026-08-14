float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float valueNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 6; i++) {
    v += a * valueNoise(p);
    p = p * 2.03 + vec2(0.17, -0.31);
    a *= 0.5;
  }
  return v;
}

vec2 marbleDomain(vec2 uv, float aspect) {
  vec2 p = vec2(uv.x * aspect, uv.y) * 2.8 + vec2(-0.15, 0.2);
  return vec2(p.x + p.y, p.y - p.x * 0.35);
}

float marbleField(vec2 uv, float aspect) {
  vec2 p = marbleDomain(uv, aspect);
  vec2 q = vec2(fbm(p), fbm(p + vec2(5.2, 1.3)));
  vec2 r = vec2(
    fbm(p + 4.0 * q + vec2(1.7, 9.2)),
    fbm(p + 4.0 * q + vec2(8.3, 2.8))
  );
  return fbm(p + 4.0 * r);
}
