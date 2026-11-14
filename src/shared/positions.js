// SHARED FILE: do not edit in a part branch. Changes go in their own small pull request.
//
// Where everything is on the map. Units are metres. Y is up.
// The map is a square centred on (0, 0): x and z both run from -200 to 200.
//
// Layout: a round lake in the centre with a small island in the middle.
// The fountain stands on the island. Four bridges cross the lake on the
// diagonals. Four rivers run from the lake to the map edge along the x and z
// axes, which cuts the land into four corners. A tower stands in each corner.

export const MAP_SIZE = 400;
export const ZONES = {
  ACT_I_EDEN: { spawn: { x: 0, z: 20 }, bounds: { radius: 48 }, amplitude: 0.55 },
  ACT_II_GARDEN: { spawn: { x: 0, z: 20 }, bounds: { minX: -48, maxX: 48, minZ: -48, maxZ: 48 }, amplitude: 0.4 },
  ACT_III_HELL: { spawn: { x: 0, z: 20 }, bounds: { radius: 48 }, amplitude: 0.25 },
  FINALE: { spawn: { x: 0, z: 20 }, bounds: { radius: 48 }, amplitude: 0 },
};
export const EDEN_OBSTACLES = [
  { x: 0, z: 0, radius: 4 }, { x: -9, z: 9, radius: 2.5 },
  { x: 10, z: 3, radius: 2 },
];
export function zoneHeight(x, z, zone = 'ACT_I_EDEN') {
  return Math.sin(x * 0.09) * Math.cos(z * 0.08) * ZONES[zone].amplitude;
}
export const ISLAND_RADIUS = 12;
export const LAKE_RADIUS = 45;
export const RIVER_WIDTH = 8;

export const FOUNTAIN = { name: 'fountain', x: 0, z: 0, rotY: 0 };
export const DELIVERY_RADIUS = 10; // within this distance of the fountain, fruit is delivered

export const TOWERS = [
  { name: 'tower_pink', x: 120, z: 120, rotY: 0 },
  { name: 'tower_blue', x: -120, z: 120, rotY: 0 },
  { name: 'tower_pink', x: -120, z: -120, rotY: 0 },
  { name: 'tower_blue', x: 120, z: -120, rotY: 0 },
];

// Each bridge is a rectangle: `length` runs along the model's Z axis before
// rotY is applied. They reach from the island edge to the lake shore.
export const BRIDGE_LENGTH = 36;
export const BRIDGE_WIDTH = 4;
export const BRIDGES = [45, 135, 225, 315].map((deg) => {
  const a = (deg * Math.PI) / 180;
  const r = (ISLAND_RADIUS + LAKE_RADIUS) / 2;
  return { name: 'bridge', x: r * Math.sin(a), z: r * Math.cos(a), rotY: a };
});

// The original lake/island/river proportions, reduced to fit the middle panel.
const PANEL_SCALE = 0.36;
export const TRIPTYCH = {
  bounds: { minX: -100, maxX: 100, minZ: -40, maxZ: 40 },
  acts: { eden: [-100, -35], garden: [-35, 35], hell: [35, 100] },
  spawn: { x: -92, z: 26 },
  shutters: { x: -110, z: 26 },
  edenFountain: { x: -72, z: -5 }, rings: { x: -60, z: 9 }, dragonTree: { x: -38, z: -5 },
  pool: { x: 0, z: 0, radius: LAKE_RADIUS * PANEL_SCALE, island: ISLAND_RADIUS * PANEL_SCALE },
  riverWidth: RIVER_WIDTH * PANEL_SCALE,
  bridges: [
    ...BRIDGES.map(b => ({ x: b.x * PANEL_SCALE, z: b.z * PANEL_SCALE, rotY: b.rotY,
      length: BRIDGE_LENGTH * PANEL_SCALE + 1.5, width: BRIDGE_WIDTH * PANEL_SCALE + 1.4 })),
    { x: 0, z: 26, rotY: Math.PI / 2, length: 7, width: 5 },
    { x: 0, z: -26, rotY: Math.PI / 2, length: 7, width: 5 },
    { x: -26, z: 0, rotY: 0, length: 7, width: 5 },
    { x: 26, z: 0, rotY: 0, length: 7, width: 5 },
  ],
  towers: [{ x: -22, z: -18 }, { x: 22, z: -18 }, { x: -21, z: 15 }, { x: 22, z: 15 }],
  sphere: { x: -21, z: 4 }, strawberry: { x: 23, z: -5 }, owl: { x: 0, z: 0 },
  frozenLake: { x: 59, z: -13 }, lute: { x: 63, z: 5 }, harp: { x: 73, z: 2 },
  score: { x: 64, z: 13 }, treeMan: { x: 81, z: -17 }, throne: { x: 95, z: 2 },
};
export function zoneAtX(x) {
  if (x < -35) return 'ACT_I_EDEN';
  if (x < 35) return 'ACT_II_GARDEN';
  return 'ACT_III_HELL';
}
const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
export function triptychHeight(x, z) {
  const eden = (Math.sin(x * 0.16) * Math.cos(z * 0.12) * 1.4 + 0.5) * (1 - smooth(-48, -34, x));
  const descent = -8 * smooth(35, 55, x);
  const height = eden + descent + Math.sin(z * 0.16) * 0.16 * smooth(45, 60, x);
  const basin = Math.hypot(x - TRIPTYCH.edenFountain.x,z - TRIPTYCH.edenFountain.z);
  const basinHeight = Math.sin(-72 * 0.16) * Math.cos(-5 * 0.12) * 1.4 + 0.5;
  return basinHeight * (1 - smooth(7,10,basin)) + height * smooth(7,10,basin);
}
export function onTriptychBridge(x, z, margin = 0) {
  return TRIPTYCH.bridges.some(b => {
    const dx = x - b.x, dz = z - b.z, c = Math.cos(b.rotY), s = Math.sin(b.rotY);
    return Math.abs(dx * c - dz * s) <= b.width / 2 - margin &&
      Math.abs(dx * s + dz * c) <= b.length / 2 - margin;
  });
}
export function triptychWater(x, z) {
  if (x <= -35 || x >= 35 || Math.abs(z) > 40) return false;
  const r = Math.hypot(x, z);
  if (r < TRIPTYCH.pool.island) return false;
  return r < TRIPTYCH.pool.radius || Math.abs(x) < TRIPTYCH.riverWidth / 2 || Math.abs(z) < TRIPTYCH.riverWidth / 2;
}
export function triptychBlocked(x, z) {
  return triptychWater(x, z) && !onTriptychBridge(x, z, 0.4);
}

const route = (act, points, kind = 'trail') => points.slice(1).map((point, i) => ({
  act, kind, a: { x: points[i][0], z: points[i][1] }, b: { x: point[0], z: point[1] }, halfWidth: point[2],
}));
export const PATH = [
  ...route('eden', [[-100,26],[-92,26,4],[-84,18,4],[-80,10,4],[-79,0,4],[-76,-10,3.5],[-68,-10,3.5],[-64,-2,3.5],[-60,9,5.6],[-50,9,3.5],[-43,2,3],[-38,-5,4],[-34,-5,1.95]]),
  ...route('garden', [[-34,-5],[-24,-9,3],[-22,-18,3.5],[-16,-16,3],[-12.7,-12.7,2]]),
  ...route('garden', [[-22,-18],[-22,-18,6]]),
  ...route('garden', [[-12.7,-12.7],[-2.7,-2.7,1.35]], 'bridge'),
  ...route('garden', [[0,0],[0,0,4.25]]),
  ...route('garden', [[-2.7,2.7],[-12.7,12.7,1.35]], 'bridge'),
  ...route('garden', [[-12.7,12.7],[-18,10,3],[-21,4,4],[-24,-9,3]]),
  ...route('garden', [[2.7,2.7],[12.7,12.7,1.35]], 'bridge'),
  ...route('garden', [[12.7,12.7],[18,10,3],[23,3,3],[27,-1,3.5],[27,-5,4],[34,-4,3]]),
  ...route('garden', [[23,-5],[23,-5,6]]),
  ...route('hell', [[34,-4],[43,-1,3],[52,4,3.5],[63,5,5.5],[59,-4,3]]),
  ...route('hell', [[63,5],[64,13,3.5]]),
  ...route('hell', [[59,-4],[59,-22,1.4]], 'ice'),
  ...route('hell', [[59,-22],[68,-26,3],[75,-29,3],[81,-28,2],[81,-20.8,1.8],[81,-17,1.8],[81,-13.2,1.8],[81,-6,1.8],[89,-4,3],[95,2,5]]),
  ...route('hell', [[81,-17],[81,-17,3.55]]),
];
export const PATH_SPAWNS = { Digit7: TRIPTYCH.spawn, Digit8: { x: -24, z: -9 }, Digit9: { x: 43, z: -1 } };
export const PATH_LANDMARKS = ['spawn','rings','dragonTree','owl','sphere','strawberry','lute','treeMan','throne'];

export function pathHeight(x, z) {
  const base = triptychHeight(x, z);
  if (Math.abs(x - 81) > 3.65 || z < -28 || z > -6) return base;
  return base + 5.1 * Math.max(0, Math.min(1, (z + 28) / 7.2, (-6 - z) / 7.2));
}

export const SCENERY = [
  { name: 'tree', x: 60, z: 90, rotY: 0 },
  { name: 'tree', x: -85, z: 60, rotY: 1 },
  { name: 'tree', x: -70, z: -110, rotY: 2 },
  { name: 'tree', x: 95, z: -65, rotY: 3 },
  { name: 'bird', x: 150, z: -40, rotY: 0.5 },
  { name: 'bird', x: -150, z: 45, rotY: 2.5 },
  { name: 'glass_sphere', x: 40, z: -140, rotY: 0 },
  { name: 'glass_sphere', x: -45, z: 150, rotY: 0 },
  { name: 'shell', x: 160, z: 160, rotY: 1 },
  { name: 'shell', x: -160, z: -160, rotY: 4 },
];

// True over the lake and the rivers. Bridges are NOT taken into account:
// a point on a bridge still returns true. Part 2 checks BRIDGES itself.
export function inWater(x, z) {
  const r = Math.hypot(x, z);
  if (r < ISLAND_RADIUS) return false;
  if (r < LAKE_RADIUS) return true;
  return Math.abs(x) < RIVER_WIDTH / 2 || Math.abs(z) < RIVER_WIDTH / 2;
}

// 30 fixed fruit spawn points on dry land. The same every run (fixed seed).
const KINDS = ['strawberry', 'cherry', 'blackberry'];
export const FRUIT_SPAWNS = [];
{
  let seed = 14;
  const rand = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
  while (FRUIT_SPAWNS.length < 30) {
    const x = Math.round((rand() - 0.5) * 360);
    const z = Math.round((rand() - 0.5) * 360);
    const nearWater = inWater(x, z) || Math.abs(x) < 8 || Math.abs(z) < 8;
    const nearTower = TOWERS.some((t) => Math.hypot(t.x - x, t.z - z) < 15);
    if (Math.hypot(x, z) < 60 || nearWater || nearTower) continue;
    FRUIT_SPAWNS.push({ name: KINDS[FRUIT_SPAWNS.length % 3], x, z });
  }
}
