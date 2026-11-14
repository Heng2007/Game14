// PART 1 owns this file. Keep the three exported function signatures.
// The garden itself: meadow, lake, rivers, painted sky, birds and the
// cracked-oil-paint overlay. Bosch palette, soft even light, no shadows.

import * as THREE from 'three';
import {
  MAP_SIZE, ISLAND_RADIUS, LAKE_RADIUS, RIVER_WIDTH,
} from '../shared/positions.js';
import { getHeight } from './terrain.js';
import { applyPaintedLook } from './look.js';

// Palette taken from the painting.
const CREAM = 0xf3e3d3;
const GRASS_DARK = 0x4f8a4b;
const GRASS_LIGHT = 0x9ccb6e;
const WATER_DEEP = 0x5e97bd;
const WATER_SHALLOW = 0xcfe8ef;
const RIDGE_NEAR = 0x8ba3bd;
const RIDGE_FAR = 0xa2b6c9;
const BIRD_COLOR = 0x3d4f63;
const BIRD_WING = 0x4d5f74;

const WATER_Y = 0.1;

let waterUniforms = null;
const birds = [];
let elapsed = 0;

let overlayScene = null;
let overlayCamera = null;

// ---------------------------------------------------------------- ground

function buildGround(scene) {
  const geo = new THREE.PlaneGeometry(MAP_SIZE, MAP_SIZE, 200, 200).rotateX(-Math.PI / 2);
  const pos = geo.getAttribute('position');
  const colors = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  const cDark = new THREE.Color(GRASS_DARK);
  const cLight = new THREE.Color(GRASS_LIGHT);

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const h = getHeight(x, z);
    pos.setY(i, h);

    // Soft two-tone grass: deeper green in hollows, lighter on the rises,
    // plus a fine large-scale mottle so the meadow is not flat colour.
    const t = Math.min(1, Math.max(0, (h + 0.6) / 3.4));
    c.copy(cDark).lerp(cLight, t);
    const mottle = 0.5 + 0.5 * Math.sin(x * 0.21 + 1.3) * Math.sin(z * 0.17 - 0.8);
    c.multiplyScalar(0.93 + 0.14 * mottle);
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();

  const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true }));
  scene.add(mesh);
}

// ----------------------------------------------------------------- water

const WATER_VERT = /* glsl */ `
  #include <fog_pars_vertex>
  uniform float uTime;
  varying vec3 vPos;
  void main() {
    vec3 p = position;
    float w = sin(p.x * 0.9 + uTime * 1.4) * 0.5
            + sin(p.z * 1.15 - uTime * 1.1) * 0.35
            + sin((p.x + p.z) * 0.5 + uTime * 0.7) * 0.4;
    p.y += w * 0.035;
    vPos = (modelMatrix * vec4(p, 1.0)).xyz;
    vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`;

const WATER_FRAG = /* glsl */ `
  #include <fog_pars_fragment>
  uniform float uTime;
  uniform vec3 uDeep;
  uniform vec3 uShallow;
  varying vec3 vPos;
  void main() {
    float r = length(vPos.xz);
    float w1 = sin(vPos.x * 1.4 + uTime * 1.3) * sin(vPos.z * 1.2 - uTime * 1.05);
    float w2 = sin(vPos.x * 0.6 + vPos.z * 0.8 + uTime * 0.8);
    float m = 0.5 + 0.28 * w1 + 0.22 * w2;
    // deeper in the middle of the lake ring, paler toward shores and rivers
    float lake = smoothstep(14.0, 22.0, r) * (1.0 - smoothstep(44.0, 52.0, r));
    float depth = clamp(lake * 0.85 + 0.12, 0.0, 1.0);
    vec3 col = mix(uShallow, uDeep, clamp(depth * (0.4 + 0.6 * m), 0.0, 1.0));
    col += vec3(0.9, 0.97, 1.0) * smoothstep(0.8, 1.0, m) * 0.08;
    gl_FragColor = vec4(col, 1.0);
    #include <fog_fragment>
  }
`;

function buildWater(scene) {
  waterUniforms = THREE.UniformsUtils.merge([
    THREE.UniformsLib.fog,
    {
      uTime: { value: 0 },
      uDeep: { value: new THREE.Color(WATER_DEEP) },
      uShallow: { value: new THREE.Color(WATER_SHALLOW) },
    },
  ]);
  const material = new THREE.ShaderMaterial({
    uniforms: waterUniforms,
    vertexShader: WATER_VERT,
    fragmentShader: WATER_FRAG,
    fog: true,
  });

  // Lake: annulus from the island edge to the lake shore.
  const lake = new THREE.Mesh(
    new THREE.RingGeometry(ISLAND_RADIUS, LAKE_RADIUS, 128, 6).rotateX(-Math.PI / 2),
    material,
  );
  lake.position.y = WATER_Y;
  scene.add(lake);

  // Rivers: four 8 m planes running from the lake edge past the map edge.
  const length = MAP_SIZE / 2 - LAKE_RADIUS + 8;
  const mid = LAKE_RADIUS - 4 + length / 2;
  for (const [x, z, turn] of [[0, mid, 0], [0, -mid, 0], [mid, 0, 1], [-mid, 0, 1]]) {
    const river = new THREE.Mesh(
      new THREE.PlaneGeometry(RIVER_WIDTH, length, 4, 56).rotateX(-Math.PI / 2),
      material,
    );
    river.position.set(x, WATER_Y, z);
    river.rotation.y = (turn * Math.PI) / 2;
    scene.add(river);
  }
}

// ------------------------------------------------------------------- sky

function buildSky(scene) {
  const geo = new THREE.SphereGeometry(900, 32, 16);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        float h = normalize(vDir).y;
        vec3 hor = vec3(0.953, 0.890, 0.827); // cream
        vec3 mid = vec3(0.812, 0.910, 0.937); // #cfe8ef
        vec3 top = vec3(0.561, 0.718, 0.851); // #8fb7d9
        vec3 col = mix(hor, mid, smoothstep(0.02, 0.20, h));
        col = mix(col, top, smoothstep(0.20, 0.60, h));
        col = mix(col, vec3(0.80, 0.82, 0.78), smoothstep(0.0, -0.30, h) * 0.5);
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  const sky = new THREE.Mesh(geo, mat);
  sky.frustumCulled = false;
  sky.renderOrder = -1;
  scene.add(sky);
}

// --------------------------------------------------------------- ridges

// A low ribbon of silhouette hills: wavy top edge, flat blue, fog does the rest.
function ridgeGeometry(radius, height, phase) {
  const segs = 160;
  const positions = new Float32Array((segs + 1) * 2 * 3);
  const indices = [];
  const inner = radius - 70;
  for (let i = 0; i <= segs; i++) {
    const a = (i / segs) * Math.PI * 2;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    const h = Math.max(2, height * (
      0.55
      + 0.3 * Math.sin(a * 3 + phase)
      + 0.18 * Math.sin(a * 7 + phase * 1.7)
      + 0.12 * Math.sin(a * 13 + phase * 0.6)
    ));
    const rt = radius + h * 2.1;
    const k = i * 6;
    positions[k] = ca * inner; positions[k + 1] = -10; positions[k + 2] = sa * inner;
    positions[k + 3] = ca * rt; positions[k + 4] = h; positions[k + 5] = sa * rt;
    if (i < segs) {
      const v = i * 2;
      indices.push(v, v + 1, v + 2, v + 1, v + 3, v + 2);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setIndex(indices);
  return geo;
}

function buildRidges(scene) {
  for (const [radius, height, color, phase] of [
    [250, 26, RIDGE_NEAR, 0.7],
    [370, 42, RIDGE_FAR, 2.9],
  ]) {
    const mesh = new THREE.Mesh(
      ridgeGeometry(radius, height, phase),
      new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }),
    );
    scene.add(mesh);
  }
}

// ----------------------------------------------------------------- birds

// A small painted bird: capsule body, two thin-box wings, dark blue-grey.
function makeBird(params) {
  const group = new THREE.Group();
  group.name = 'bird';

  const bodyMat = new THREE.MeshLambertMaterial({ color: BIRD_COLOR });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.5, 4, 8), bodyMat);
  body.rotation.x = Math.PI / 2;
  group.add(body);

  const wingMat = new THREE.MeshLambertMaterial({ color: BIRD_WING });
  const wingL = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.04, 0.5).translate(-0.65, 0, 0), wingMat);
  const wingR = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.04, 0.5).translate(0.65, 0, 0), wingMat);
  wingL.position.y = 0.04;
  wingR.position.y = 0.04;
  group.add(wingL, wingR);

  applyPaintedLook(group);

  return {
    group, wingL, wingR,
    ...params,
    a: params.phase * 6.28,
    dir: Math.sign(params.speed),
  };
}

function buildBirds(scene) {
  const params = [
    { cx: 70, cz: 30, r: 75, y: 48, speed: 0.09, phase: 0.0, flap: 7.5 },
    { cx: -80, cz: 60, r: 95, y: 62, speed: -0.07, phase: 0.33, flap: 6.5 },
    { cx: 30, cz: -110, r: 85, y: 55, speed: 0.11, phase: 0.64, flap: 8.5 },
    { cx: -60, cz: -80, r: 60, y: 42, speed: -0.12, phase: 0.19, flap: 7.0 },
    { cx: 130, cz: -50, r: 110, y: 68, speed: 0.06, phase: 0.81, flap: 6.0 },
  ];
  for (const p of params) {
    const bird = makeBird(p);
    scene.add(bird.group);
    birds.push(bird);
  }
}

// --------------------------------------------------------------- overlay

// Cracked-oil-paint (craquelure) overlay, drawn once as a canvas texture.
function craquelureTexture() {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const g = canvas.getContext('2d');
  const rnd = (n) => {
    const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return s - Math.floor(s);
  };

  // Jittered grid: the craquelure's polygon mesh.
  const lines = 9;
  const step = size / lines;
  g.strokeStyle = 'rgba(56, 40, 30, 0.18)';
  g.lineWidth = 1;
  for (let i = 0; i <= lines; i++) {
    g.beginPath();
    for (let y = 0; y <= size; y += step / 2) {
      const x = i * step + (rnd(i * 17.3 + y * 0.71) - 0.5) * step * 0.55;
      if (y === 0) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.stroke();
    g.beginPath();
    for (let x = 0; x <= size; x += step / 2) {
      const y = i * step + (rnd(i * 29.7 + x * 0.53) - 0.5) * step * 0.55;
      if (x === 0) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.stroke();
  }

  // Wandering cracks over the top.
  g.lineWidth = 0.8;
  for (let k = 0; k < 70; k++) {
    let x = rnd(k * 3.1) * size;
    let y = rnd(k * 7.7) * size;
    let a = rnd(k * 13.3) * Math.PI * 2;
    const len = 30 + rnd(k * 5.9) * 110;
    g.strokeStyle = 'rgba(50, 36, 27, ' + (0.14 + rnd(k * 9.1) * 0.18) + ')';
    g.beginPath();
    g.moveTo(x, y);
    for (let s = 0; s < len; s += 6) {
      a += (rnd(k * 31 + s) - 0.5) * 0.9;
      x += Math.cos(a) * 6;
      y += Math.sin(a) * 6;
      g.lineTo(x, y);
    }
    g.stroke();
  }

  // Faint grain.
  g.fillStyle = 'rgba(40, 30, 22, 0.06)';
  for (let k = 0; k < 2200; k++) {
    g.fillRect(rnd(k * 1.7) * size, rnd(k * 2.9) * size, 1, 1);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function buildOverlay() {
  overlayScene = new THREE.Scene();
  overlayCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const material = new THREE.MeshBasicMaterial({
    map: craquelureTexture(),
    transparent: true,
    opacity: 0.16,
    depthTest: false,
    depthWrite: false,
  });
  overlayScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material));
}

// ------------------------------------------------------------ lifecycle

// Called once at startup. ctx = { renderer, scene, camera, ui }.
export function init({ scene }) {
  scene.background = new THREE.Color(CREAM);
  scene.fog = new THREE.Fog(CREAM, 150, 600);

  // Soft even light like the painting: hemisphere fill plus a weak warm sun.
  // No shadow maps anywhere.
  scene.add(new THREE.HemisphereLight(0xcfe0ee, GRASS_LIGHT, 1.0));
  const sun = new THREE.DirectionalLight(0xfff0d2, 1.4);
  sun.position.set(140, 200, 80);
  scene.add(sun);

  buildGround(scene);
  buildWater(scene);
  buildSky(scene);
  buildRidges(scene);
  buildBirds(scene);
  buildOverlay();
}

// Called every frame. dt = seconds since the last frame.
export function update(dt) {
  elapsed += dt;
  if (waterUniforms) waterUniforms.uTime.value = elapsed;

  for (const b of birds) {
    b.a += b.speed * dt;
    const ca = Math.cos(b.a);
    const sa = Math.sin(b.a);
    b.group.position.set(
      b.cx + ca * b.r,
      b.y + Math.sin(elapsed * 0.7 + b.phase) * 2.0,
      b.cz + sa * b.r,
    );
    b.group.rotation.set(0, Math.atan2(-sa * b.dir, ca * b.dir), 0.3 * b.dir);
    const f = Math.sin(elapsed * b.flap + b.phase) * 0.5;
    b.wingL.rotation.z = -f;
    b.wingR.rotation.z = f;
  }
}

// Called every frame, last. Draws the picture. The full-screen paint effect goes here.
export function render({ renderer, scene, camera }) {
  renderer.autoClear = false;
  renderer.clear();
  renderer.render(scene, camera);
  renderer.clearDepth();
  renderer.render(overlayScene, overlayCamera);
  renderer.autoClear = true;
}
