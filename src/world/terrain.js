// PART 1 owns this file. Part 2 imports it but does not edit it.
// Keep these two function signatures exactly as they are.

import { inWater } from '../shared/positions.js';

// Ground height in metres at (x, z). Starter: flat ground.
export function getHeight(x, z) {
  return 0;
}

// True over the lake and rivers (bridges not taken into account).
// Must stay consistent with the lake and river sizes in shared/positions.js.
export function isWater(x, z) {
  return inWater(x, z);
}
