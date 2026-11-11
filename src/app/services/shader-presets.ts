export const SHADER_PILOT_VERTEX = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const PRESET_SYNTHWAVE_GLSL = `
uniform float uTime;
uniform float uSpeed;
uniform float uFrequency;
uniform float uGlow;
uniform float uScale;
uniform float uDistortion;
uniform float uColorPalette;
uniform float uShipSpeed;
uniform vec2 uShipTilt;
varying vec2 vUv;

void main() {
  vec2 uv = (vUv - 0.5) * 2.0;
  uv.x += uShipTilt.y * 0.2;
  uv.y += uShipTilt.x * 0.2;

  float speed = uTime * (uSpeed * 0.8 + uShipSpeed * 0.04);
  float horizon = 0.05 + uDistortion * 0.05;

  if (uv.y < horizon) {
    vec3 skyColor = vec3(0.02, 0.03, 0.08);
    float sun = length(uv - vec2(0.0, 0.28));
    if (sun < 0.38) {
      float glow = pow(1.0 - sun / 0.38, 2.5) * uGlow;
      vec3 sunCol = mix(vec3(1.0, 0.15, 0.55), vec3(1.0, 0.85, 0.2), (uv.y - 0.05) * 3.0);
      skyColor += sunCol * glow;
    }
    gl_FragColor = vec4(skyColor, 1.0);
    return;
  }

  float pY = 1.0 / (uv.y - horizon);
  float pX = uv.x * pY;

  vec2 grid = abs(fract(vec2(pX * uScale * 0.6, pY * 0.25 - speed * 0.9) * uFrequency) - 0.5);
  float line = min(grid.x, grid.y);
  float gridPattern = smoothstep(0.08, 0.01, line) * smoothstep(18.0, 1.0, pY);

  vec3 gridColor = mix(vec3(0.0, 0.95, 1.0), vec3(1.0, 0.0, 0.75), sin(speed * 0.5 + pY * 0.1) * 0.5 + 0.5);
  if (uColorPalette == 1.0) gridColor = mix(vec3(0.8, 0.2, 1.0), vec3(0.1, 1.0, 0.6), sin(speed) * 0.5 + 0.5);
  if (uColorPalette == 2.0) gridColor = mix(vec3(1.0, 0.6, 0.0), vec3(1.0, 0.1, 0.2), sin(speed) * 0.5 + 0.5);
  if (uColorPalette == 3.0) gridColor = mix(vec3(0.0, 1.0, 0.4), vec3(0.2, 0.8, 1.0), sin(speed) * 0.5 + 0.5);
  if (uColorPalette == 4.0) gridColor = mix(vec3(1.0, 0.9, 0.2), vec3(0.9, 0.1, 0.8), sin(speed) * 0.5 + 0.5);

  vec3 finalColor = vec3(0.01, 0.02, 0.06) + gridColor * gridPattern * uGlow * 1.6;
  gl_FragColor = vec4(finalColor, 1.0);
}
`;

export const PRESET_NEBULA_GLSL = `
uniform float uTime;
uniform float uSpeed;
uniform float uFrequency;
uniform float uGlow;
uniform float uScale;
uniform float uDistortion;
uniform float uColorPalette;
uniform float uShipSpeed;
varying vec2 vUv;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
float noise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0; float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p); p *= 2.0; a *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = (vUv - 0.5) * 2.0 * uScale;
  float t = uTime * (0.25 * uSpeed + uShipSpeed * 0.01);

  vec2 q = vec2(fbm(uv + vec2(t * 0.1, t * 0.2)), fbm(uv + vec2(0.3, 0.4)));
  vec2 r = vec2(fbm(uv + 4.0 * q + vec2(1.7, 9.2) + 0.15 * t), fbm(uv + 4.0 * q + vec2(8.3, 2.8) + 0.126 * t));
  float f = fbm(uv + 4.0 * r * uDistortion * uFrequency);

  vec3 c1 = vec3(0.04, 0.08, 0.22);
  vec3 c2 = vec3(0.55, 0.1, 0.65);
  vec3 c3 = vec3(0.0, 0.95, 0.75);

  if (uColorPalette == 1.0) { c1 = vec3(0.2, 0.04, 0.1); c2 = vec3(0.9, 0.2, 0.4); c3 = vec3(1.0, 0.75, 0.1); }
  if (uColorPalette == 2.0) { c1 = vec3(0.02, 0.15, 0.08); c2 = vec3(0.1, 0.85, 0.5); c3 = vec3(0.85, 1.0, 0.2); }
  if (uColorPalette == 3.0) { c1 = vec3(0.15, 0.02, 0.25); c2 = vec3(0.2, 0.5, 0.95); c3 = vec3(0.9, 0.1, 0.6); }

  vec3 color = mix(c1, c2, clamp(f * f * 4.0, 0.0, 1.0));
  color = mix(color, c3, clamp(length(q), 0.0, 1.0));
  color += vec3(f * f * f * 0.7) * uGlow;

  gl_FragColor = vec4(color, 1.0);
}
`;

export const PRESET_WORMHOLE_GLSL = `
uniform float uTime;
uniform float uSpeed;
uniform float uFrequency;
uniform float uGlow;
uniform float uScale;
uniform float uDistortion;
uniform float uColorPalette;
uniform float uShipSpeed;
varying vec2 vUv;

void main() {
  vec2 uv = (vUv - 0.5) * 2.0 * uScale;
  float radius = length(uv);
  float angle = atan(uv.y, uv.x);

  float speed = uTime * (uSpeed * 2.2 + uShipSpeed * 0.08);
  float tunnel = 1.0 / (radius + 0.02);

  vec2 st = vec2(angle / 3.14159 * uFrequency + sin(speed * 0.4) * uDistortion, tunnel * 0.6 - speed);
  float pattern = sin(st.x * 6.0 + st.y * 12.0) * cos(st.x * 12.0 - st.y * 6.0);
  pattern = smoothstep(0.08, 0.75, abs(pattern));

  vec3 col = mix(vec3(0.1, 0.45, 1.0), vec3(1.0, 0.1, 0.55), sin(st.y * 0.2) * 0.5 + 0.5);
  if (uColorPalette == 1.0) col = mix(vec3(0.0, 1.0, 0.65), vec3(0.9, 0.9, 0.1), sin(st.y * 0.2) * 0.5 + 0.5);
  if (uColorPalette == 2.0) col = mix(vec3(0.7, 0.1, 1.0), vec3(1.0, 0.4, 0.0), sin(st.y * 0.2) * 0.5 + 0.5);

  vec3 finalCol = col * pattern * uGlow * (1.0 / (radius + 0.25));
  gl_FragColor = vec4(finalCol, 1.0);
}
`;

export const PRESET_FRACTAL_GLSL = `
uniform float uTime;
uniform float uSpeed;
uniform float uFrequency;
uniform float uGlow;
uniform float uScale;
uniform float uDistortion;
uniform float uColorPalette;
varying vec2 vUv;

void main() {
  vec2 uv = (vUv - 0.5) * 2.0 * uScale;
  float t = uTime * uSpeed * 0.4;

  vec3 col = vec3(0.0);
  float d = 0.0;
  for(int i = 0; i < 4; i++) {
    uv = abs(uv) / dot(uv, uv) - vec2(0.85 + sin(t * 0.3 + float(i)) * 0.12 * uDistortion);
    d = length(uv);
  }

  float ring = sin(d * uFrequency * 3.2 - t * 2.5) * 0.5 + 0.5;
  vec3 baseCol = vec3(0.2, 0.85, 1.0);
  if (uColorPalette == 1.0) baseCol = vec3(1.0, 0.25, 0.65);
  if (uColorPalette == 2.0) baseCol = vec3(0.3, 1.0, 0.45);
  if (uColorPalette == 3.0) baseCol = vec3(1.0, 0.75, 0.1);

  col = baseCol * ring * uGlow * (1.0 / (d + 0.2));
  gl_FragColor = vec4(col, 1.0);
}
`;

export const PRESET_PLASMA_GLSL = `
uniform float uTime;
uniform float uSpeed;
uniform float uFrequency;
uniform float uGlow;
uniform float uScale;
uniform float uColorPalette;
varying vec2 vUv;

void main() {
  vec2 uv = (vUv - 0.5) * 2.0 * uScale;
  float t = uTime * uSpeed * 1.2;

  float v1 = sin(uv.x * uFrequency + t);
  float v2 = sin(uv.y * uFrequency + t);
  float v3 = sin((uv.x + uv.y) * uFrequency + t);
  vec2 c = uv + vec2(sin(t * 0.3), cos(t * 0.2));
  float v4 = sin(sqrt(c.x * c.x + c.y * c.y + 1.0) * uFrequency - t);

  float v = (v1 + v2 + v3 + v4) * 0.25;
  vec3 col = vec3(sin(v * 3.14159), sin(v * 3.14159 + 2.0), sin(v * 3.14159 + 4.0)) * 0.5 + 0.5;
  
  if (uColorPalette == 1.0) col = col.gbr;
  if (uColorPalette == 2.0) col = col.brg;

  col *= uGlow;
  gl_FragColor = vec4(col, 1.0);
}
`;
