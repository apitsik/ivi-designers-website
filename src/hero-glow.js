import { initCursorScrub } from './cursor-scrub.js';

const EASE = 0.015;
const GAIN = 1;
const GAMMA = 1.3;
const LAST_FRAME = 149;
const BLUR = 0.5;
const LOGO_X = 141 / 1384;
const LOGO_W = 1060 / 1384;
const SIGMAS = [0.5, 2, 4, 8, 16, 30, 55, 100];

const KNOT_FRAMES = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 149];
const KNOTS = [
  [19.16, 32.14, 1.66, -0.3],
  [19.96, 31.98, 1.77, -0.3],
  [20.46, 33.72, 1.86, -0.3],
  [20.1, 38.9, 1.95, -0.3],
  [19.36, 44.28, 1.91, -0.07],
  [16.1, 50.44, 1.64, 0.56],
  [12.82, 58.29, 1.52, 1.01],
  [11.06, 62.86, 1.59, 1.21],
  [9.51, 64.13, 1.65, 1.26],
  [8.36, 62.44, 1.67, 1.22],
  [7.35, 63.7, 1.63, 1.1],
  [6.18, 69.58, 1.58, 0.94],
  [5.08, 79.05, 1.55, 0.75],
  [4.37, 81.59, 1.51, 0.61],
  [3.81, 80.4, 1.48, 0.47],
  [3.81, 80.4, 1.48, 0.47],
];

const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = vec2(aPos.x * 0.5 + 0.5, 0.5 - aPos.y * 0.5);
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`;

const FRAG = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uSharp;
uniform sampler2D uA;
uniform sampler2D uB;
uniform sampler2D uC;
uniform sampler2D uRamp;
uniform vec4 uP;
uniform float uGain;
uniform float uGamma;
uniform vec2 uLogo;

float lg(float s) { return log(s); }

float hat(float x, float lo, float mid, float hi) {
  if (x <= mid) {
    if (lo >= mid) return 1.0;
    return clamp((x - lo) / (mid - lo), 0.0, 1.0);
  }
  if (hi <= mid) return 1.0;
  return clamp(1.0 - (x - mid) / (hi - mid), 0.0, 1.0);
}

void main() {
  float u = clamp((vUv.x - uLogo.x) / uLogo.y + uP.w * ((vUv.y * 778.0 - 85.0) / 553.0 - 0.5), 0.0, 1.0);
  float a = log(uP.x);
  float b = log(uP.y);
  float s = a + (b - a) * pow(max(u, 0.0001), uP.z);

  float l0 = lg(0.5);
  float l1 = lg(2.0);
  float l2 = lg(4.0);
  float l3 = lg(8.0);
  float l4 = lg(16.0);
  float l5 = lg(30.0);
  float l6 = lg(55.0);
  float l7 = lg(100.0);

  vec3 pa = texture2D(uA, vUv).rgb;
  vec3 pb = texture2D(uB, vUv).rgb;
  float c = hat(s, l0, l0, l1) * texture2D(uSharp, vUv).r;
  c += hat(s, l0, l1, l2) * pa.r;
  c += hat(s, l1, l2, l3) * pa.g;
  c += hat(s, l2, l3, l4) * pa.b;
  c += hat(s, l3, l4, l5) * pb.r;
  c += hat(s, l4, l5, l6) * pb.g;
  c += hat(s, l5, l6, l7) * pb.b;
  c += hat(s, l6, l7, l7) * texture2D(uC, vUv).r;

  float v = pow(clamp(c * uGain, 0.0, 1.0), uGamma);
  float noise = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5;
  float g = clamp(v * 201.0 + noise, 0.0, 196.0);
  vec3 base = texture2D(uRamp, vec2(0.5 / 197.0, 0.5)).rgb;
  vec3 col = max(texture2D(uRamp, vec2((g + 0.5) / 197.0, 0.5)).rgb - base, 0.0);
  float grain = fract(sin(dot(floor(gl_FragCoord.xy), vec2(39.3468, 11.1357))) * 24634.6345);
  col *= 1.0 - 0.07 * step(0.5, grain);
  float alpha = clamp(max(col.r, max(col.g, col.b)), 0.0, 1.0);
  gl_FragColor = vec4(col, alpha);
}
`;

function paramsAt(t) {
  const f = Math.min(Math.max(t, 0), 1) * LAST_FRAME;
  let i = 0;
  while (i < KNOT_FRAMES.length - 2 && f > KNOT_FRAMES[i + 1]) i++;
  const span = KNOT_FRAMES[i + 1] - KNOT_FRAMES[i];
  const k = span ? (f - KNOT_FRAMES[i]) / span : 0;
  const A = KNOTS[i];
  const B = KNOTS[i + 1];
  return [
    Math.max(0.5, BLUR * Math.exp(Math.log(A[0]) + (Math.log(B[0]) - Math.log(A[0])) * k)),
    Math.max(0.5, BLUR * Math.exp(Math.log(A[1]) + (Math.log(B[1]) - Math.log(A[1])) * k)),
    A[2] + (B[2] - A[2]) * k,
    A[3] + (B[3] - A[3]) * k,
  ];
}

const loadImage = (src) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

function compile(gl, type, src) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh));
  return sh;
}

function useVideo(video) {
  if (!video) return;
  video.src = 'video/hero-ivi.mp4';
  video.preload = 'auto';
  initCursorScrub(video);
}

export function initHeroGlow(video) {
  if (!video) return;
  if (new URLSearchParams(location.search).has('video')) return useVideo(video);

  const canvas = document.createElement('canvas');
  canvas.className = video.className;
  canvas.setAttribute('aria-hidden', 'true');
  const gl = canvas.getContext('webgl', { antialias: false, alpha: true, premultipliedAlpha: true });
  if (!gl) return useVideo(video);

  let program;
  try {
    program = gl.createProgram();
    gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERT));
    gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('link');
  } catch {
    return useVideo(video);
  }
  gl.useProgram(program);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(program, 'aPos');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const names = ['uSharp', 'uA', 'uB', 'uC', 'uRamp'];
  const files = ['glow-sharp.png', 'glow-a.png', 'glow-b.png', 'glow-c.png', 'ramp.png'];
  const uP = gl.getUniformLocation(program, 'uP');
  gl.uniform1f(gl.getUniformLocation(program, 'uGain'), GAIN);
  gl.uniform1f(gl.getUniformLocation(program, 'uGamma'), GAMMA);
  gl.uniform2f(gl.getUniformLocation(program, 'uLogo'), LOGO_X, LOGO_W);

  let target = 0;
  let current = 0;
  let drawn = -1;
  let prev = 0;
  let ready = false;

  const fit = () => {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(2, Math.round(rect.width * dpr));
    const h = Math.max(2, Math.round(rect.height * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
      drawn = -1;
    }
  };

  const draw = () => {
    const [a, b, k, m] = paramsAt(current);
    gl.uniform4f(uP, a, b, k, m);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  Promise.all(files.map((f) => loadImage(`hero-glow/${f}`)))
    .then((images) => {
      images.forEach((img, i) => {
        gl.activeTexture(gl.TEXTURE0 + i);
        const tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.uniform1i(gl.getUniformLocation(program, names[i]), i);
      });
      video.replaceWith(canvas);
      ready = true;
      fit();
      new ResizeObserver(fit).observe(canvas);
      requestAnimationFrame(tick);
    })
    .catch(() => useVideo(video));

  const setTarget = (clientX) => {
    target = Math.max(0, Math.min(1, clientX / window.innerWidth));
  };
  window.addEventListener('pointermove', (e) => setTarget(e.clientX), { passive: true });
  window.addEventListener('pointerdown', (e) => setTarget(e.clientX), { passive: true });

  const tick = (timestamp) => {
    const dt = prev ? Math.min(timestamp - prev, 100) : 16.67;
    prev = timestamp;
    const alpha = 1 - Math.pow(1 - EASE, dt / 16.67);
    const delta = target - current;
    current = Math.abs(delta) < 0.0003 ? target : current + delta * alpha;
    if (ready && current !== drawn) {
      draw();
      drawn = current;
    }
    requestAnimationFrame(tick);
  };
}
