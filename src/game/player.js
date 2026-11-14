// PART 2 owns this file. Movement, jumping, flying, water and collision rules.
// No Three.js here: it only changes numbers, index.js moves the models.

import { getHeight, isWater } from '../world/terrain.js';
import {
  BRIDGES, BRIDGE_LENGTH, BRIDGE_WIDTH, FOUNTAIN, TOWERS, SCENERY, MAP_SIZE,
} from '../shared/positions.js';
import { isDown, wasPressed, consumeTriple } from './input.js';

export const START = { x: 30, z: 70, heading: Math.atan2(-30, -70) };
const LIMIT = MAP_SIZE / 2 - 5;
const GRAVITY = 22;
const JUMP_SPEED = 8;
const FLY_SECONDS = 5;
const FLY_COOLDOWN = 3;
const FLY_HEIGHT = 12;
const MOUNT_REACH = 4;

// Circles the player can't walk or ride through (metres), from the model sizes.
const RADIUS = { tree: 1.8, bird: 1.5, glass_sphere: 2, shell: 1.6 };
const OBSTACLES = [
  { x: FOUNTAIN.x, z: FOUNTAIN.z, r: 5.5 },
  ...TOWERS.map((t) => ({ x: t.x, z: t.z, r: 5 })),
  ...SCENERY.map((s) => ({ x: s.x, z: s.z, r: RADIUS[s.name] ?? 1.5 })),
];

// True if (x, z) is on a bridge. isWater() ignores bridges, so we check here.
export function onBridge(x, z) {
  return BRIDGES.some((b) => {
    const dx = x - b.x, dz = z - b.z;
    const along = dx * Math.sin(b.rotY) + dz * Math.cos(b.rotY);
    const across = dx * Math.cos(b.rotY) - dz * Math.sin(b.rotY);
    return Math.abs(along) <= BRIDGE_LENGTH / 2 && Math.abs(across) <= BRIDGE_WIDTH / 2 + 0.3;
  });
}
export const blocked = (x, z) => isWater(x, z) && !onBridge(x, z);

export function createPlayer() {
  const p = {};
  resetPlayer(p);
  return p;
}

export function resetPlayer(p) {
  Object.assign(p, {
    x: START.x, z: START.z, y: getHeight(START.x, START.z), heading: START.heading,
    speed: 0, vy: 0, grounded: true, mounted: true,
    flying: false, flyLeft: 0, flyCooldown: 0,
    mount: { x: START.x, z: START.z, heading: START.heading },
  });
}

function move(p, nx, nz) {
  if (p.flying || !blocked(nx, nz)) { p.x = nx; p.z = nz; return; }
  if (!blocked(nx, p.z)) { p.x = nx; return; }   // slide along the shore
  if (!blocked(p.x, nz)) { p.z = nz; return; }
  p.speed *= 0.3;
}

export function updatePlayer(p, dt) {
  // F: get on or off the mount
  if (wasPressed('KeyF') && p.grounded && !p.flying) {
    if (p.mounted) {
      p.mounted = false;
      p.mount = { x: p.x, z: p.z, heading: p.heading };
      p.speed = 0;
    } else if (Math.hypot(p.x - p.mount.x, p.z - p.mount.z) < MOUNT_REACH) {
      p.mounted = true;
      p.x = p.mount.x; p.z = p.mount.z;
      p.speed = 0;
    }
  }

  // Space: jump. Three taps: fly.
  if (wasPressed('Space') && p.grounded && !p.flying) { p.vy = JUMP_SPEED; p.grounded = false; }
  if (consumeTriple() && !p.flying && p.flyCooldown <= 0) {
    p.flying = true; p.flyLeft = FLY_SECONDS; p.grounded = false; p.vy = 0;
  }

  // W / S / A / D
  const max = p.flying ? 18 : p.mounted ? 15 : 5;
  const accel = p.flying ? 12 : p.mounted ? 9 : 20;
  if (isDown('KeyW')) p.speed = Math.min(max, p.speed + accel * dt);
  else if (isDown('KeyS')) {
    const floor = p.mounted || p.flying ? 0 : -2.5; // walking can back up
    p.speed = Math.max(floor, p.speed - 25 * dt);
  } else {
    const f = (p.mounted ? 3 : 8) * dt;
    p.speed = p.speed > 0 ? Math.max(0, p.speed - f) : Math.min(0, p.speed + f);
  }
  const steer = (isDown('KeyA') ? 1 : 0) - (isDown('KeyD') ? 1 : 0); // A = left = +x when facing +z
  const turn = (p.mounted || p.flying ? 1.8 : 2.8) * Math.min(1, 0.25 + Math.abs(p.speed) / 6);
  p.heading += steer * turn * dt;

  move(p, p.x + Math.sin(p.heading) * p.speed * dt, p.z + Math.cos(p.heading) * p.speed * dt);
  p.x = Math.max(-LIMIT, Math.min(LIMIT, p.x));
  p.z = Math.max(-LIMIT, Math.min(LIMIT, p.z));

  if (!p.flying) {
    for (const o of OBSTACLES) {
      const dx = p.x - o.x, dz = p.z - o.z, d = Math.hypot(dx, dz), min = o.r + 0.6;
      if (d < min) {
        const k = d > 1e-6 ? 1 / d : 0;
        p.x = o.x + (k ? dx * k : 1) * min;
        p.z = o.z + (k ? dz * k : 0) * min;
        p.speed *= 0.8;
      }
    }
  }

  // Height
  const ground = getHeight(p.x, p.z);
  if (p.flying) {
    p.flyLeft -= dt;
    // Keep flying until we are over land, so we never land in the water.
    if (p.flyLeft <= 0 && blocked(p.x, p.z)) p.flyLeft = 0.05;
    const diff = ground + FLY_HEIGHT - p.y;
    p.y += Math.max(-10 * dt, Math.min(10 * dt, diff));
    if (p.flyLeft <= 0) { p.flying = false; p.flyCooldown = FLY_COOLDOWN; p.vy = 0; }
  } else {
    p.flyCooldown = Math.max(0, p.flyCooldown - dt);
    p.vy -= GRAVITY * dt;
    p.y += p.vy * dt;
    if (p.y <= ground) { p.y = ground; p.vy = 0; p.grounded = true; } else p.grounded = false;
  }
}
