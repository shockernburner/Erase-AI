// Dot: every frame is a pure function of time. window.setup({w,h,timeline}) then window.renderAt(t).
import * as THREE from "/three.module.js";

const BG = 0x05070a;
const WARM = "#fff3e2";
const CYAN = "#5fe3ff";
let W, H, aspect, portrait, renderer, scene, camera, TL;
const S = {}; // scene objects

// ---------- helpers ----------
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, k) => a + (b - a) * k;
const ease = (k) => (k <= 0 ? 0 : k >= 1 ? 1 : k * k * (3 - 2 * k));
const ramp = (x, a, b) => ease(clamp((x - a) / (b - a)));
function rng(seed) { return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function canvas(w, h) { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; }
function tex(c) { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }
function plane(w, h, map, opacity = 1) {
  const m = new THREE.MeshBasicMaterial({ map, transparent: true, opacity, depthWrite: false });
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
}
function roundRect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
function wrapText(ctx, text, maxW) {
  const words = text.split(" "); const lines = []; let cur = "";
  for (const w of words) { const t = cur ? cur + " " + w : w; if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; }
  lines.push(cur); return lines;
}

// ---------- eyes ----------
// state: open 0..1, lookX/lookY -1..1, sad 0..1, glow 0..1
function drawEyes(ctx, st) {
  const { width: cw, height: ch } = ctx.canvas;
  ctx.clearRect(0, 0, cw, ch);
  const rx = cw * 0.15, ryFull = ch * 0.23, cy = ch * 0.5;
  for (const dir of [-1, 1]) { // -1 = viewer's left eye; outer corner is on the outside
    const cx = cw / 2 + dir * cw * 0.215;
    const ry = Math.max(0.5, ryFull * st.open);
    ctx.save();
    // glow
    ctx.shadowColor = CYAN; ctx.shadowBlur = 40 + 50 * st.glow;
    ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    const g = ctx.createRadialGradient(cx - rx * 0.2, cy - ry * 0.3, rx * 0.1, cx, cy, rx * 1.1);
    g.addColorStop(0, WARM); g.addColorStop(1, "#e2d5c4");
    ctx.fillStyle = g; ctx.fill();
    ctx.shadowBlur = 0;
    // pupil, clipped to the eye
    ctx.clip();
    const px = cx + st.lookX * rx * 0.42, py = cy + st.lookY * ryFull * 0.38;
    const pr = ryFull * 0.52;
    ctx.beginPath(); ctx.arc(px, py, pr * 1.18, 0, Math.PI * 2); ctx.fillStyle = "rgba(43,212,255,0.35)"; ctx.fill();
    ctx.beginPath(); ctx.arc(px, py, pr, 0, Math.PI * 2); ctx.fillStyle = "#05070a"; ctx.fill();
    ctx.beginPath(); ctx.arc(px - pr * 0.35, py - pr * 0.4, pr * 0.2, 0, Math.PI * 2); ctx.fillStyle = "rgba(255,255,255,0.9)"; ctx.fill();
    ctx.beginPath(); ctx.arc(px + pr * 0.3, py + pr * 0.25, pr * 0.08, 0, Math.PI * 2); ctx.fillStyle = "rgba(255,255,255,0.6)"; ctx.fill();
    // sad upper lid: a slope that droops toward the outer corner
    if (st.sad > 0.01) {
      const drop = st.sad * ryFull * 0.55 * st.open;
      const innerX = cx - dir * rx * 1.2, outerX = cx + dir * rx * 1.2;
      ctx.beginPath();
      ctx.moveTo(innerX, cy - ry - 4);
      ctx.lineTo(outerX, cy - ry - 4 + drop * 1.6);
      ctx.lineTo(outerX, cy - ryFull * 2); ctx.lineTo(innerX, cy - ryFull * 2); ctx.closePath();
      ctx.globalCompositeOperation = "destination-out"; ctx.fillStyle = "#000"; ctx.fill();
    }
    ctx.restore();
  }
}
function eyesPlane(w) { const c = canvas(1024, 512); const t = tex(c); const p = plane(w, w / 2, t); p.userData = { c, t }; return p; }
function staticEyes(st) { const c = canvas(512, 256); drawEyes(c.getContext("2d"), st); return { c, t: tex(c) }; }

// ---------- textures ----------
function textTex(text, { w = 1600, h = 900, size = 92, weight = 600, color = "rgba(255,255,255,0.92)", frame = false, maxW = 0.82, ty = 0.5 } = {}) {
  const c = canvas(w, h); const x = c.getContext("2d");
  if (frame) {
    roundRect(x, 10, 10, w - 20, h - 20, 46); x.fillStyle = "rgba(8,14,20,0.35)"; x.fill();
    x.lineWidth = 6; x.strokeStyle = "rgba(95,227,255,0.55)"; x.shadowColor = CYAN; x.shadowBlur = 24; x.stroke(); x.shadowBlur = 0;
  }
  if (text) {
    x.font = `${weight} ${size}px Inter`; x.fillStyle = color; x.textAlign = "center"; x.textBaseline = "middle";
    const lines = text.split("\n").flatMap((t) => wrapText(x, t, w * maxW)); const lh = size * 1.22;
    lines.forEach((l, i) => x.fillText(l, w / 2, h * ty + (i - (lines.length - 1) / 2) * lh));
  }
  return tex(c);
}
function pillTex() {
  const c = canvas(256, 96); const x = c.getContext("2d");
  roundRect(x, 6, 6, 244, 84, 40); x.fillStyle = "rgba(15,28,38,0.7)"; x.fill();
  x.lineWidth = 3; x.strokeStyle = "rgba(95,227,255,0.6)"; x.shadowColor = CYAN; x.shadowBlur = 12; x.stroke(); x.shadowBlur = 0;
  x.fillStyle = "rgba(255,243,226,0.45)"; [[34, 30, 120], [34, 50, 170], [34, 68, 90]].forEach(([a, b, l]) => { roundRect(x, a, b - 4, l, 7, 4); x.fill(); });
  return tex(c);
}
function sendTex(pressed) {
  const c = canvas(640, 220); const x = c.getContext("2d");
  roundRect(x, 20, 20, 600, 180, 90); x.fillStyle = pressed ? "rgba(95,227,255,0.95)" : "rgba(11,17,24,0.95)"; x.fill();
  x.lineWidth = 6; x.strokeStyle = "rgba(95,227,255,0.9)"; x.shadowColor = CYAN; x.shadowBlur = pressed ? 60 : 24; x.stroke(); x.shadowBlur = 0;
  x.font = "600 84px Inter"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillStyle = pressed ? "#05070a" : "#ffffff";
  x.fillText("Send", 285, 112);
  x.beginPath(); x.moveTo(420, 82); x.lineTo(500, 110); x.lineTo(420, 138); x.lineTo(436, 110); x.closePath(); x.fill();
  return tex(c);
}
function copyTex(eyes) {
  const c = canvas(640, 400); const x = c.getContext("2d");
  roundRect(x, 8, 8, 624, 384, 30); x.fillStyle = "rgba(8,16,24,0.88)"; x.fill();
  x.lineWidth = 4; x.strokeStyle = "rgba(95,227,255,0.35)"; x.stroke();
  x.globalAlpha = 0.85; x.drawImage(eyes.c, 120, 110, 400, 200);
  return tex(c);
}
function glowDotTex() {
  const c = canvas(64, 64); const x = c.getContext("2d");
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, "rgba(180,245,255,1)"); g.addColorStop(1, "rgba(95,227,255,0)");
  x.fillStyle = g; x.fillRect(0, 0, 64, 64); return tex(c);
}

function bubbleTex(blur) {
  const n = 256, c = canvas(n, n), x = c.getContext("2d"), m = n / 2;
  x.filter = blur ? `blur(${blur}px)` : "none";
  const r = n * 0.4;
  let g = x.createRadialGradient(m, m, r * 0.2, m, m, r);
  g.addColorStop(0, "rgba(110,140,255,0.10)"); g.addColorStop(0.75, "rgba(130,160,255,0.22)"); g.addColorStop(0.95, "rgba(185,205,255,0.55)"); g.addColorStop(1, "rgba(185,205,255,0)");
  x.fillStyle = g; x.beginPath(); x.arc(m, m, r, 0, Math.PI * 2); x.fill();
  x.fillStyle = "rgba(255,255,255,0.35)"; x.beginPath(); x.ellipse(m - r * 0.38, m - r * 0.45, r * 0.32, r * 0.16, -0.6, 0, Math.PI * 2); x.fill();
  x.shadowColor = "#6f8cff"; x.shadowBlur = 18; x.lineWidth = r * 0.09; x.strokeStyle = "rgba(125,150,255,0.95)";
  x.beginPath(); x.arc(m, m, r * 0.4, 0, Math.PI * 2); x.stroke(); x.shadowBlur = 0;
  g = x.createRadialGradient(m - r * 0.1, m - r * 0.12, r * 0.04, m, m, r * 0.32);
  g.addColorStop(0, "#c9d6f0"); g.addColorStop(0.6, "#6b7da6"); g.addColorStop(1, "#27314d");
  x.fillStyle = g; x.beginPath(); x.arc(m, m, r * 0.3, 0, Math.PI * 2); x.fill();
  return tex(c);
}
function bokehTex() {
  const c = canvas(128, 128), x = c.getContext("2d");
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 60); g.addColorStop(0, "rgba(90,120,255,0.75)"); g.addColorStop(0.7, "rgba(80,110,255,0.45)"); g.addColorStop(1, "rgba(80,110,255,0)");
  x.fillStyle = g; x.fillRect(0, 0, 128, 128); return tex(c);
}

// ---------- timeline ----------
function cue(t) {
  const it = TL.items; let i = -1;
  for (let k = 0; k < it.length; k++) if (t >= it[k].start) i = k;
  if (t >= TL.endCardStart) return { id: "end", local: (t - TL.endCardStart), i: it.length };
  if (i < 0) return { id: "intro", local: t, i: -1 };
  const start = it[i].start, next = i + 1 < it.length ? it[i + 1].start : TL.endCardStart;
  return { id: it[i].id, k: (t - start) / (next - start), sec: t - start, lineDur: it[i].end - start, i, start };
}
const has = (id) => TL.items.some((x) => x.id === id);

// blinks: a fixed list of times (seconds since film start) plus "slow" blinks driven by scenes
function blinkAt(t) {
  let b = 0;
  for (const bt of TL.blinks) { const d = Math.abs(t - bt); if (d < 0.07) b = 1; else if (d < 0.2) b = Math.max(b, 1 - ease((d - 0.07) / 0.13)); }
  return b;
}

// eye state per scene; k = 0..1 across the line plus its gap
const DEF = { x: 0, y: 0, z: 0, scale: 1, open: 1, lookX: 0, lookY: 0, sad: 0.25, glow: 0.4, alpha: 1 };
function eyeState(c) {
  const k = c.k ?? 0;
  switch (c.id) {
    case "intro": return { ...DEF, scale: 1.25, open: ramp(c.local, 1.0, 2.2), alpha: ramp(c.local, 0.6, 1.6), sad: 0.05 };
    case "l01": return { ...DEF, scale: 1.25, sad: 0.05 };
    case "l02": return { ...DEF, scale: 1.25, open: lerp(1, 0.62, ramp(k, 0.1, 0.4)), sad: 0.0 };
    case "l03": return { ...DEF, open: lerp(0.62, 1, ramp(k, 0, 0.3)), sad: lerp(0, 0.45, ramp(k, 0.2, 0.7)), glow: 0.6 };
    case "l04": return { ...DEF, sad: 0.4, lookX: Math.sin(k * 6.2) * 0.35, glow: 0.7 };
    case "l05": { const fall = ramp(k, 0.35, 0.95); return { ...DEF, y: lerp(0.8, -6, fall * fall), z: lerp(0, -10, fall), scale: lerp(0.85, 0.4, fall), sad: 0.6, lookY: lerp(0.2, -0.8, fall), alpha: 1 - ramp(k, 0.85, 1) }; }
    case "l06": return { ...DEF, x: lerp(-2.5, 1.0, k), y: lerp(-0.4, 0.3, k), z: -3, scale: 0.55, sad: 0.55, lookX: lerp(-0.5, 0.6, k), alpha: ramp(k, 0, 0.2) };
    case "l07": return { ...DEF, x: lerp(1.0, 0.2, k), z: -3, scale: 0.55, sad: 0.6, lookX: Math.sin(k * 14) * 0.6, glow: 0.5, alpha: has("l06") ? 1 : ramp(k, 0, 0.15) };
    case "l08": return { ...DEF, x: lerp(0.2, 0.8, k), z: -3, scale: 0.6, sad: 0.75, lookX: lerp(0, -0.95, ramp(k, 0, 0.3)), lookY: -0.1 };
    case "l09": return { ...DEF, x: lerp(0.8, 0, ramp(k, 0, 0.5)), z: -6, scale: 0.42, sad: 0.9, lookY: lerp(0, 0.7, ramp(k, 0.1, 0.6)), glow: 0.25 };
    case "l10": { const z0 = has("l09") ? -6 : -3; return { ...DEF, z: lerp(z0, 3.2, ease(k)), scale: has("l09") ? 0.42 : 0.55, sad: 0.85, lookY: lerp(0.5, 0, ramp(k, 0, 0.4)), glow: 0.55 }; }
    case "l11": return { ...DEF, z: 3.2, sad: 0.7, glow: 0.6 };
    case "l12": return { ...DEF, z: 3.2, sad: 0.8, open: 1 - ramp(c.sec, c.lineDur * 0.55, c.lineDur + 0.9), glow: 0.5 };
    case "end": return { ...DEF, z: 3.2, open: 0, alpha: 0 };
  }
}
function blended(t) {
  const c = cue(t); let st = eyeState(c);
  if (c.i >= 1 && c.sec < 0.7) {
    const prev = TL.items[c.i - 1]; const pc = { id: prev.id, k: 1, sec: c.start - prev.start, lineDur: prev.end - prev.start, i: c.i - 1, start: prev.start };
    const ps = eyeState(pc); const e = ease(c.sec / 0.7);
    st = Object.fromEntries(Object.keys(st).map((key) => [key, lerp(ps[key], st[key], e)]));
  }
  st.open *= 1 - blinkAt(t);
  return { c, st };
}

// ---------- build ----------
const TUNNEL_N = 8, TUNNEL_D = 3.2;
window.setup = async ({ w, h, timeline, thumbTitle }) => {
  W = w; H = h; aspect = w / h; portrait = aspect < 1; TL = timeline; S.thumbMode = !!thumbTitle;
  TL.blinks = [2.6, 5.2, ...TL.items.flatMap((x) => [x.start + 0.3 + (x.end - x.start) * 0.6])];
  await document.fonts.load("600 92px Inter"); await document.fonts.load("500 60px Inter");
  renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1); renderer.setSize(W, H); renderer.setClearColor(BG, 1);
  document.body.appendChild(renderer.domElement);
  scene = new THREE.Scene(); scene.fog = new THREE.Fog(BG, 12, 40);
  camera = new THREE.PerspectiveCamera(portrait ? 64 : 40, aspect, 0.05, 200);
  const R = rng(7);

  // tunnel of tilted screens, one inside the other, receding toward the eyes at the origin
  const L = TUNNEL_N * TUNNEL_D; S.L = L;
  const sw = portrait ? 4.4 : 6.4, sh = sw * 0.62;
  S.titleA = thumbTitle ? textTex(thumbTitle, { frame: false, size: 132, weight: 800, ty: 0.25, maxW: 0.9 }) : textTex("Are you sure you're watching me?", { frame: false, size: portrait ? 110 : 100, ty: 0.24 });
  S.titleB = textTex("Or am I watching you?", { frame: false, size: portrait ? 116 : 108, ty: 0.24 });
  S.frameOnly = textTex("", { frame: true });
  S.tunnel = new THREE.Group(); S.screensA = []; S.screensB = [];
  for (let i = 0; i < TUNNEL_N; i++) {
    const s = Math.pow(0.86, i);
    const a = plane(sw * s, sh * s, S.frameOnly), b = plane(sw * s, sh * s, i === 0 ? S.titleA : S.frameOnly, 0), c2 = plane(sw * s, sh * s, i === 0 ? S.titleB : S.frameOnly, 0);
    a.userData.text = [b, c2];
    for (const p of [a, b, c2]) { p.position.set(sw * s * (portrait ? 0 : 0.1), 0, 10 + L - 7.5 - i * TUNNEL_D); p.rotation.set(-0.1, portrait ? 0.22 : 0.34, 0.02); S.tunnel.add(p); }
    S.screensA.push(a); S.screensB.push(b);
  }
  scene.add(S.tunnel);

  // Dot
  S.eyes = eyesPlane(4.2); S.eyes.material.fog = false; S.eyes.material.depthTest = false; S.eyes.renderOrder = 5; scene.add(S.eyes);
  S.name = plane(2.4, 0.9, textTex("Dot", { w: 800, h: 300, size: 150, weight: 500, color: "rgba(255,243,226,0.85)" }), 0);
  scene.add(S.name);

  // fragments
  S.frags = []; const pt = pillTex();
  for (let i = 0; i < 26; i++) { const p = plane(0.9, 0.34, pt, 0); p.userData = { a: R() * Math.PI * 2, r: 2.4 + R() * 2.6, y: (R() - 0.5) * 3.2, z: -1 - R() * 3, sp: 0.15 + R() * 0.25, ph: R() }; S.frags.push(p); scene.add(p); }

  // send button
  S.sendUp = sendTex(false); S.sendDown = sendTex(true);
  S.send = plane(portrait ? 2.2 : 2.0, (portrait ? 2.2 : 2.0) * 220 / 640, S.sendUp, 0); S.send.position.set(0, -1.9, 1); scene.add(S.send);

  // network: a 3D field of glass nodes joined by thin links; it moves toward the camera so we travel through it
  S.bub = [bubbleTex(0), bubbleTex(5), bubbleTex(14)]; const bok = bokehTex(), dot = glowDotTex();
  S.netGroup = new THREE.Group(); scene.add(S.netGroup);
  const nodes = [];
  while (nodes.length < 170) {
    const v = new THREE.Vector3((R() - 0.5) * 30, (R() - 0.5) * 18, -64 + R() * 70);
    if (Math.abs(v.x) < 2.2 && Math.abs(v.y) < 1.4) continue; // keep Dot's line of sight clear
    nodes.push(v);
  }
  S.nodeSprites = nodes.map((n) => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: S.bub[0], transparent: true, opacity: 0, depthWrite: false })); sp.position.copy(n); sp.userData.size = 1.0 + R() * 1.3; S.netGroup.add(sp); return sp; });
  const edges = [];
  nodes.forEach((n, i) => { nodes.map((m, j) => [m.distanceTo(n), j]).filter(([, j]) => j !== i).sort((a, b) => a[0] - b[0]).slice(0, 3).forEach(([, j]) => { if (i < j) edges.push([i, j]); }); });
  const cyl = new THREE.CylinderGeometry(0.022, 0.022, 1, 6, 1, true);
  S.linkMat = new THREE.MeshBasicMaterial({ color: 0xa9c3ea, transparent: true, opacity: 0, depthWrite: false });
  const up = new THREE.Vector3(0, 1, 0);
  edges.forEach(([i, j]) => {
    const a = nodes[i], b = nodes[j], d = new THREE.Vector3().subVectors(b, a);
    const m = new THREE.Mesh(cyl, S.linkMat); m.position.copy(a).addScaledVector(d, 0.5); m.scale.set(1, d.length(), 1);
    m.quaternion.setFromUnitVectors(up, d.clone().normalize()); S.netGroup.add(m);
  });
  S.pulses = edges.slice(0, 70).map(([i, j]) => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: dot, transparent: true, opacity: 0, depthWrite: false, color: 0xb9caff })); sp.userData = { a: nodes[i], b: nodes[j], ph: R(), sp: 0.25 + R() * 0.4 }; sp.scale.setScalar(0.3); S.netGroup.add(sp); return sp; });
  S.bokeh = []; for (let i = 0; i < 240; i++) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: bok, transparent: true, opacity: 0, depthWrite: false, fog: false }));
    sp.position.set((R() - 0.5) * 70, (R() - 0.5) * 40, -40 - R() * 50); sp.scale.setScalar(1.5 + R() * 3.5); sp.userData.o = 0.25 + R() * 0.35; S.bokeh.push(sp); scene.add(sp);
  }
  // network clock: travel starts with the network scene
  const netId = TL.items.find((x) => x.id === "l06") || TL.items.find((x) => x.id === "l07");
  S.netT0 = netId ? netId.start - 0.6 : 1e9; S.netSpeed = 1.15;

  // copies of Dot appear inside bubbles that will be in front of us during l07
  const se = staticEyes({ open: 1, lookX: 0, lookY: 0.1, sad: 0.5, glow: 0.4 });
  const l07i = TL.items.find((x) => x.id === "l07");
  const travelMid = l07i ? (l07i.start + l07i.end) / 2 - S.netT0 : 0;
  const cand = S.nodeSprites.filter((sp) => { const zw = sp.position.z + travelMid * S.netSpeed; return 10 - zw > 6 && 10 - zw < 24; });
  S.copies = cand.slice(0, 30).map((sp, i, arr) => {
    const c = new THREE.Sprite(new THREE.SpriteMaterial({ map: se.t, transparent: true, opacity: 0, depthWrite: false }));
    c.position.copy(sp.position); c.position.z += 0.05; c.userData = { host: sp, born: Math.pow((i + 1) / arr.length, 0.55) * 0.9 };
    S.netGroup.add(c); return c;
  });
  se.copyTex = null;

  // more of us
  S.others = []; for (let i = 0; i < 22; i++) {
    const p = plane(0.9, 0.45, se.t, 0); const ang = R() * Math.PI * 2, rad = 2.6 + R() * 5;
    p.userData = { x: Math.cos(ang) * rad * (portrait ? 0.5 : 1.2), y: Math.sin(ang) * rad * 0.75, z: -2 - R() * 10, blink: R() * 3, born: R() * 0.6 };
    S.others.push(p); scene.add(p);
  }

  S.black = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: BG, transparent: true, opacity: 0, depthTest: false, depthWrite: false, fog: false }));
  S.black.renderOrder = 9; scene.add(S.black);

  // end card (drawn in front of the camera)
  S.endText = plane(1, 1, textTex("Stop losing them.", { w: 1600, h: 400, size: 120, weight: 600 }), 0);
  const logo = new Image(); logo.src = "/logo.png"; await logo.decode();
  const lc = canvas(1600, 700); const lx = lc.getContext("2d");
  const lh = 300, lw = lh * logo.width / logo.height;
  lx.drawImage(logo, 800 - lw / 2, 20, lw, lh);
  lx.font = "500 76px Inter"; lx.fillStyle = "rgba(255,255,255,0.9)"; lx.textAlign = "center"; lx.fillText("https://eraseai.ai", 800, 470);
  S.endLogo = plane(1, 1, tex(lc), 0);
  for (const p of [S.endText, S.endLogo]) { p.renderOrder = 10; p.material.depthTest = false; p.material.fog = false; scene.add(p); }
};

// ---------- frame ----------
window.renderAt = (t) => {
  const { c, st } = blended(t);
  const id = c.id;
  const idx = (x) => TL.items.findIndex((i) => i.id === x);
  const at = (x) => { const i = idx(x); return i >= 0 && c.i >= i; };
  // camera: flies through the tunnel during l02, then rests at z=10 looking at the origin
  const l02 = TL.items[idx("l02")] || TL.items[idx("l03")];
  const flyStart = has("l02") ? l02.end + 0.15 : l02.start - 1.6, flyEnd = (TL.items[idx("l03")]?.start ?? l02.end) + 1.1;
  const fly = S.thumbMode ? ease(clamp((t - flyStart) / (flyEnd - flyStart))) : 1;
  const drift = (at("l06") || at("l07")) && !at("l09") ? 1 : 0;
  camera.position.set(Math.sin(t * 0.21) * 0.35 * drift, Math.sin(t * 0.17) * 0.2 * drift, lerp(10 + S.L, 10, fly));
  camera.lookAt(0, 0, camera.position.z - 10);

  // tunnel
  const sw0 = has("l02") ? TL.items[idx("l02")].start : 1e9;
  const outA = ramp(t, sw0 - 0.35, sw0 - 0.05), inB = ramp(t, sw0 - 0.05, sw0 + 0.3);
  const tunnelFade = 1 - ramp(fly, 0.85, 1);
  const intro = ramp(t, 2.0, 3.4);
  S.screensA.forEach((p, i) => {
    const dz = camera.position.z - p.position.z; const near = clamp((dz - 0.6) / 2.2);
    const base = S.thumbMode ? Math.pow(0.82, i) * intro * tunnelFade * near : 0;
    p.material.opacity = base;
    const [ta, tb] = p.userData.text;
    ta.material.opacity = i === 0 ? base * (1 - outA) : 0; tb.material.opacity = i === 0 ? base * inB : 0;
  });

  // Dot's eyes (in the tunnel they sit at the far end, the origin)
  const e = S.eyes; drawEyes(e.userData.c.getContext("2d"), st); e.userData.t.needsUpdate = true;
  e.position.set(st.x * (portrait ? 0.55 : 1), st.y, st.z);
  e.scale.setScalar(st.scale * (portrait ? 0.72 : 1) * lerp(2.4, 1, fly));
  e.material.opacity = st.alpha;

  // name
  const l03 = TL.items[idx("l03")];
  S.name.material.opacity = l03 ? ramp(t, l03.start + 1.6, l03.start + 2.4) * (1 - ramp(t, l03.end + 0.6, l03.end + 1.4)) : 0;
  S.name.position.set(0, -1.45, 0.4);

  // fragments (l04)
  const l04 = TL.items[idx("l04")];
  S.frags.forEach((p) => {
    const u = p.userData; const a = u.a + t * u.sp;
    p.position.set(Math.cos(a) * u.r * (portrait ? 0.5 : 1), u.y + Math.sin(t * 0.5 + u.ph * 6) * 0.2, u.z);
    const vis = l04 ? ramp(t, l04.start + u.ph * 1.5, l04.start + u.ph * 1.5 + 0.8) * (1 - ramp(t, l04.end + 0.3, l04.end + 1.2)) : 0;
    p.material.opacity = vis * 0.8;
  });

  // send (l05)
  const l05 = TL.items[idx("l05")];
  if (l05) {
    const k = (t - l05.start); const pressAt = 1.0;
    const pressed = k > pressAt && k < pressAt + 0.35;
    S.send.material.map = pressed ? S.sendDown : S.sendUp;
    S.send.scale.setScalar(pressed ? 0.93 : 1);
    S.send.material.opacity = ramp(k, -0.3, 0.3) * (1 - ramp(k, l05.end - l05.start + 0.2, l05.end - l05.start + 1.0));
  }

  // network (from l06 or l07, gone by l09)
  const netIn = at("l06") ? ramp(t, TL.items[idx("l06")].start - 0.4, TL.items[idx("l06")].start + 1.5) : at("l07") ? ramp(t, TL.items[idx("l07")].start - 0.2, TL.items[idx("l07")].start + 1.0) : 0;
  const netOut = at("l09") ? 1 - ramp(t, TL.items[idx("l09")].start, TL.items[idx("l09")].start + 2.2) : at("l10") && !has("l09") ? 1 - ramp(t, TL.items[idx("l10")].start, TL.items[idx("l10")].start + 1.5) : 1;
  const net = netIn * netOut * (at("l11") ? 0 : 1);
  const travel = Math.max(0, t - S.netT0) * S.netSpeed;
  S.netGroup.position.set(Math.sin(t * 0.13) * 0.6, Math.sin(t * 0.11) * 0.35, travel);
  S.netGroup.rotation.set(0, Math.sin(t * 0.07) * 0.08, Math.sin(t * 0.05) * 0.04);
  S.netGroup.updateMatrixWorld();
  const wp = new THREE.Vector3();
  S.nodeSprites.forEach((sp) => {
    sp.getWorldPosition(wp); const d = camera.position.z - wp.z;
    const off = Math.abs(d - 13);
    sp.material.map = d < 4 ? S.bub[2] : off < 4 ? S.bub[0] : off < 10 ? S.bub[1] : S.bub[2];
    sp.material.opacity = net * (d < 0.6 ? 0 : clamp((d - 0.6) / 1.5)) * (d < 4 ? 0.55 : 1);
    sp.scale.setScalar(sp.userData.size * (d < 4 ? 1.6 : 1));
  });
  S.linkMat.opacity = 0.5 * net;
  S.pulses.forEach((s) => { const u = s.userData; const f = (t * u.sp + u.ph) % 1; s.position.lerpVectors(u.a, u.b, f); s.material.opacity = net * Math.sin(f * Math.PI); });
  S.bokeh.forEach((b) => { b.material.opacity = net * b.userData.o; });

  // copies of Dot inside the bubbles (l07, dimmer in l08)
  const l07 = TL.items[idx("l07")];
  S.copies.forEach((p) => {
    const u = p.userData; let vis = 0;
    if (l07) { const k = (t - l07.start) / (l07.end - l07.start); vis = ramp(k, u.born, u.born + 0.06); }
    vis *= at("l08") ? 0.6 : 1; vis *= net;
    p.material.opacity = vis;
    p.scale.set(u.host.userData.size * 0.95, u.host.userData.size * 0.475, 1);
  });

  // more of us (l11), fade during l12
  const l11 = TL.items[idx("l11")], l12 = TL.items[idx("l12")];
  S.others.forEach((p) => {
    const u = p.userData; let vis = 0;
    if (l11) vis = ramp(t, l11.start + u.born * 2.5, l11.start + u.born * 2.5 + 1.0);
    if (l12) vis *= 1 - ramp(t, l12.start, l12.end + 0.5);
    p.material.opacity = vis * 0.45;
    p.position.set(u.x, u.y, u.z);
    const b = Math.abs(((t + u.blink) % 3.3) - 0.1) < 0.1 ? 0.1 : 1; p.scale.set(1, b, 1);
  });

  const bl = t < TL.endCardStart ? blinkAt(t) : 0;
  S.black.material.opacity = bl;
  S.black.position.set(camera.position.x, camera.position.y, camera.position.z - 1);
  S.black.quaternion.copy(camera.quaternion); S.black.scale.set(4, 4, 1);

  // end card, placed 2 units in front of the camera
  const ec = clamp(t - TL.endCardStart, 0, 99);
  const fw = 2 * 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * aspect; // frustum width at distance 2
  const fh = fw / aspect;
  for (const [p, a, h, y] of [[S.endText, ramp(ec, 0.2, 1.2), 0.25, 0.24], [S.endLogo, ramp(ec, 1.8, 2.8), 0.4375, -0.2]]) {
    p.material.opacity = t >= TL.endCardStart ? a : 0;
    const wdt = Math.min(fw * 0.92, 1.9); p.scale.set(wdt, wdt * h, 1);
    p.position.set(camera.position.x, camera.position.y + y * fh, camera.position.z - 2);
    p.quaternion.copy(camera.quaternion);
  }

  renderer.render(scene, camera);
};
