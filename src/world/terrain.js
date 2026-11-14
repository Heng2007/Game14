// PART 1 owns this file. Part 2 imports it but does not edit it.
// Keep these two function signatures exactly as they are.

import {
  inWater, ISLAND_RADIUS, LAKE_RADIUS, RIVER_WIDTH,
  BRIDGES, BRIDGE_LENGTH, BRIDGE_WIDTH,
} from '../shared/positions.js';

// Tuning. Units are metres.
const FALLOFF = 14;        // hills rise from the waterline over this distance
const BED_DEPTH = 0.3;     // lakebed sits this far below y = 0
const BED_RAMP = 6;        // ...reached this far inside the water
const ISLAND_DOME = 0.55;  // peak height of the central island
const ISLAND_EDGE = 13;    // the dome fades out by this radius
const CORRIDOR_FALLOFF = 8; // bridge causeways blend back into the meadow
const BRIDGE_HALF_W = BRIDGE_WIDTH / 2 + 1.2;
const BRIDGE_HALF_L = BRIDGE_LENGTH / 2 + 2;

const LAKE_MID = (ISLAND_RADIUS + LAKE_RADIUS) / 2;
const LAKE_HALF = (LAKE_RADIUS - ISLAND_RADIUS) / 2;
const RIVER_HALF = RIVER_WIDTH / 2;

// Bridge corridors as direction + centre pairs, for the flat causeway mask.
const CORRIDORS = BRIDGES.map((b) => ({
  x: b.x, z: b.z, sin: Math.sin(b.rotY), cos: Math.cos(b.rotY),
}));

const clamp01 = (t) => (t < 0 ? 0 : t > 1 ? 1 : t);
const sstep = (t) => {
  t = clamp01(t);
  return t * t * (3 - 2 * t);
};

// Rolling meadow: a few sine octaves, ~1.5-3 m of relief on 40-150 m wavelengths.
function hills(x, z) {
  return 0.9 * (
    1.35 * Math.sin(x * 0.043 + 0.9) * Math.cos(z * 0.037 - 0.4) +
    0.95 * Math.sin(x * 0.11 - z * 0.073 + 1.9) +
    0.65 * Math.cos(x * 0.071 + z * 0.093 - 0.6) +
    0.45 * Math.sin((x - z) * 0.16 + 0.4) * Math.cos((x + z) * 0.13 - 1.2)
  );
}

// Approximate signed distance to the water: positive on land, negative over
// the lake and rivers. The annulus term |r - mid| - half is exact for the ring;
// the river term is the nearer of the two axis strips (they only exist outside
// the lake, so it is skipped while r <= LAKE_RADIUS).
function waterDist(x, z, r) {
  let d = Math.abs(r - LAKE_MID) - LAKE_HALF;
  if (r > LAKE_RADIUS) {
    const dx = Math.abs(x) - RIVER_HALF;
    const dz = Math.abs(z) - RIVER_HALF;
    d = Math.min(d, dx, dz);
  }
  return d;
}

// Signed distance outside a bridge rectangle (negative inside the corridor).
function corridorDist(x, z, c) {
  const dx = x - c.x;
  const dz = z - c.z;
  const along = dx * c.sin + dz * c.cos;
  const across = dx * c.cos - dz * c.sin;
  const ea = Math.abs(along) - BRIDGE_HALF_L;
  const ec = Math.abs(across) - BRIDGE_HALF_W;
  return ea > 0 || ec > 0 ? Math.hypot(Math.max(ea, 0), Math.max(ec, 0)) : Math.max(ea, ec);
}

// Ground height in metres at (x, z). Rolling meadow that sinks to a shallow
// bed under the water and flattens to ~0 along the bridge causeways.
export function getHeight(x, z) {
  const r = Math.sqrt(x * x + z * z);
  const dw = waterDist(x, z, r);

  // Flat causeway under each bridge: 0 inside the corridor, easing out over
  // CORRIDOR_FALLOFF metres so the deck meets the meadow without a step.
  let flat = 1;
  for (const c of CORRIDORS) {
    const k = sstep(corridorDist(x, z, c) / CORRIDOR_FALLOFF);
    if (k < flat) flat = k;
  }

  const land = sstep(dw / FALLOFF);
  const bed = -BED_DEPTH * sstep(-dw / BED_RAMP);

  if (dw < -1) return bed * flat; // deep water: the hills cannot show here

  // Island dome (kept out of the land mask so it stays a smooth dome) plus
  // rolling hills, which are gated off near the centre for the fountain.
  const hillsMask = sstep((r - 5) / 9);
  const islandMask = 1 - sstep((r - 10) / 4);
  const dome = ISLAND_DOME * Math.pow(
    0.5 * (1 + Math.cos((Math.PI * Math.min(r, ISLAND_EDGE)) / ISLAND_EDGE)),
    0.7,
  );
  const h = land * hills(x, z) * hillsMask + (1 - land) * bed + dome * islandMask;
  return h * flat;
}

// True over the lake and rivers (bridges not taken into account).
// Must stay consistent with the lake and river sizes in shared/positions.js.
export function isWater(x, z) {
  return inWater(x, z);
}
