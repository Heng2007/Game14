// PART 2 owns this file. The fruit you collect.

import { loadModel } from '../shared/models.js';
import { FRUIT_SPAWNS } from '../shared/positions.js';
import { getHeight } from '../world/terrain.js';

const PICKUP_RADIUS = 2.5;
const RESPAWN_SECONDS = 25;

export async function createFruit(scene) {
  const items = await Promise.all(
    FRUIT_SPAWNS.map(async (s, i) => {
      const object = await loadModel(s.name);
      scene.add(object);
      return { object, s, i, base: getHeight(s.x, s.z) + 1.2, wait: 0 };
    }),
  );

  function reset() {
    for (const f of items) { f.wait = 0; f.object.visible = true; }
  }

  // Returns how many were picked up this frame.
  function update(dt, time, player) {
    let picked = 0;
    for (const f of items) {
      if (f.wait > 0) {
        f.wait -= dt;
        if (f.wait <= 0) f.object.visible = true;
        continue;
      }
      f.object.position.set(f.s.x, f.base + Math.sin(time * 2 + f.i) * 0.3, f.s.z);
      f.object.rotation.y = time * 0.8 + f.i;
      const near = Math.hypot(player.x - f.s.x, player.z - f.s.z) < PICKUP_RADIUS;
      if (near && Math.abs(player.y + 1 - f.object.position.y) < 4) {
        f.wait = RESPAWN_SECONDS;
        f.object.visible = false;
        picked++;
      }
    }
    return picked;
  }

  return { reset, update };
}
