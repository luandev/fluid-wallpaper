const float NOISE_DRIVE = 8.0;

vec3 fade3(vec3 t) {
  return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}

float hash13(vec3 p) {
  p = fract(p * 0.1031);
  p += dot(p, p.zyx + 33.33);
  return fract((p.x + p.y) * p.z);
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

vec2 perlinCurl3(vec3 p) {
  float e = 0.05;
  float nL = perlin3(p - vec3(e, 0.0, 0.0));
  float nR = perlin3(p + vec3(e, 0.0, 0.0));
  float nB = perlin3(p - vec3(0.0, e, 0.0));
  float nT = perlin3(p + vec3(0.0, e, 0.0));
  return vec2(nT - nB, nL - nR) / (2.0 * e);
}

vec2 composerCurl(vec2 uv, float aspect, float t, float scale, float zoom, float broad, float medium, float fine) {
  vec2 p = vec2((uv.x - 0.5) * aspect, uv.y - 0.5) * scale / max(zoom, 0.05);
  return broad * perlinCurl3(vec3(p * 0.7, t * 0.22)) +
    medium * perlinCurl3(vec3(p * 2.2 + 17.0, t * 0.55)) +
    fine * perlinCurl3(vec3(p * 6.5 + 31.0, t * 1.1));
}

float composerPotential(vec2 uv, float aspect, float t, float scale, float zoom, float broad, float medium, float fine) {
  vec2 p = vec2((uv.x - 0.5) * aspect, uv.y - 0.5) * scale / max(zoom, 0.05);
  return broad * perlin3(vec3(p * 0.7, t * 0.22)) +
    medium * perlin3(vec3(p * 2.2 + 17.0, t * 0.55)) +
    fine * perlin3(vec3(p * 6.5 + 31.0, t * 1.1));
}

float dyeMixT(float n) {
  return smoothstep(-0.55, 0.55, n);
}
