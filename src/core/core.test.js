import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Vector3 } from 'three';
import { GameState } from './GameState.js';
import { FirstPersonController } from './FirstPersonController.js';
import { zoneHeight } from '../shared/positions.js';

test('state defaults, transitions, reset and unsubscribe', () => {
  const state = new GameState();
  assert.equal(state.currentZone, 'SHUTTER_MENU');
  assert.deepEqual(Object.values(state.decisions), [null, null, null]);
  assert.deepEqual(Object.values(state.puzzlesCompleted), [false, false, false, false]);
  let calls = 0;
  const off = state.subscribe(() => calls++);
  state.setZone('ACT_I_EDEN'); state.setDecision('ateDragonFruit', true); state.completePuzzle('edenRings');
  assert.equal(calls, 3); assert.equal(state.decisions.ateDragonFruit, true);
  assert.equal(state.puzzlesCompleted.edenRings, true);
  off(); state.reset(); assert.equal(calls, 3);
  assert.equal(state.decisions.ateDragonFruit, null);
});
test('unknown and empty state keys reject without mutation', () => {
  const state = new GameState();
  for (const key of ['', 'invalid', '__proto__']) {
    assert.throws(() => state.setZone(key), RangeError);
    assert.throws(() => state.setDecision(key, true), RangeError);
    assert.throws(() => state.completePuzzle(key), RangeError);
  }
  assert.equal(state.currentZone, 'SHUTTER_MENU');
});
test('terrain, rectangle/circle boundaries and empty/occupied obstacles', () => {
  const controller = Object.assign(Object.create(FirstPersonController.prototype), {
    bounds: { radius: 10 }, obstacles: [], getHeight: zoneHeight, eyeHeight: 1.7,
  });
  const p = new Vector3(20, -100, 0);
  controller.constrain(p);
  assert.equal(p.x, 9.55); assert.equal(p.y, zoneHeight(p.x, p.z) + 1.7);
  controller.bounds = { minX: -10, maxX: 10, minZ: -10, maxZ: 10 };
  controller.obstacles = [{ x: 0, z: 0, radius: 2 }];
  p.set(0, 0, 0); controller.constrain(p); assert.equal(p.x, 2.45);
  p.set(-20, 0, 20); controller.constrain(p); assert.equal(p.x, -9.55); assert.equal(p.z, 9.55);
});
test('locked movement is smoothed; unlocked controller stays still', () => {
  const p = new Vector3(0, 1.7, 20);
  const controller = Object.assign(Object.create(FirstPersonController.prototype), {
    camera: { position: p }, velocity: new Vector3(), keys: new Set(['KeyW']),
    getHeight: () => 0, eyeHeight: 1.7, bounds: { radius: 48 }, obstacles: [],
    controls: { isLocked: true, moveForward: (d) => { p.z -= d; }, moveRight: (d) => { p.x += d; } },
  });
  controller.update(0.05); assert.ok(p.z < 20); assert.ok(controller.velocity.z < 4);
  controller.controls.isLocked = false;
  const z = p.z; controller.update(0.05); assert.equal(p.z, z);
});
