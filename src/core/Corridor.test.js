import test from 'node:test';
import assert from 'node:assert/strict';
import { Vector3 } from 'three';
import { corridorDistance, projectCorridor, pushFromBoxes } from './Corridor.js';
import { PATH, PATH_SPAWNS, PATH_LANDMARKS, TRIPTYCH, pathHeight, triptychBlocked, triptychWater } from '../shared/positions.js';
import { SCRIPT } from '../narrative/script.js';
import { FirstPersonController } from './FirstPersonController.js';
import { BubbleRide } from './BubbleRide.js';

const contains=(x,z,margin=0)=>corridorDistance(x,z,PATH,margin)<=1e-6;
test('capsule union projects deterministic random points inside with a player margin',()=>{
  let seed=51;
  for(let i=0;i<2000;i++){
    seed=(seed*1664525+1013904223)>>>0;const x=seed/2**32*300-150;
    seed=(seed*1664525+1013904223)>>>0;const z=seed/2**32*150-75;
    const p={x,z};projectCorridor(p,PATH);assert.ok(contains(p.x,p.z,0.45));
  }
  const p={x:1,z:2};assert.equal(projectCorridor(p,[]),p);assert.deepEqual(p,{x:1,z:2});
  assert.equal(corridorDistance(0,0,[]),Infinity);
});
test('landmarks, triggers, ring handles and act teleports are inside the guided union',()=>{
  for(const p of [...PATH_LANDMARKS.map(key=>TRIPTYCH[key]),TRIPTYCH.score,...SCRIPT,...Object.values(PATH_SPAWNS)])assert.ok(contains(p.x,p.z),JSON.stringify(p));
  assert.deepEqual(PATH_LANDMARKS,['spawn','rings','dragonTree','owl','sphere','strawberry','lute','treeMan','throne']);
  const indices=PATH_LANDMARKS.map(key=>PATH.findIndex(segment=>corridorDistance(TRIPTYCH[key].x,TRIPTYCH[key].z,[segment])<=1e-6));
  for(let i=1;i<indices.length;i++)assert.ok(indices[i]>indices[i-1],`${PATH_LANDMARKS[i]} is later along the route`);
  for(let i=0;i<3;i++)assert.ok(contains(-60+Math.sin(i*Math.PI*2/3)*(1.5+i*.8),9+Math.cos(i*Math.PI*2/3)*(1.5+i*.8)));
  assert.ok(contains(-38,-3.2));
  for(const segment of PATH)assert.ok(segment.halfWidth>0.45);
});
test('substepping and oriented fence boxes prevent tunneling and lateral escape',()=>{
  const segments=[{a:{x:-20,z:0},b:{x:20,z:0},halfWidth:2}];
  const p=new Vector3(-2,1.7,0),box={x:0,z:0,ux:0,uz:1,halfLength:2,halfWidth:0.08};
  const c=Object.assign(Object.create(FirstPersonController.prototype),{
    camera:{position:p},velocity:new Vector3(4,0,0),keys:new Set(['KeyD']),getHeight:()=>0,eyeHeight:1.7,
    bounds:{minX:-30,maxX:30,minZ:-30,maxZ:30},obstacles:[],blocked:()=>false,
    corridor:{boxes:[box],project:(p,m)=>projectCorridor(p,segments,m),contains:(x,z,m)=>corridorDistance(x,z,segments,m)<=1e-6},
    controls:{isLocked:true,moveRight:d=>{p.x+=d;},moveForward:d=>{p.z+=d;}},
  });
  for(let i=0;i<20;i++)c.update(4);assert.ok(p.x<=-0.52,p.x);
  c.corridor.boxes=[];c.keys=new Set(['KeyW','KeyD']);for(let i=0;i<60;i++)c.update(2);
  assert.ok(c.corridor.contains(p.x,p.z,0.45));
  const q={x:0,z:0};pushFromBoxes(q,[box]);assert.ok(Math.abs(q.x)>=0.53);
});
test('deep water is blocked on foot; the locked bubble ride crosses it and resets',()=>{
  assert.equal(triptychBlocked(10,0),true);assert.equal(triptychBlocked(-7.25,-7.25),false);
  const camera={position:new Vector3(-21,1.7,4)},controller={enabled:true,controls:{enabled:true},keys:new Set(['KeyW']),velocity:new Vector3(4,0,0)};
  const bubble={position:new Vector3(-21,4,4)},ride=new BubbleRide(camera,controller,bubble);
  assert.equal(ride.start(),true);assert.equal(ride.start(),false);assert.equal(controller.enabled,false);
  let water=0;
  for(let i=0;i<99;i++){ride.update(0.1);if(triptychWater(camera.position.x,camera.position.z))water++;}
  assert.ok(water>0);ride.update(0.2);assert.equal(ride.active,false);assert.equal(controller.enabled,true);
  assert.equal(triptychBlocked(camera.position.x,camera.position.z),false);assert.ok(contains(camera.position.x,camera.position.z,0.45));
  assert.deepEqual(bubble.position.toArray(),[-21,4,4]);ride.start();ride.update(3);ride.reset();assert.equal(ride.elapsed,0);assert.equal(controller.keys.size,0);
  assert.equal(pathHeight(81,-17)-pathHeight(80,-30)>4,true);
});
