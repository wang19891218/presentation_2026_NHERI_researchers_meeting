/* =============================================================================
   three-building.js  —  Interactive colored low-rise building (Three.js)
   -----------------------------------------------------------------------------
   Renders a parametric low-rise building (rectangular footprint + gable roof)
   whose faces are tinted by a synthetic, physically-plausible pressure
   coefficient (Cp) field:
       windward face   -> positive Cp  (crimson)
       leeward / sides  -> negative Cp  (teal-blue, suction)
       roof             -> strong suction (blue)
   Diverging colormap: teal-blue (-0.8) -> white (0) -> crimson (+0.7).

   - Slow auto-rotation; pauses on pointer hover / drag.
   - Respects prefers-reduced-motion (no auto-spin; user can still orbit).
   - Self-contained, vendored three.js (offline + GitHub-Pages safe).
   - Mounts into any element via data-three-building attribute; resizes with it.

   Wind blows along +X (the "windward" wall faces -X toward the incoming flow).
   ============================================================================= */

import * as THREE from "../../vendor/three/three.module.js";
import { OrbitControls } from "../../vendor/three/addons/controls/OrbitControls.js";

const REDUCED_MOTION =
  window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---- Diverging Cp colormap: teal-blue -> white -> crimson ----------------- */
// Stops chosen to match the on-slide legend gradient.
const CP_MIN = -0.8;
const CP_MAX = 0.7;
const STOPS = [
  { t: 0.0, c: [0x2a, 0x7f, 0x8e] }, // teal-blue   (strong suction)
  { t: 0.35, c: [0xbf, 0xd7, 0xdb] }, // pale teal
  { t: 0.5, c: [0xf2, 0xf2, 0xf2] }, // near-white  (Cp ~ 0)
  { t: 0.65, c: [0xe6, 0xa6, 0xb2] }, // pale crimson
  { t: 1.0, c: [0x98, 0x1e, 0x32] }, // crimson     (high pressure)
];

function lerp(a, b, t) { return a + (b - a) * t; }

// Map a Cp value to an RGB color via the diverging stops.
function cpToColor(cp) {
  let n = (cp - CP_MIN) / (CP_MAX - CP_MIN);
  n = Math.max(0, Math.min(1, n));
  let lo = STOPS[0], hi = STOPS[STOPS.length - 1];
  for (let i = 0; i < STOPS.length - 1; i++) {
    if (n >= STOPS[i].t && n <= STOPS[i + 1].t) { lo = STOPS[i]; hi = STOPS[i + 1]; break; }
  }
  const span = hi.t - lo.t || 1;
  const k = (n - lo.t) / span;
  const r = lerp(lo.c[0], hi.c[0], k) / 255;
  const g = lerp(lo.c[1], hi.c[1], k) / 255;
  const b = lerp(lo.c[2], hi.c[2], k) / 255;
  return new THREE.Color(r, g, b);
}

/* ---- Synthetic Cp field --------------------------------------------------- */
// Returns a plausible Cp given a world-space face normal and height fraction.
// Windward (normal . windDir < 0) is pressurized; everything else suctioned.
function syntheticCp(normal, windDir, heightFrac) {
  const facing = normal.dot(windDir); // -1 fully windward, +1 fully leeward
  let cp;
  if (facing < -0.25) {
    // Windward wall: positive Cp, decaying slightly with height (stagnation low-mid).
    const stag = 1.0 - 0.45 * Math.abs(heightFrac - 0.4);
    cp = 0.62 * (-facing) * stag;
  } else if (normal.y > 0.6) {
    // Roof: strong suction near the windward eave.
    cp = -0.65;
  } else {
    // Side / leeward walls: moderate suction, strongest just past the edge.
    cp = -0.30 - 0.30 * Math.max(0, facing);
  }
  return Math.max(CP_MIN, Math.min(CP_MAX, cp));
}

// Paint per-vertex colors of a geometry using the synthetic Cp field.
function paintGeometry(geom, windDir, yMin, yMax) {
  geom.computeVertexNormals();
  const pos = geom.attributes.position;
  const nrm = geom.attributes.normal;
  const colors = new Float32Array(pos.count * 3);
  const n = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    n.set(nrm.getX(i), nrm.getY(i), nrm.getZ(i)).normalize();
    const y = pos.getY(i);
    const hf = (y - yMin) / (yMax - yMin || 1);
    const cp = syntheticCp(n, windDir, hf);
    const col = cpToColor(cp);
    colors[i * 3] = col.r; colors[i * 3 + 1] = col.g; colors[i * 3 + 2] = col.b;
  }
  geom.setAttribute("color", new THREE.BufferAttribute(colors, 3));
}

/* ---- Build the parametric building --------------------------------------- */
function buildBuilding(windDir) {
  const group = new THREE.Group();
  const W = 3.0;   // width (along X, wind direction)
  const D = 2.2;   // depth (along Z)
  const H = 1.6;   // eave height
  const ROOF = 0.7; // ridge rise above eave

  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: 0.62, metalness: 0.02,
    flatShading: false,
  });

  // --- Walls (box from y=0 to y=H) ---
  const box = new THREE.BoxGeometry(W, H, D, 1, 1, 1).toNonIndexed();
  box.translate(0, H / 2, 0);
  paintGeometry(box, windDir, 0, H + ROOF);
  group.add(new THREE.Mesh(box, mat));

  // --- Gable roof: a triangular prism spanning X, ridge along X ---
  const roof = new THREE.BufferGeometry();
  const hx = W / 2, hz = D / 2;
  const yE = H, yR = H + ROOF; // eave / ridge height
  // 6 vertices: two gable triangles + ridge line
  const v = [
    // -X gable end (triangle): left eave, right eave, ridge
    [-hx, yE, -hz], [-hx, yE, hz], [-hx, yR, 0],
    // +X gable end
    [hx, yE, -hz], [hx, yE, hz], [hx, yR, 0],
  ];
  // Winding order: CCW viewed from OUTSIDE so computeVertexNormals() yields
  // outward-facing normals (verified per-triangle by cross-product).
  const tris = [
    // -X gable face
    [0, 1, 2],
    // +X gable face
    [3, 5, 4],
    // back slope (z<0)
    [0, 5, 3], [0, 2, 5],
    // front slope (z>0)
    [1, 5, 2], [1, 4, 5],
  ];
  const verts = [];
  for (const t of tris) for (const idx of t) verts.push(...v[idx]);
  roof.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
  paintGeometry(roof, windDir, 0, yR);
  // Separate material with DoubleSide so the roof stays solid from every angle.
  const roofMat = new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: 0.62, metalness: 0.02,
    flatShading: false, side: THREE.DoubleSide,
  });
  group.add(new THREE.Mesh(roof, roofMat));

  // --- Subtle wireframe edges for definition ---
  const edgeMat = new THREE.LineBasicMaterial({ color: 0x3a3f43, transparent: true, opacity: 0.18 });
  const wallEdges = new THREE.LineSegments(new THREE.EdgesGeometry(box, 30), edgeMat);
  group.add(wallEdges);

  return group;
}

/* ---- Ground-plane shadow disc -------------------------------------------- */
function makeGround() {
  const g = new THREE.CircleGeometry(4.5, 48);
  g.rotateX(-Math.PI / 2);
  const m = new THREE.MeshStandardMaterial({ color: 0xeef0f2, roughness: 1.0, metalness: 0 });
  const mesh = new THREE.Mesh(g, m);
  mesh.position.y = -0.001;
  mesh.receiveShadow = true;
  return mesh;
}

/* ---- Wind arrow indicator ------------------------------------------------- */
function makeWindArrow(windDir) {
  // Arrow pointing in the wind direction, placed upstream of the building.
  const dir = windDir.clone().normalize();
  const origin = new THREE.Vector3(-3.6, 0.9, 0);
  const arrow = new THREE.ArrowHelper(dir, origin, 1.4, 0x5e6a71, 0.4, 0.24);
  return arrow;
}

/* ---- Mount one instance --------------------------------------------------- */
function mount(el) {
  const wrap = el;
  const width = wrap.clientWidth || 600;
  const height = wrap.clientHeight || 360;

  const scene = new THREE.Scene();
  scene.background = null; // transparent -> CSS gradient shows through

  const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
  camera.position.set(5.2, 3.6, 6.4);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(width, height);
  renderer.domElement.className = "three-canvas";
  wrap.appendChild(renderer.domElement);

  // WebGL initialized OK -> hide the static SVG fallback (kept for PDF / no-WebGL).
  const fallback = wrap.querySelector(".three-fallback");
  if (fallback) fallback.style.display = "none";

  // Lighting (soft, light scene)
  scene.add(new THREE.HemisphereLight(0xffffff, 0xdfe3e7, 1.0));
  const key = new THREE.DirectionalLight(0xffffff, 1.1);
  key.position.set(6, 9, 5);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xffffff, 0.35);
  fill.position.set(-5, 3, -4);
  scene.add(fill);

  const windDir = new THREE.Vector3(1, 0, 0); // wind along +X
  const building = buildBuilding(windDir);
  scene.add(building);
  scene.add(makeGround());
  scene.add(makeWindArrow(windDir));

  // Center the orbit target on the building mid-height.
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 1.0, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.minDistance = 5;
  controls.maxDistance = 14;
  controls.maxPolarAngle = Math.PI * 0.49;
  controls.update();

  // Auto-rotate, pausing on hover / interaction.
  let paused = REDUCED_MOTION;
  wrap.addEventListener("pointerenter", () => { paused = true; });
  wrap.addEventListener("pointerleave", () => { paused = REDUCED_MOTION ? true : false; });

  function resize() {
    const w = wrap.clientWidth || width;
    const h = wrap.clientHeight || height;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }
  window.addEventListener("resize", resize);
  // Re-measure when the slide becomes visible (reveal.js fires 'slidechanged').
  if (window.Reveal) {
    window.Reveal.on("slidechanged", () => setTimeout(resize, 60));
    window.Reveal.on("ready", () => setTimeout(resize, 60));
  }

  let raf;
  function animate() {
    raf = requestAnimationFrame(animate);
    if (!paused) building.rotation.y += 0.0042;
    controls.update();
    renderer.render(scene, camera);
  }
  animate();

  return { resize, dispose: () => { cancelAnimationFrame(raf); renderer.dispose(); } };
}

/* ---- Auto-mount all [data-three-building] containers ---------------------- */
function init() {
  const nodes = document.querySelectorAll("[data-three-building]");
  nodes.forEach((n) => {
    try { mount(n); }
    catch (err) { console.error("three-building mount failed:", err); }
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

export { mount, cpToColor };
