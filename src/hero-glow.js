import { initCursorScrub } from './cursor-scrub.js';

const EASE = 0.02;
const SIGMA_BLUR = 48;
const SIGMA_SHARP = 0.5;
const NEAR = 0.1;
const FAR = 0.52;
const GAIN = 1;
const GAMMA = 1.3;
const GRAIN = 0.1;
const LOGO_X = 141 / 1384;
const LOGO_W = 1060 / 1384;
const LOGO_RATIO = 553 / 1060;
const START = [0.12, 0.62];

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
uniform vec2 uFocus;
uniform vec2 uLogo;
uniform vec4 uTune;
uniform vec3 uShape;

float hat(float x, float lo, float mid, float hi) {
  if (x <= mid) {
    if (lo >= mid) return 1.0;
    return clamp((x - lo) / (mid - lo), 0.0, 1.0);
  }
  if (hi <= mid) return 1.0;
  return clamp(1.0 - (x - mid) / (hi - mid), 0.0, 1.0);
}

void main() {
  vec2 p = vec2((vUv.x - uLogo.x) / uLogo.y, ((vUv.y * 778.0 - 85.0) / 553.0) * uShape.z);
  vec2 f = vec2(uFocus.x, uFocus.y * uShape.z);
  float d = length(p - f);
  float w = smoothstep(uShape.x, uShape.y, d);
  float s = mix(log(uTune.x), log(uTune.y), w);

  float l0 = log(0.5);
  float l1 = log(2.0);
  float l2 = log(4.0);
  float l3 = log(8.0);
  float l4 = log(16.0);
  float l5 = log(30.0);
  float l6 = log(55.0);
  float l7 = log(100.0);

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

  float v = pow(clamp(c * uTune.z, 0.0, 1.0), uTune.w);
  float noise = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5;
  float g = clamp(v * 201.0 + noise, 0.0, 196.0);
  vec3 base = texture2D(uRamp, vec2(0.5 / 197.0, 0.5)).rgb;
  vec3 col = max(texture2D(uRamp, vec2((g + 0.5) / 197.0, 0.5)).rgb - base, 0.0);
  float grain = fract(sin(dot(floor(gl_FragCoord.xy), vec2(39.3468, 11.1357))) * 24634.6345);
  float amp = ${GRAIN.toFixed(3)} * (1.0 - smoothstep(0.72, 0.98, v));
  col *= 1.0 - amp * step(0.5, grain);
  float alpha = clamp(max(col.r, max(col.g, col.b)), 0.0, 1.0);
  gl_FragColor = vec4(col, alpha);
}
`;

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
  const uFocus = gl.getUniformLocation(program, 'uFocus');
  gl.uniform4f(gl.getUniformLocation(program, 'uTune'), SIGMA_BLUR, SIGMA_SHARP, GAIN, GAMMA);
  gl.uniform3f(gl.getUniformLocation(program, 'uShape'), NEAR, FAR, LOGO_RATIO);
  gl.uniform2f(gl.getUniformLocation(program, 'uLogo'), LOGO_X, LOGO_W);

  let target = [...START];
  let current = [...START];
  let drawn = '';
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
      drawn = '';
    }
  };

  const draw = () => {
    gl.uniform2f(uFocus, current[0], current[1]);
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

  const setTarget = (clientX, clientY) => {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const fx = (clientX - rect.left) / rect.width;
    const fy = (clientY - rect.top) / rect.height;
    const u = (fx - LOGO_X) / LOGO_W;
    const v = (fy * 778 - 85) / 553;
    target = [Math.max(-0.1, Math.min(1.1, u)), Math.max(-0.15, Math.min(1.15, v))];
  };
  window.addEventListener('pointermove', (e) => setTarget(e.clientX, e.clientY), { passive: true });
  window.addEventListener('pointerdown', (e) => setTarget(e.clientX, e.clientY), { passive: true });

  const tick = (timestamp) => {
    const dt = prev ? Math.min(timestamp - prev, 100) : 16.67;
    prev = timestamp;
    const alpha = 1 - Math.pow(1 - EASE, dt / 16.67);
    for (let i = 0; i < 2; i++) {
      const delta = target[i] - current[i];
      current[i] = Math.abs(delta) < 0.0005 ? target[i] : current[i] + delta * alpha;
    }
    const key = `${current[0].toFixed(4)},${current[1].toFixed(4)}`;
    if (ready && key !== drawn) {
      draw();
      drawn = key;
    }
    requestAnimationFrame(tick);
  };
}
