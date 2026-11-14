// PART 2 owns this file. Keep the two exported function signatures.
// Wires the player, fruit, camera, score, menus and sound together.

import { loadModel } from '../shared/models.js';
import {
  FOUNTAIN, TOWERS, BRIDGES, SCENERY, DELIVERY_RADIUS,
} from '../shared/positions.js';
import { getHeight } from '../world/terrain.js';
import { createPlayer, resetPlayer, updatePlayer } from './player.js';
import { createFruit } from './fruit.js';
import { createUI } from './ui.js';
import { wasPressed, endFrame } from './input.js';
import * as audio from './audio.js';

const MOUNT_SEAT = 1.3; // height of the rider above the mount's base

let camera, ui, hud, fruit, mountObject, playerObject;
const player = createPlayer();
let mode = 'menu'; // 'menu' | 'playing' | 'finished'
let carried = 0, delivered = 0, time = 0, stepTimer = 0, muted = false;

function play() {
  resetPlayer(player);
  carried = 0; delivered = 0;
  fruit.reset();
  mode = 'playing';
  hud.showHud();
  hud.setCounts(0, 0);
  audio.start();
  syncModels();
  followCamera(1, true);
}

function finish() {
  if (mode !== 'playing') return;
  mode = 'finished';
  hud.showEnd(delivered);
  audio.setWind(0);
}

function toggleMute() {
  muted = !muted;
  audio.setMuted(muted);
  hud.setMuted(muted);
}

function syncModels() {
  const p = player;
  mountObject.position.set(p.mounted ? p.x : p.mount.x, p.mounted ? p.y : getHeight(p.mount.x, p.mount.z), p.mounted ? p.z : p.mount.z);
  mountObject.rotation.y = p.mounted ? p.heading : p.mount.heading;
  const bob = Math.abs(Math.sin(time * 10)) * 0.12 * Math.min(1, Math.abs(p.speed) / 5) * (p.grounded ? 1 : 0);
  playerObject.position.set(p.x, p.y + (p.mounted ? MOUNT_SEAT : 0) + bob, p.z);
  playerObject.rotation.y = p.heading;
}

function followCamera(dt, snap = false) {
  const p = player;
  const back = p.mounted || p.flying ? 9 : 6;
  const x = p.x - Math.sin(p.heading) * back;
  const z = p.z - Math.cos(p.heading) * back;
  const y = Math.max(p.y + 4.5, getHeight(x, z) + 2);
  if (snap) camera.position.set(x, y, z);
  else camera.position.lerp({ x, y, z }, 1 - Math.exp(-5 * dt));
  camera.lookAt(p.x, p.y + 1.5, p.z);
}

// Called once at startup. ctx = { renderer, scene, camera, ui }.
export async function init(ctx) {
  const { scene, ui: root } = ctx;
  camera = ctx.camera;

  // Fountain, towers, bridges and scenery
  await Promise.all([FOUNTAIN, ...TOWERS, ...BRIDGES, ...SCENERY].map(async (spot) => {
    const object = await loadModel(spot.name);
    object.position.set(spot.x, getHeight(spot.x, spot.z), spot.z);
    object.rotation.y = spot.rotY ?? 0;
    scene.add(object);
  }));

  [mountObject, playerObject] = await Promise.all([loadModel('mount'), loadModel('player')]);
  scene.add(mountObject, playerObject);
  fruit = await createFruit(scene);

  hud = createUI(root, { onPlay: play, onFinish: finish, onMute: toggleMute });

  resetPlayer(player);
  syncModels();
  followCamera(1, true);

  // ?fly is Part 1's free-camera mode: no menu, no game.
  if (new URLSearchParams(location.search).has('fly')) hud.hideAll();
}

// Called every frame (not in ?fly mode). dt = seconds since the last frame.
export function update(dt) {
  time += dt;
  if (mode === 'menu' && wasPressed('Enter')) play();
  else if (mode === 'finished' && wasPressed('Enter')) play();
  else if (mode === 'playing') {
    if (wasPressed('KeyM')) toggleMute();
    if (wasPressed('Enter')) { finish(); endFrame(); return; }

    updatePlayer(player, dt);

    // footsteps / hooves
    stepTimer -= dt;
    if (player.grounded && Math.abs(player.speed) > 0.5 && stepTimer <= 0) {
      audio.step(player.mounted);
      stepTimer = player.mounted ? 0.3 : 0.45;
    }
    audio.setWind(player.flying ? 1 : 0);

    const picked = fruit.update(dt, time, player);
    if (picked) { carried += picked; audio.pickup(); }

    const d = Math.hypot(player.x - FOUNTAIN.x, player.z - FOUNTAIN.z);
    if (carried > 0 && d <= DELIVERY_RADIUS) { delivered += carried; carried = 0; audio.deliver(); }

    const fly = player.flying ? `Flying ${player.flyLeft.toFixed(1)}s` : player.flyCooldown > 0 ? 'Wings recharging' : '';
    hud.setCounts(carried, delivered, fly);
    syncModels();
    followCamera(dt);
  } else {
    fruit.update(dt, time, { x: 1e6, z: 1e6, y: 0 }); // keep the fruit bobbing behind the menu
  }
  endFrame();
}
