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
