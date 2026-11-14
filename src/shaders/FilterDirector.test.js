import test from 'node:test';
import assert from 'node:assert/strict';
import { PerspectiveCamera, Object3D, Mesh, BoxGeometry } from 'three';
import { GameState } from '../core/GameState.js';
import { FilterDirector, createFilterUniforms } from './FilterDirector.js';

function setup(){const state=new GameState(),u=createFilterUniforms(),director=new FilterDirector(u);return{state,u,director,step:(dt,options={})=>director.update(dt,{state,...options})};}
test('focus reaches one and zero in 0.3 seconds, pulses start immediately and decay',()=>{
  const {director,u,step}=setup();step(.15,{focus:true});assert.equal(u.uInteractFocus.value,.5);
  step(.15,{focus:true});assert.equal(u.uInteractFocus.value,1);step(.3);assert.equal(u.uInteractFocus.value,0);
  for(const [kind,name] of [['ring','uRings'],['fruit','uStrawberry'],['lute','uShock'],['align','uAlign'],['invert','uInvert'],['touch','uTouch']]){
    director.pulse(kind);assert.equal(u[name].value,1);step(.2);assert.equal(u[name].value,1);
    step(.2);assert.ok(u[name].value>0&&u[name].value<1);step(3);assert.equal(u[name].value,0);
  }
  assert.throws(()=>director.pulse('missing'),RangeError);assert.throws(()=>step(-1),RangeError);assert.throws(()=>step(NaN),RangeError);
});
test('decision grades persist, noir overrides eaten fruit only in Hell, and reset clears everything',()=>{
  const {director,state,u,step}=setup();state.setDecision('ateDragonFruit',true);step(.3);
  assert.equal(u.uSaturation.value,1.35);assert.ok(u.uEat.value>0);
  state.setDecision('owlAction','heeded');step(.3);assert.equal(u.uDream.value,.65);
  state.setDecision('owlAction','shooed');step(.3);assert.equal(u.uDream.value,0);assert.equal(u.uOwl.value,.7);
  state.setDecision('candleAction','kept');state.setZone('ACT_III_HELL');step(.3);assert.equal(u.uAmber.value,.8);
  state.setDecision('candleAction','snuffed');step(.6);assert.equal(u.uSaturation.value,.25);assert.equal(u.uNoir.value,1);
  state.setZone('ACT_I_EDEN');step(.6);assert.equal(u.uSaturation.value,1.35);assert.equal(u.uNoir.value,0);
  state.reset();director.reset();assert.deepEqual(director.snapshot(),new FilterDirector(createFilterUniforms()).snapshot());
});
test('walking past fruit grades the world without recording a narrative decision',()=>{
  const {state,u,step}=setup();step(.3,{x:-34});assert.equal(u.uSepia.value,0);
  step(.3,{x:-32});assert.equal(u.uSepia.value,.75);assert.equal(state.decisions.ateDragonFruit,null);
  state.setDecision('ateDragonFruit',true);step(.3);assert.equal(u.uSepia.value,0);
  state.setDecision('ateDragonFruit',false);step(.3);assert.equal(u.uSepia.value,.75);
});
test('puzzle lock pulses once; bubble tilt cracks are ride-only and cool down',()=>{
  const {state,director,u,step}=setup();state.completePuzzle('edenRings');step(.1);assert.ok(u.uAlign.value>0);
  step(3);director.observe(state);assert.equal(u.uAlign.value,0);
  state.completePuzzle('hellLute');director.observe(state);assert.equal(u.uInvert.value,1);
  step(.1,{angularSpeed:8});assert.equal(u.uGlassCrack.value,0);
  step(.1,{bubble:true,angularSpeed:8});assert.ok(u.uGlassCrack.value>0);assert.ok(u.uBubble.value>0);
  step(.3,{bubble:true,angularSpeed:8});assert.ok(u.uGlassCrack.value<.8);
  step(1,{bubble:false});assert.equal(u.uBubble.value,0);assert.equal(u.uGlassCrack.value,0);
});
test('focus projection handles empty and offscreen targets without a mask pass',()=>{
  const {director,u}=setup(),camera=new PerspectiveCamera(60,1,.1,200);camera.updateMatrixWorld();
  director.focus(null,camera);assert.equal(u.uTargetVisible.value,0);
  const target=new Object3D();target.position.set(0,0,-3);target.updateMatrixWorld();director.focus(target,camera);
  const item={object:target};assert.equal(director.selectTarget({nearby:()=>null,interactables:[item]},camera),item);
  assert.equal(director.selectTarget({nearby:()=>null,interactables:[]},camera),null);
  assert.equal(u.uTargetVisible.value,1);assert.ok(u.uFocusRegion.value.toArray().every(Number.isFinite));
  target.position.z=3;target.updateMatrixWorld();director.focus(target,camera);assert.equal(u.uTargetVisible.value,0);
  const tall=new Mesh(new BoxGeometry(4,30,4).translate(0,15,0));tall.position.z=-4;tall.updateMatrixWorld();
  director.focus(tall,camera);assert.equal(u.uTargetVisible.value,1);assert.ok(u.uFocusRegion.value.y>.5);
  tall.geometry.dispose();tall.material.dispose();
});
