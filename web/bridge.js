// The bridge view: an original starship bridge, inspired by Star Trek: The Next Generation, drawn with three.js.
// Decorative only. It computes and shows no results: clicking a viewscreen calls onSelect(i), and app.js opens
// that section. Every shape here is simple geometry made in code; no models, images or sounds are loaded.
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

const LC = { orange: "#ff9c00", peach: "#ffcc99", lilac: "#cc99cc", blue: "#9ab4ff", red: "#e0705f" };
const SCREENS = [
  { key: "main", title: "1 · Beyond Accuracy", where: "Main viewscreen" },
  { key: "port", title: "2 · A Threshold for the Job", where: "Port display" },
  { key: "starboard", title: "3 · Training vs. Test", where: "Starboard display" },
];

export function initBridge(canvas, { onSelect, reducedMotion }) {
  const probe = document.createElement("canvas");
  if (!(probe.getContext("webgl2") || probe.getContext("webgl"))) throw new Error("WebGL is not available");

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#050608");
  scene.fog = new THREE.Fog("#050608", 14, 30);
  const camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.05, 80);
  // Keep the whole forward view in frame on tall, narrow screens (phones): widen the vertical field of view.
  const fitFov = () => {
    const aspect = window.innerWidth / window.innerHeight;
    const hfov = 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(58) / 2) * 1.6);
    camera.fov = aspect >= 1.6 ? 58 : Math.min(100, THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(hfov / 2) / aspect)));
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
  };
  fitFov();

  // ---------------------------------------------------------------- the warp field (rendered into the main viewscreen)
  const warp = makeWarp();
  const rt = new THREE.WebGLRenderTarget(1024, 512, { samples: 4 });
  rt.texture.colorSpace = THREE.SRGBColorSpace;

  // ---------------------------------------------------------------- materials
  const mat = {
    wall: new THREE.MeshStandardMaterial({ color: "#7d6a58", roughness: 0.85, metalness: 0.05, side: THREE.BackSide }),
    panelWall: new THREE.MeshStandardMaterial({ color: "#6c5a49", roughness: 0.8 }),
    wood: new THREE.MeshStandardMaterial({ color: "#7a4a2a", roughness: 0.45, metalness: 0.1 }),
    carpet: new THREE.MeshStandardMaterial({ color: "#3b2630", roughness: 1 }),
    deck: new THREE.MeshStandardMaterial({ color: "#2b2b31", roughness: 0.7, metalness: 0.2 }),
    frame: new THREE.MeshStandardMaterial({ color: "#26272c", roughness: 0.35, metalness: 0.6, emissive: new THREE.Color("#000000") }),
    console: new THREE.MeshStandardMaterial({ color: "#3a3b42", roughness: 0.5, metalness: 0.3 }),
    seat: new THREE.MeshStandardMaterial({ color: "#5b4a3a", roughness: 0.9 }),
    ceiling: new THREE.MeshStandardMaterial({ color: "#3d362f", roughness: 0.9, side: THREE.DoubleSide }),
    lightStrip: new THREE.MeshBasicMaterial({ color: new THREE.Color("#ffe9cc").multiplyScalar(2.2) }),
  };
  const glow = (hex, k = 1.6) => new THREE.MeshBasicMaterial({ color: new THREE.Color(hex).multiplyScalar(k) });

  // ---------------------------------------------------------------- the room
  const room = new THREE.Group();
  scene.add(room);
  const R = 9, HROOM = 5.2;
  const walls = new THREE.Mesh(new THREE.CylinderGeometry(R, R, HROOM, 64, 1, true), mat.wall);
  walls.position.y = HROOM / 2;
  room.add(walls);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(R, 64), mat.carpet);
  floor.rotation.x = -Math.PI / 2;
  room.add(floor);
  const ceiling = new THREE.Mesh(new THREE.CircleGeometry(R, 64), mat.ceiling);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = HROOM;
  room.add(ceiling);
  // Recessed ceiling light ring and a dome
  const ring = new THREE.Mesh(new THREE.TorusGeometry(5.2, 0.05, 8, 96), mat.lightStrip);
  ring.rotation.x = Math.PI / 2; ring.position.y = HROOM - 0.02;
  room.add(ring);
  const dome = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.6, 0.35, 48, 1, true), mat.ceiling);
  dome.position.y = HROOM - 0.18;
  room.add(dome);

  // Raised command deck around the camera, with a wooden rail behind it
  const deck = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.4, 0.22, 64), mat.deck);
  deck.position.set(0, 0.11, 3.2);
  room.add(deck);
  // The curved wooden rail sits behind the command seats, as on the ship that inspired it.
  const rail = new THREE.Mesh(new THREE.TorusGeometry(3.3, 0.1, 10, 80, Math.PI), mat.wood);
  rail.rotation.set(Math.PI / 2, 0, 0);
  rail.position.set(0, 1.05, 3.6);
  room.add(rail);

  // Forward wall that holds the main viewscreen, with pilasters and light strips
  const front = new THREE.Mesh(new THREE.PlaneGeometry(13, HROOM), mat.panelWall);
  front.position.set(0, HROOM / 2, -7.6);
  room.add(front);
  for (const side of [-1, 1]) {
    const pil = new THREE.Mesh(new THREE.BoxGeometry(0.7, HROOM, 0.5), mat.wood);
    pil.position.set(side * 5.3, HROOM / 2, -7.4);
    room.add(pil);
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.08, 3.2, 0.06), glow(LC.orange, 1.4));
    strip.position.set(side * 4.85, 2.4, -7.3);
    room.add(strip);
    // Long LCARS light bands along the side walls
    const band = new THREE.Mesh(new THREE.TorusGeometry(R - 0.12, 0.035, 6, 80, Math.PI * 0.42), glow(side < 0 ? LC.lilac : LC.blue, 1.3));
    band.rotation.set(Math.PI / 2, 0, side < 0 ? Math.PI * 0.62 : -Math.PI * 0.04);
    band.position.y = 1.35;
    room.add(band);
  }

  // ---------------------------------------------------------------- the three screens (click targets)
  const targets = [];
  // Main viewscreen: a framed window showing the warp field
  const mainGroup = new THREE.Group();
  mainGroup.position.set(0, 2.45, -7.5);
  const sw = 8.6, sh = 3.9;
  const frameShape = roundedRect(sw + 0.6, sh + 0.6, 0.35);
  frameShape.holes.push(roundedRect(sw, sh, 0.2));
  const frameMesh = new THREE.Mesh(new THREE.ExtrudeGeometry(frameShape, { depth: 0.25, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.04, bevelSegments: 2 }), mat.frame.clone());
  frameMesh.position.z = -0.05;
  mainGroup.add(frameMesh);
  const mainScreen = new THREE.Mesh(new THREE.PlaneGeometry(sw, sh), new THREE.MeshBasicMaterial({ map: rt.texture, toneMapped: false }));
  mainScreen.position.z = 0.02;
  mainGroup.add(mainScreen);
  const mainLabel = labelPlate(SCREENS[0]);
  mainLabel.position.set(0, sh / 2 + 0.62, 0.15);
  mainGroup.add(mainLabel);
  room.add(mainGroup);
  targets.push({ index: 0, group: mainGroup, hit: [mainScreen, frameMesh], frame: frameMesh,
                 view: { pos: new THREE.Vector3(0, 2.45, -2.6), look: new THREE.Vector3(0, 2.45, -7.5) } });

  // Port and starboard displays: angled LCARS panels on the side walls
  for (const [index, side] of [[1, -1], [2, 1]]) {
    const g = new THREE.Group();
    const angle = side * -0.82;
    g.position.set(side * 5.9, 2.25, -4.4);
    g.rotation.y = angle;
    const back = new THREE.Mesh(new THREE.BoxGeometry(3.3, 2.2, 0.18), mat.frame.clone());
    g.add(back);
    const tex = lcarsTexture(SCREENS[index], index);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(3.05, 1.95), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
    face.position.z = 0.1;
    g.add(face);
    const sill = new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.12, 0.5), mat.wood);
    sill.position.set(0, -1.2, 0.15);
    g.add(sill);
    room.add(g);
    const normal = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);
    targets.push({ index, group: g, hit: [face, back], frame: back, texture: tex,
                   view: { pos: g.position.clone().addScaledVector(normal, 3.1).setY(2.25), look: g.position.clone() } });
  }

  // ---------------------------------------------------------------- forward stations and seats (seen from behind)
  for (const side of [-1, 1]) {
    const st = new THREE.Group();
    st.position.set(side * 1.35, 0, -2.3);
    st.rotation.y = side * 0.12;
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.85, 0.7), mat.console);
    body.position.y = 0.43;
    st.add(body);
    const top = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.06, 0.95), mat.console);
    top.position.set(0, 0.9, -0.05);
    top.rotation.x = -0.25;
    st.add(top);
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.7), new THREE.MeshBasicMaterial({ map: consoleTexture(side), toneMapped: false }));
    screen.position.set(0, 0.94, -0.05);
    screen.rotation.x = -Math.PI / 2 + 0.25 + 0.0001;
    screen.rotation.order = "YXZ";
    st.add(screen);
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.12, 0.6), mat.seat);
    seat.position.set(0, 0.5, 0.75);
    st.add(seat);
    const backrest = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.75, 0.12), mat.seat);
    backrest.position.set(0, 0.92, 1.05);
    backrest.rotation.x = -0.12;
    st.add(backrest);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.12, 0.5, 12), mat.frame);
    post.position.set(0, 0.25, 0.8);
    st.add(post);
    room.add(st);
  }

  // ---------------------------------------------------------------- light
  scene.add(new THREE.HemisphereLight("#ffe6c9", "#1b1216", 0.65));
  const key = new THREE.PointLight("#ffd9b0", 30, 18, 1.6);
  key.position.set(0, 4.6, 0.5);
  scene.add(key);
  const fill = new THREE.PointLight("#9ab4ff", 10, 14, 1.8);
  fill.position.set(0, 3, -5.5);
  scene.add(fill);

  // ---------------------------------------------------------------- post-processing: a soft glow on the lit panels
  const composer = new EffectComposer(renderer);
  composer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  composer.setSize(window.innerWidth, window.innerHeight);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.55, 0.55, 0.78);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  // ---------------------------------------------------------------- camera poses and moves
  const home = { pos: new THREE.Vector3(0, 1.62, 4.1), look: new THREE.Vector3(0, 2.2, -7.5) };
  const cam = { pos: home.pos.clone(), look: home.look.clone() };
  let flight = null; // { from, to, t0, dur, done }
  let atHome = true;
  const place = () => { camera.position.copy(cam.pos); camera.lookAt(cam.look); };
  place();

  function flyTo(to, done, instant) {
    if (instant || reducedMotion()) {
      cam.pos.copy(to.pos); cam.look.copy(to.look); place(); flight = null;
      renderOnce();
      done?.();
      return;
    }
    flight = { from: { pos: cam.pos.clone(), look: cam.look.clone() }, to, t0: performance.now(), dur: 1050, done };
    start();
  }

  // ---------------------------------------------------------------- pointer: hover and click on screens
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let hovered = null;
  const hitTargets = targets.flatMap((t) => t.hit.map((m) => ((m.userData.target = t), m)));
  function pick(e) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    return ray.intersectObjects(hitTargets, false)[0]?.object.userData.target || null;
  }
  function setHover(t) {
    if (t === hovered) return;
    if (hovered) hovered.frame.material.emissive.set("#000000");
    hovered = t;
    if (t) t.frame.material.emissive.set(t.index === 0 ? LC.orange : LC.lilac).multiplyScalar(0.35);
    canvas.style.cursor = t ? "pointer" : "default";
  }
  canvas.addEventListener("pointermove", (e) => { if (atHome && !flight) setHover(pick(e)); });
  canvas.addEventListener("pointerleave", () => setHover(null));
  canvas.addEventListener("click", (e) => {
    if (!atHome || flight) return;
    const t = pick(e);
    if (t) onSelect(t.index);
  });

  // ---------------------------------------------------------------- loop
  let running = false, paused = false, raf = 0, last = performance.now();
  const clock = { t: 0 };
  function frame(now) {
    raf = 0;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    clock.t += dt;
    if (flight) {
      const k = Math.min(1, (now - flight.t0) / flight.dur);
      const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      cam.pos.lerpVectors(flight.from.pos, flight.to.pos, e);
      cam.look.lerpVectors(flight.from.look, flight.to.look, e);
      place();
      if (k >= 1) { const done = flight.done; flight = null; done?.(); }
    } else if (atHome && !reducedMotion()) {
      // A slow, slight drift so the bridge feels alive.
      camera.position.set(cam.pos.x + Math.sin(clock.t * 0.25) * 0.05, cam.pos.y + Math.sin(clock.t * 0.4) * 0.02, cam.pos.z);
      camera.lookAt(cam.look);
    }
    warp.step(reducedMotion() ? dt * 0.25 : dt);
    draw();
    if (running && !paused) raf = requestAnimationFrame(frame);
  }
  function draw() {
    renderer.setRenderTarget(rt);
    renderer.render(warp.scene, warp.camera);
    renderer.setRenderTarget(null);
    composer.render();
  }
  function renderOnce() { draw(); }
  function start() {
    running = true;
    if (!paused && !raf) { last = performance.now(); raf = requestAnimationFrame(frame); }
  }
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) { cancelAnimationFrame(raf); raf = 0; } else start();
  });
  window.addEventListener("resize", () => {
    fitFov();
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    composer.setSize(window.innerWidth, window.innerHeight);
    bloom.resolution.set(window.innerWidth, window.innerHeight);
    renderOnce();
  });

  // Redraw the LCARS textures once the Antonio font has loaded.
  document.fonts?.load("700 40px Antonio").then(() => {
    for (const t of targets) if (t.texture) { t.texture.image = lcarsCanvas(SCREENS[t.index], t.index); t.texture.needsUpdate = true; }
    mainLabel.material.map.image = labelCanvas(SCREENS[0]);
    mainLabel.material.map.needsUpdate = true;
    renderOnce();
  }).catch(() => {});

  start();

  return {
    focusScreen(i, done, instant) {
      const t = targets.find((x) => x.index === i);
      setHover(null);
      atHome = false;
      flyTo(t.view, done, instant);
    },
    home() { atHome = true; flyTo(home); },
    setPaused(p) {
      paused = p;
      if (p) { cancelAnimationFrame(raf); raf = 0; } else start();
    },
  };
}

// ---------------------------------------------------------------- helpers
function roundedRect(w, h, r) {
  const s = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

// Star streaks rushing past: the view through the main viewscreen at warp.
function makeWarp() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#02040c");
  const camera = new THREE.PerspectiveCamera(70, 2, 0.1, 400);
  const N = 1400, FAR = 260;
  const stars = Array.from({ length: N }, () => spawn(true));
  const pos = new Float32Array(N * 6);
  const col = new Float32Array(N * 6);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  const lines = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  scene.add(lines);
  function spawn(anywhere) {
    const a = Math.random() * Math.PI * 2, r = 4 + Math.random() * 60;
    const tint = Math.random();
    return { x: Math.cos(a) * r, y: Math.sin(a) * r * 0.6, z: anywhere ? -Math.random() * FAR : -FAR,
             v: 60 + Math.random() * 90, c: tint < 0.15 ? [1.0, 0.85, 0.7] : tint < 0.45 ? [0.7, 0.8, 1.0] : [0.95, 0.97, 1.0] };
  }
  function step(dt) {
    for (let i = 0; i < N; i++) {
      const s = stars[i];
      s.z += s.v * dt;
      if (s.z > 0) stars[i] = spawn(false);
      const t = stars[i];
      const len = Math.max(0.5, t.v * 0.045 * (1 + (FAR + t.z) / FAR * 2));
      const fade = Math.min(1, (FAR + t.z) / (FAR * 0.6));
      pos.set([t.x, t.y, t.z, t.x, t.y, t.z - len], i * 6);
      col.set([t.c[0] * fade, t.c[1] * fade, t.c[2] * fade, 0, 0, 0.05 * fade], i * 6);
    }
    geo.attributes.position.needsUpdate = true;
    geo.attributes.color.needsUpdate = true;
  }
  step(0);
  return { scene, camera, step };
}

function canvasTexture(c) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// An LCARS-style face for a side display: coloured blocks and the section's name. Decoration only: no data.
function lcarsCanvas(screen, index) {
  const c = document.createElement("canvas");
  c.width = 1024; c.height = 652;
  const g = c.getContext("2d");
  g.fillStyle = "#000"; g.fillRect(0, 0, c.width, c.height);
  const accent = index === 1 ? LC.lilac : LC.blue;
  // Elbow frame
  g.fillStyle = accent;
  pill(g, 30, 30, 160, 592, 60, "left");
  g.fillStyle = "#000"; g.fillRect(130, 110, 80, 432);
  g.fillStyle = accent; g.fillRect(190, 30, 804, 70); g.fillRect(190, 552, 804, 70);
  g.fillStyle = "#000"; g.fillRect(560, 30, 10, 70); g.fillRect(760, 552, 10, 70);
  g.fillStyle = LC.orange; g.fillRect(570, 30, 190, 70);
  g.fillStyle = LC.peach; g.fillRect(36, 250, 88, 120);
  g.fillStyle = "#000"; g.fillRect(30, 244, 100, 6); g.fillRect(30, 370, 100, 6);
  // Text
  g.fillStyle = "#000";
  g.font = "700 40px Antonio, 'Arial Narrow', sans-serif";
  g.fillText(screen.where.toUpperCase(), 210, 80);
  g.fillStyle = LC.peach;
  g.font = "700 74px Antonio, 'Arial Narrow', sans-serif";
  wrap(g, screen.title.toUpperCase(), 240, 230, 720, 84);
  g.fillStyle = accent;
  g.font = "400 38px Antonio, 'Arial Narrow', sans-serif";
  g.fillText("SELECT TO OPEN", 240, 500);
  return c;
}
function lcarsTexture(screen, index) { return canvasTexture(lcarsCanvas(screen, index)); }

function consoleTexture(side) {
  const c = document.createElement("canvas");
  c.width = 512; c.height = 224;
  const g = c.getContext("2d");
  g.fillStyle = "#050505"; g.fillRect(0, 0, 512, 224);
  const cols = side < 0 ? [LC.orange, LC.peach, LC.lilac, LC.blue] : [LC.blue, LC.lilac, LC.peach, LC.orange];
  for (let r = 0; r < 4; r++) for (let k = 0; k < 6; k++) {
    g.fillStyle = cols[(r + k) % 4];
    g.globalAlpha = 0.55 + ((r * 7 + k * 3) % 5) * 0.09;
    pill(g, 20 + k * 82, 20 + r * 50, 70, 34, 17, k === 0 ? "left" : k === 5 ? "right" : "none");
  }
  g.globalAlpha = 1;
  return canvasTexture(c);
}

function labelCanvas(screen) {
  const c = document.createElement("canvas");
  c.width = 1024; c.height = 96;
  const g = c.getContext("2d");
  g.fillStyle = "#000"; g.fillRect(0, 0, 1024, 96);
  g.fillStyle = LC.orange; pill(g, 8, 14, 150, 68, 34, "left");
  g.fillStyle = LC.blue; pill(g, 866, 14, 150, 68, 34, "right");
  g.fillStyle = LC.peach;
  g.font = "700 44px Antonio, 'Arial Narrow', sans-serif";
  g.textAlign = "center";
  g.fillText(`${screen.where} · ${screen.title}`.toUpperCase(), 512, 66);
  return c;
}
function labelPlate(screen) {
  const tex = canvasTexture(labelCanvas(screen));
  return new THREE.Mesh(new THREE.PlaneGeometry(6.4, 0.6), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
}

function pill(g, x, y, w, h, r, round) {
  g.beginPath();
  const L = round === "left" || round === "both", Rr = round === "right" || round === "both";
  g.moveTo(x + (L ? r : 0), y);
  g.lineTo(x + w - (Rr ? r : 0), y);
  if (Rr) g.arc(x + w - r, y + r, r, -Math.PI / 2, 0); else g.lineTo(x + w, y);
  g.lineTo(x + w, y + h - (Rr ? r : 0));
  if (Rr) g.arc(x + w - r, y + h - r, r, 0, Math.PI / 2); else g.lineTo(x + w, y + h);
  g.lineTo(x + (L ? r : 0), y + h);
  if (L) g.arc(x + r, y + h - r, r, Math.PI / 2, Math.PI); else g.lineTo(x, y + h);
  g.lineTo(x, y + (L ? r : 0));
  if (L) g.arc(x + r, y + r, r, Math.PI, Math.PI * 1.5);
  g.closePath();
  g.fill();
}

function wrap(g, text, x, y, maxW, lh) {
  const words = text.split(" ");
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (g.measureText(test).width > maxW && line) { g.fillText(line, x, y); line = w; y += lh; } else line = test;
  }
  g.fillText(line, x, y);
}
