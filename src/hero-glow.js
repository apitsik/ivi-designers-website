import { initCursorScrub } from './cursor-scrub.js';

const STIFF = 70;
const DAMP = 11;
const STRETCH = 0.5;
const MAX_STRETCH = 2.4;
const SIGMA_BLUR = 30;
const SIGMA_SHARP = 3.2;
const NEAR = 0.08;
const FAR = 0.5;
const GAIN = 1;
const GAMMA = 1.3;
const GRAIN = 0.13;
const LOGO_X = 141 / 1384;
const LOGO_W = 1060 / 1384;
const LOGO_RATIO = 553 / 1060;
const START = [0.12, 0.62];
const DROP = 4.5 / 778;

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
uniform float uDrop;
uniform vec3 uMove;

float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

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
  vec2 dv = p - f;
  float along = dot(dv, uMove.xy);
  vec2 across = dv - along * uMove.xy;
  float d = length(vec2(along / (1.0 + uMove.z), length(across)));
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

  vec2 tuv = vec2(vUv.x, vUv.y - uDrop);
  vec3 pa = texture2D(uA, tuv).rgb;
  vec3 pb = texture2D(uB, tuv).rgb;
  float c = hat(s, l0, l0, l1) * texture2D(uSharp, tuv).r;
  c += hat(s, l0, l1, l2) * pa.r;
  c += hat(s, l1, l2, l3) * pa.g;
  c += hat(s, l2, l3, l4) * pa.b;
  c += hat(s, l3, l4, l5) * pb.r;
  c += hat(s, l4, l5, l6) * pb.g;
  c += hat(s, l5, l6, l7) * pb.b;
  c += hat(s, l6, l7, l7) * texture2D(uC, tuv).r;

  float v = pow(clamp(c * uTune.z, 0.0, 1.0), uTune.w);
  float noise = hash(gl_FragCoord.xy + 17.0) - 0.5;
  float g = clamp(v * 201.0 + noise, 0.0, 196.0);
  vec3 base = texture2D(uRamp, vec2(0.5 / 197.0, 0.5)).rgb;
  vec3 col = max(texture2D(uRamp, vec2((g + 0.5) / 197.0, 0.5)).rgb - base, 0.0);
  float grain = hash(floor(gl_FragCoord.xy));
  float amp = ${GRAIN.toFixed(3)} * (1.0 - smoothstep(0.72, 0.98, v));
  col *= 1.0 - amp * step(0.5, grain);
  float alpha = clamp(max(col.r, max(col.g, col.b)), 0.0, 1.0);
  col += base * smoothstep(0.0, 0.6, alpha);
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
  gl.uniform1f(gl.getUniformLocation(program, 'uDrop'), DROP);
  const uMove = gl.getUniformLocation(program, 'uMove');
  const calm = window.matchMedia('(prefers-reduced-motion: reduce)');

  let target = [...START];
  let current = [...START];
  let vel = [0, 0];
  let dir = [1, 0];
  let drawn = '';
  let prev = 0;
  let ready = false;

  const fit = () => {
    const rect = canvas.getBoundingClientRect();
    const dpr = 2;
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
    const sp = Math.hypot(vel[0], vel[1]);
    if (sp > 0.05) dir = [vel[0] / sp, vel[1] / sp];
    gl.uniform2f(uFocus, current[0], current[1]);
    gl.uniform3f(uMove, dir[0], dir[1], calm.matches ? 0 : Math.min(sp * STRETCH, MAX_STRETCH));
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
    const dt = prev ? Math.min((timestamp - prev) / 1000, 0.05) : 0.0167;
    prev = timestamp;
    if (calm.matches) {
      current = [...target];
      vel = [0, 0];
    } else {
      for (let i = 0; i < 2; i++) {
        const acc = STIFF * (target[i] - current[i]) - DAMP * vel[i];
        vel[i] += acc * dt;
        current[i] += vel[i] * dt;
      }
      const rest = Math.hypot(vel[0], vel[1]) < 0.01 && Math.hypot(target[0] - current[0], target[1] - current[1]) < 0.0005;
      if (rest) {
        current = [...target];
        vel = [0, 0];
      }
    }
    const key = `${current[0].toFixed(4)},${current[1].toFixed(4)},${vel[0].toFixed(3)},${vel[1].toFixed(3)}`;
    if (ready && key !== drawn) {
      draw();
      drawn = key;
    }
    requestAnimationFrame(tick);
  };
}
