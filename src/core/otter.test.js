import { test } from 'node:test';
import assert from 'node:assert/strict';
import { followStep, otterModel, FOLLOW } from './otter.js';

const view = { x: 0, z: 0, fx: 1, fz: 0 };            // player at the origin looking along +x
const target = { x: FOLLOW.ahead, z: FOLLOW.side };   // ahead of the player and to their right
const run = (pet, v, seconds, options) => { for (let i = 0; i < seconds * 60; i++) followStep(pet, v, 1 / 60, options); return pet; };

test('otter runs to a spot ahead of the player, then sits and faces them', () => {
  const pet = run({ x: -10, z: -6, heading: 0, moving: false }, view, 6);
  assert.ok(Math.hypot(pet.x - target.x, pet.z - target.z) < 0.3);
  assert.equal(pet.moving, false);
  const toPlayer = Math.atan2(view.x - pet.x, view.z - pet.z);
  assert.ok(Math.abs(Math.atan2(Math.sin(pet.heading - toPlayer), Math.cos(pet.heading - toPlayer))) < 0.05);
});
test('otter stays put for small player movements and never outruns 6.5 m/s', () => {
  const pet = run({ x: target.x, z: target.z, heading: 0, moving: false }, { ...view, x: 0.5 }, 1);
  assert.equal(pet.x, target.x);
  const far = { x: -20, z: 1.5, heading: 0, moving: false };
  followStep(far, view, 0.1);
  assert.ok(Math.abs(far.x + 20) <= 0.65 + 1e-9);
});
test('otter snaps to the player after a long jump, avoids obstacles and stays in bounds', () => {
  const pet = followStep({ x: -90, z: 0, heading: 0, moving: false }, view, 1 / 60);
  assert.deepEqual([pet.x, pet.z], [target.x, target.z]);
  const blocked = run({ x: -5, z: 1.5, heading: 0, moving: false }, view, 4, { obstacles: [{ x: target.x, z: target.z, radius: 2 }] });
  assert.ok(Math.hypot(blocked.x - target.x, blocked.z - target.z) >= 2.4 - 1e-9);
  const edge = run({ x: 0, z: 0, heading: 0, moving: false }, view, 4, { bounds: { minX: -2, maxX: 2, minZ: -1, maxZ: 1 } });
  assert.deepEqual([edge.x, edge.z], [1.5, 0.5]);
});
test('otter model is about a metre tall and exposes its animated parts', () => {
  const model = otterModel();
  assert.equal(model.userData.paws.length, 2);
  assert.ok(model.userData.screen.material.isMeshBasicMaterial);
  assert.ok(Math.abs(model.scale.y * 3.15 - 1.04) < 0.05);
});
