const float NOISE_DRIVE = 8.0;
const int NOISE_PERLIN = 0;
const int NOISE_SIMPLEX = 1;
const int NOISE_VALUE = 2;
const int NOISE_WORLEY = 3;

vec3 fade3(vec3 t) {
  return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}

float hash13(vec3 p) {
  p = fract(p * 0.1031);
  p += dot(p, p.zyx + 33.33);
  return fract((p.x + p.y) * p.z);
}

vec3 hash33(vec3 p) {
  p = vec3(
    hash13(p),
    hash13(p + vec3(17.1, 9.3, 3.7)),
    hash13(p + vec3(5.2, 21.4, 11.8))
  );
  return p;
}

vec3 perlinGrad3(vec3 cell) {
  float n = hash13(cell);
  float a = n * 6.28318530718;
  float b = fract(n * 17.0) * 6.28318530718;
  return vec3(sin(a) * cos(b), sin(a) * sin(b), cos(a));
}

float perlin3(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  vec3 u = fade3(f);
  float n000 = dot(perlinGrad3(i), f);
  float n100 = dot(perlinGrad3(i + vec3(1.0, 0.0, 0.0)), f - vec3(1.0, 0.0, 0.0));
  float n010 = dot(perlinGrad3(i + vec3(0.0, 1.0, 0.0)), f - vec3(0.0, 1.0, 0.0));
  float n110 = dot(perlinGrad3(i + vec3(1.0, 1.0, 0.0)), f - vec3(1.0, 1.0, 0.0));
  float n001 = dot(perlinGrad3(i + vec3(0.0, 0.0, 1.0)), f - vec3(0.0, 0.0, 1.0));
  float n101 = dot(perlinGrad3(i + vec3(1.0, 0.0, 1.0)), f - vec3(1.0, 0.0, 1.0));
  float n011 = dot(perlinGrad3(i + vec3(0.0, 1.0, 1.0)), f - vec3(0.0, 1.0, 1.0));
  float n111 = dot(perlinGrad3(i + vec3(1.0, 1.0, 1.0)), f - vec3(1.0, 1.0, 1.0));
  return mix(
    mix(mix(n000, n100, u.x), mix(n010, n110, u.x), u.y),
    mix(mix(n001, n101, u.x), mix(n011, n111, u.x), u.y),
    u.z
  );
}

float valueNoise3(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  vec3 u = fade3(f);
  float n000 = hash13(i);
  float n100 = hash13(i + vec3(1.0, 0.0, 0.0));
  float n010 = hash13(i + vec3(0.0, 1.0, 0.0));
  float n110 = hash13(i + vec3(1.0, 1.0, 0.0));
  float n001 = hash13(i + vec3(0.0, 0.0, 1.0));
  float n101 = hash13(i + vec3(1.0, 0.0, 1.0));
  float n011 = hash13(i + vec3(0.0, 1.0, 1.0));
  float n111 = hash13(i + vec3(1.0, 1.0, 1.0));
  float n = mix(
    mix(mix(n000, n100, u.x), mix(n010, n110, u.x), u.y),
    mix(mix(n001, n101, u.x), mix(n011, n111, u.x), u.y),
    u.z
  );
  return n * 2.0 - 1.0;
}

vec4 permute4(vec4 x) {
  return mod(((x * 34.0) + 1.0) * x, 289.0);
}

float simplex3(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod(i, 289.0);
  vec4 p = permute4(permute4(permute4(
      i.z + vec4(0.0, i1.z, i2.z, 1.0))
    + i.y + vec4(0.0, i1.y, i2.y, 1.0))
    + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 1.0 / 7.0;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = inversesqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}

float worley3(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  float minDist = 1.0;
  for (int z = -1; z <= 1; z += 1) {
    for (int y = -1; y <= 1; y += 1) {
      for (int x = -1; x <= 1; x += 1) {
        vec3 g = vec3(float(x), float(y), float(z));
        vec3 o = hash33(i + g);
        vec3 r = g + o - f;
        minDist = min(minDist, dot(r, r));
      }
    }
  }
  return 1.0 - clamp(sqrt(minDist), 0.0, 1.0) * 2.0;
}

float fieldNoise3(vec3 p, int noiseType) {
  if (noiseType == NOISE_SIMPLEX) {
    return simplex3(p);
  }
  if (noiseType == NOISE_VALUE) {
    return valueNoise3(p);
  }
  if (noiseType == NOISE_WORLEY) {
    return worley3(p);
  }
  return perlin3(p);
}

vec2 fieldCurl3(vec3 p, int noiseType) {
  float e = 0.05;
  float nL = fieldNoise3(p - vec3(e, 0.0, 0.0), noiseType);
  float nR = fieldNoise3(p + vec3(e, 0.0, 0.0), noiseType);
  float nB = fieldNoise3(p - vec3(0.0, e, 0.0), noiseType);
  float nT = fieldNoise3(p + vec3(0.0, e, 0.0), noiseType);
  return vec2(nT - nB, nL - nR) / (2.0 * e);
}

vec2 composerCurl(vec2 uv, float aspect, float t, float scale, float zoom, float broad, float medium, float fine, int noiseType) {
  vec2 p = vec2((uv.x - 0.5) * aspect, uv.y - 0.5) * scale / max(zoom, 0.05);
  return broad * fieldCurl3(vec3(p * 0.7, t * 0.22), noiseType) +
    medium * fieldCurl3(vec3(p * 2.2 + 17.0, t * 0.55), noiseType) +
    fine * fieldCurl3(vec3(p * 6.5 + 31.0, t * 1.1), noiseType);
}

float composerPotential(vec2 uv, float aspect, float t, float scale, float zoom, float broad, float medium, float fine, int noiseType) {
  vec2 p = vec2((uv.x - 0.5) * aspect, uv.y - 0.5) * scale / max(zoom, 0.05);
  return broad * fieldNoise3(vec3(p * 0.7, t * 0.22), noiseType) +
    medium * fieldNoise3(vec3(p * 2.2 + 17.0, t * 0.55), noiseType) +
    fine * fieldNoise3(vec3(p * 6.5 + 31.0, t * 1.1), noiseType);
}

float dyeMixT(float n) {
  return smoothstep(-0.55, 0.55, n);
}
