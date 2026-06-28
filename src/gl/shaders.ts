// GLSL ES 1.00 shaders (valid in WebGL2 without a #version directive). Each
// fragment pass operates on a fullscreen quad reading `uTex` (or named inputs)
// and writing the result. Kept as plain strings to avoid a glsl build plugin.

export const VERT = /* glsl */ `
attribute vec2 position;
varying vec2 vUv;
void main() {
  vUv = position * 0.5 + 0.5;
  gl_Position = vec4(position, 0.0, 1.0);
}
`

/** Separable Gaussian blur. Run twice (uDir = (1,0) then (0,1)). */
export const FRAG_BLUR = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D uTex;
uniform vec2 uTexel;
uniform vec2 uDir;
uniform float uSigma;
const int MAX_R = 48;
void main() {
  float sigma = max(uSigma, 1e-4);
  float r = min(float(MAX_R), ceil(sigma * 3.0));
  vec4 sum = vec4(0.0);
  float wsum = 0.0;
  for (int i = -MAX_R; i <= MAX_R; i++) {
    float fi = float(i);
    if (abs(fi) > r) continue;
    float w = exp(-(fi * fi) / (2.0 * sigma * sigma));
    sum += texture2D(uTex, vUv + uDir * uTexel * fi) * w;
    wsum += w;
  }
  gl_FragColor = sum / wsum;
}
`

/** Convert color to luminance, stored in all channels. */
export const FRAG_LUM = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D uTex;
void main() {
  vec3 c = texture2D(uTex, vUv).rgb;
  float l = dot(c, vec3(0.299, 0.587, 0.114));
  gl_FragColor = vec4(vec3(l), 1.0);
}
`

/** Sobel edge detection on a luminance input → dark lines on white. */
export const FRAG_SOBEL = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D uTex;
uniform vec2 uTexel;
uniform float uThreshold;  // 0..1
uniform float uThickness;  // sample spread
uniform float uInvert;     // 0 or 1
float L(vec2 o) { return texture2D(uTex, vUv + o * uTexel * uThickness).r; }
void main() {
  float tl = L(vec2(-1.0, 1.0)), t = L(vec2(0.0, 1.0)), tr = L(vec2(1.0, 1.0));
  float ml = L(vec2(-1.0, 0.0)),                       mr = L(vec2(1.0, 0.0));
  float bl = L(vec2(-1.0,-1.0)), b = L(vec2(0.0,-1.0)), br = L(vec2(1.0,-1.0));
  float gx = -tl - 2.0 * ml - bl + tr + 2.0 * mr + br;
  float gy =  tl + 2.0 * t  + tr - bl - 2.0 * b  - br;
  float mag = length(vec2(gx, gy));
  float e = smoothstep(uThreshold, uThreshold + 0.2, mag);
  float v = 1.0 - e;            // white background, dark edges
  v = mix(v, 1.0 - v, uInvert);
  gl_FragColor = vec4(vec3(v), 1.0);
}
`

/** XDoG combine: takes two Gaussian-blurred luminance textures. */
export const FRAG_XDOG = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D uG1;
uniform sampler2D uG2;
uniform float uTau;
uniform float uEps;
uniform float uPhi;
uniform float uInvert;
float tanh_(float x) { x = clamp(x, -10.0, 10.0); float e = exp(2.0 * x); return (e - 1.0) / (e + 1.0); }
void main() {
  float a = texture2D(uG1, vUv).r;
  float b = texture2D(uG2, vUv).r;
  float d = a - uTau * b;
  float v = (d >= uEps) ? 1.0 : 1.0 + tanh_(uPhi * (d - uEps));
  v = clamp(v, 0.0, 1.0);
  v = mix(v, 1.0 - v, uInvert);
  gl_FragColor = vec4(vec3(v), 1.0);
}
`

/** Posterize luminance to N evenly spaced gray levels. */
export const FRAG_POSTERIZE = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D uTex;
uniform float uLevels;
void main() {
  float l = texture2D(uTex, vUv).r;
  float n = max(uLevels, 2.0);
  float q = clamp(floor(l * n), 0.0, n - 1.0) / (n - 1.0);
  gl_FragColor = vec4(vec3(q), 1.0);
}
`

/** Hard threshold → high-contrast black & white. */
export const FRAG_THRESHOLD = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D uTex;
uniform float uCutoff;
void main() {
  float l = texture2D(uTex, vUv).r;
  float v = step(uCutoff, l);
  gl_FragColor = vec4(vec3(v), 1.0);
}
`

/** Adaptive threshold: compare luminance to a local mean → pencil sketch. */
export const FRAG_ADAPTIVE = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D uTex;   // luminance
uniform sampler2D uMean;  // blurred luminance (local mean)
uniform float uStrength;
void main() {
  float l = texture2D(uTex, vUv).r;
  float m = texture2D(uMean, vUv).r;
  float diff = m - l;                       // > 0 where darker than surroundings
  float v = 1.0 - smoothstep(0.0, max(uStrength, 1e-3), diff);
  gl_FragColor = vec4(vec3(v), 1.0);
}
`

/** Final present: blend original color with filtered result, flip Y for display. */
export const FRAG_PRESENT = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D uOrig;
uniform sampler2D uFiltered;
uniform float uBlend;   // 0 = original, 1 = filtered
uniform float uFlipY;
void main() {
  vec2 uv = vUv;
  uv.y = mix(uv.y, 1.0 - uv.y, uFlipY);
  vec4 o = texture2D(uOrig, uv);
  vec4 f = texture2D(uFiltered, uv);
  gl_FragColor = mix(o, f, uBlend);
}
`
