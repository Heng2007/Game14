import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PerspectiveCamera, Vector3 } from 'three';
import { GameState } from './GameState.js';
import { PuzzleProgress, RING_START } from './PuzzleProgress.js';
import { FinaleSequence, buildEpilogue } from './FinaleSequence.js';
import { stoneRings, peelableStrawberry, treeMan } from './procedural.js';
import { NarrativeTriggers, SCRIPT } from '../narrative/script.js';
import { FirstPersonController } from './FirstPersonController.js';

test('epilogue references every combination, including unanswered choices', () => {
  const texts=new Set();
  for(const ateDragonFruit of [null,true,false])for(const owlAction of [null,'heeded','shooed'])for(const candleAction of [null,'kept','snuffed']) {
    const text=buildEpilogue({ateDragonFruit,owlAction,candleAction});texts.add(text);
    assert.match(text,/dragon fruit/);assert.match(text,/owl/);assert.match(text,/candle/);assert.match(text,/mirror, not a verdict/);
    assert.ok(!text.includes('undefined'));
  }
  assert.equal(texts.size,27);
  assert.match(buildEpilogue(new GameState().decisions),/never came/);
});
test('ring solve is initially unsolved, requires all rings, and rejects invalid rings', () => {
  const state=new GameState(),p=new PuzzleProgress(state);
  assert.deepEqual(p.rings,RING_START);assert.equal(state.puzzlesCompleted.edenRings,false);
  p.rotateRing(0);p.rotateRing(1);p.rotateRing(1);p.rotateRing(2);p.rotateRing(2);
  assert.equal(state.puzzlesCompleted.edenRings,false);assert.equal(p.rotateRing(2),true);
  assert.throws(()=>p.rotateRing(-1),RangeError);assert.throws(()=>p.rotateRing(3),RangeError);
});
test('lute requires the ordered phrase, resets on a wrong note, and locks completion', () => {
  const state=new GameState(),p=new PuzzleProgress(state);
  assert.equal(p.luteIndex,0);p.pluck(1);p.pluck(3);assert.equal(p.luteIndex,0);
  for(const note of [1,2,3])assert.equal(p.pluck(note),false);
  assert.equal(p.pluck(4),true);assert.equal(p.pluck(2),true);
  assert.throws(()=>p.pluck(0),RangeError);assert.throws(()=>p.pluck(5),RangeError);
});
test('fruit needs eight peels, decisions lock, and a new run restores state and triggers', () => {
  const state=new GameState(),p=new PuzzleProgress(state),triggers=new NarrativeTriggers();
  p.decide('ateDragonFruit',true);assert.equal(p.decide('ateDragonFruit',false),false);
  assert.equal(state.decisions.ateDragonFruit,true);
  for(let i=0;i<7;i++)p.peel();assert.equal(state.puzzlesCompleted.gardenFruit,false);
  p.peel();p.peel();assert.equal(p.peeled,8);assert.equal(state.puzzlesCompleted.gardenFruit,true);
  triggers.update(SCRIPT[0],()=>{});assert.equal(triggers.history.length,1);
  state.reset();p.reset();triggers.reset();assert.deepEqual(state,new GameState());
  assert.deepEqual(p.rings,RING_START);assert.equal(p.peeled,0);assert.equal(p.luteIndex,0);
  assert.equal(triggers.history.length,0);assert.equal(triggers.fired.size,0);
  triggers.update(SCRIPT[0],()=>{});assert.equal(triggers.history.length,1);
});
test('puzzle prop reset restores ring targets, all peels and the candle light', () => {
  const rings=stoneRings(),fruit=peelableStrawberry(),tree=treeMan();
  rings.userData.rings[0].rotate();rings.userData.rings[0].userData.update(1);
  rings.userData.rings[0].userData.reset(7);assert.equal(rings.userData.rings[0].rotation.y,7*Math.PI/4);
  for(let i=0;i<8;i++)fruit.peel();fruit.userData.update(1);fruit.userData.reset();
  assert.equal(fruit.children[0].children[0].rotation.z,0);assert.equal(fruit.peel(),true);
  const light=tree.children.find(node=>node.isPointLight);tree.userData.setCandle(false);assert.equal(light.intensity,0);
  tree.userData.setCandle(true);assert.equal(light.intensity,32);
});
test('finale freezes navigation, travels to closed shutters, completes only once and can restart', () => {
  const camera=new PerspectiveCamera(60,1,0.1,1000);camera.position.set(95,-6,2);
  let completed=0,unlocks=0,shutter=1;
  const controller={enabled:true,keys:new Set(['KeyW']),velocity:new Vector3(1,0,1),controls:{enabled:true,unlock:()=>unlocks++}};
  const state=new GameState();state.setZone('ACT_III_HELL');
  const finale=new FinaleSequence({camera,controller,state,world:{setShutterAmount:x=>shutter=x},onComplete:text=>{completed++;assert.match(text,/unnamed/);}});
  finale.update(1);assert.equal(finale.phase,'idle');assert.equal(camera.position.x,95);
  assert.equal(finale.start(),true);assert.equal(finale.start(),false);assert.equal(controller.enabled,false);assert.equal(controller.controls.enabled,false);
  assert.equal(controller.keys.size,0);assert.equal(controller.velocity.length(),0);
  finale.update(6);assert.ok(camera.position.x<95&&camera.position.x>-120);
  finale.update(6);assert.equal(finale.phase,'closing');assert.equal(camera.position.x,-120);
  finale.update(2);assert.equal(shutter,0);assert.equal(state.currentZone,'FINALE');assert.equal(unlocks,1);assert.equal(completed,1);
  finale.update(10);assert.equal(completed,1);finale.reset();assert.equal(finale.active,false);assert.equal(controller.enabled,true);
  assert.equal(finale.start(),true);
});
test('disabled controller does not move even when pointer remains locked', () => {
  const controller=Object.assign(Object.create(FirstPersonController.prototype),{enabled:false,controls:{isLocked:true}});
  assert.doesNotThrow(()=>controller.update(0.05));
});
