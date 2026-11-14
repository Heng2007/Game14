import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Vector3 } from 'three';
import { GameState } from './GameState.js';
import { FirstPersonController } from './FirstPersonController.js';
import { zoneHeight } from '../shared/positions.js';
import { TRIPTYCH, zoneAtX, triptychHeight, triptychWater, triptychBlocked, onTriptychBridge } from '../shared/positions.js';
import { stoneRings, peelableStrawberry } from './procedural.js';

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

test('contiguous zone boundaries and smooth descent', () => {
  for (const [x,zone] of [[-100,'ACT_I_EDEN'],[-35.001,'ACT_I_EDEN'],[-35,'ACT_II_GARDEN'],[34.999,'ACT_II_GARDEN'],[35,'ACT_III_HELL'],[100,'ACT_III_HELL']]) {
    assert.equal(zoneAtX(x),zone);
  }
  assert.equal(triptychHeight(0,0),0);
  assert.equal(triptychHeight(60,0),-8);
  for (const x of [-35,35,55]) assert.ok(Math.abs(triptychHeight(x-0.001,26)-triptychHeight(x+0.001,26))<0.01);
});
test('pool, island, rivers and all bridge crossings agree', () => {
  assert.equal(triptychWater(0,0),false);
  assert.equal(triptychBlocked(10,0),true);
  assert.equal(triptychBlocked(0,32),true);
  assert.equal(triptychBlocked(-45,0),false);
  assert.equal(triptychBlocked(59,-13),false);
  for (const bridge of TRIPTYCH.bridges) {
    assert.equal(onTriptychBridge(bridge.x,bridge.z),true);
    assert.equal(triptychBlocked(bridge.x,bridge.z),false);
  }
  for(let x=-99;x<100;x+=0.2) assert.equal(triptychBlocked(x,26),false,`eastward path at ${x}`);
  assert.equal(onTriptychBridge(32,32),false);
});
test('blocked moves slide per axis or revert, preserving terrain height', () => {
  const p=new Vector3(0,1.7,0);
  const controller=Object.assign(Object.create(FirstPersonController.prototype),{
    camera:{position:p},velocity:new Vector3(4,0,4),keys:new Set(['KeyW','KeyD']),
    getHeight:()=>2,eyeHeight:1.7,bounds:{radius:48},obstacles:[],blocked:(x,z)=>x>0&&z>0,
    controls:{isLocked:true,moveForward:d=>{p.z+=d;},moveRight:d=>{p.x+=d;}},
  });
  controller.update(0.05);assert.ok(p.x>0);assert.equal(p.z,0);assert.equal(p.y,3.7);
  controller.blocked=(x,z)=>x!==0||z!==0;p.set(0,3.7,0);
  controller.update(0.05);assert.equal(p.x,0);assert.equal(p.z,0);
});
test('stone rings tween 45 degrees; fruit peels eight segments and handles exhaustion', () => {
  const rings=stoneRings();
  const ring=rings.userData.rings[0];assert.equal(ring.rotation.y,0);
  ring.rotate();for(let i=0;i<100;i++)ring.userData.update(0.05);
  assert.ok(Math.abs(ring.rotation.y-Math.PI/4)<0.001);
  const fruit=peelableStrawberry();
  for(let i=0;i<8;i++)assert.equal(fruit.peel(),true);
  assert.equal(fruit.peel(),false);
  fruit.userData.update(0.5);assert.ok(fruit.children[0].children[0].rotation.z<0);
});
