// PART 2 owns this file. Keep the two exported function signatures.
// Starter version: puts every model on the map and parks the camera.
// No controls, fruit pickup, score, menus or sound yet.

import { loadModel } from '../shared/models.js';
import { FOUNTAIN, TOWERS, BRIDGES, SCENERY, FRUIT_SPAWNS } from '../shared/positions.js';
import { getHeight } from '../world/terrain.js';

// Called once at startup. ctx = { renderer, scene, camera, ui }.
export async function init({ scene, camera }) {
  const spots = [FOUNTAIN, ...TOWERS, ...BRIDGES, ...SCENERY, ...FRUIT_SPAWNS];
  await Promise.all(
    spots.map(async (spot) => {
      const object = await loadModel(spot.name);
      object.position.set(spot.x, getHeight(spot.x, spot.z), spot.z);
      object.rotation.y = spot.rotY ?? 0;
      scene.add(object);
    }),
  );

  camera.position.set(0, 60, 150);
  camera.lookAt(0, 0, 0);
}

// Called every frame (not in ?fly mode). dt = seconds since the last frame.
export function update(dt) {}
