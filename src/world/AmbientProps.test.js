import test from 'node:test';
import assert from 'node:assert/strict';
import { Scene, Mesh, MeshLambertMaterial, ShaderMaterial, BoxGeometry } from 'three';
import { AmbientProps, createAmbientLayout, ambientPose, ambientClearance } from './AmbientProps.js';
import { Horizon, createZoneFog, updateZoneFog, installHeightFog } from './Horizon.js';
import { installWind } from './AmbientGeometry.js';

test('deterministic ambient population exceeds 150 instances with every zone represented',()=>{
  const items=createAmbientLayout();assert.ok(items.length>=150);assert.deepEqual(items,createAmbientLayout());
  for(const act of ['eden','garden','hell'])assert.ok(items.filter(item=>item.act===act).length>=80);
  for(const item of items){
    assert.ok(ambientClearance(item)>=0,`${item.type} has clearance`);
    if(item.permitted==='clutter'){assert.ok(item.radius<=.25);assert.ok(item.height<=.25);}
  }
  assert.deepEqual(createAmbientLayout({density:0}),[]);
  assert.throws(()=>createAmbientLayout({density:-1}),RangeError);
  assert.throws(()=>createAmbientLayout({density:NaN}),RangeError);
});

test('animated cavalcade reserves the walking corridor and landmarks throughout its orbit',()=>{
  const mounts=createAmbientLayout().filter(item=>item.type==='mount');let moved=0,hidden=0;
  for(let time=0;time<120;time+=2)for(const item of mounts){
    const pose=ambientPose(item,time);
    if(pose.scale===0){hidden++;continue;}
    assert.ok(ambientClearance(item,pose.x,pose.z)>=0);
    if(Math.hypot(pose.x-item.x,pose.z-item.z)>2)moved++;
  }
  assert.ok(moved>0);assert.ok(hidden>0);
});

test('ambient props remain instanced, near-camera and throttled; three particle batches',()=>{
  const scene=new Scene(),ambient=new AmbientProps(scene);
  assert.equal(ambient.particles.length,3);
  assert.equal(ambient.batches.reduce((n,b)=>n+b.items.length,0),ambient.items.length);
  assert.equal(new Set(ambient.batches.map(b=>b.mesh.name)).size,ambient.batches.length);
  for(const {mesh} of ambient.batches)assert.ok(mesh.isInstancedMesh&&mesh.frustumCulled);
  ambient.update(.2,{x:-84,z:18});assert.ok(ambient.batches.some(b=>b.mesh.count>0));
  const batch=ambient.batches.find(b=>b.mesh.count>0),version=batch.mesh.instanceMatrix.version;
  ambient.update(.01,{x:-84,z:18});assert.equal(batch.mesh.instanceMatrix.version,version);
  ambient.update(.2,{x:1000,z:1000});assert.ok(ambient.batches.every(b=>!b.mesh.visible));
  ambient.update(.2,{x:NaN,z:0});ambient.update(.2);
  ambient.update(.2,{x:0,z:0});assert.ok(ambient.batches.some(b=>b.mesh.visible));
});

test('zone fog is exponential, smoothly blended, with height fog on standard materials',()=>{
  const fog=createZoneFog();assert.ok(fog.isFogExp2);
  const densities=[];
  for(const x of [-84,0,63]){updateZoneFog(fog,x);densities.push(fog.density);assert.ok(fog.color.isColor);}
  assert.deepEqual(densities,[.0115,.01,.02]);
  updateZoneFog(fog,35);assert.ok(fog.density>.01&&fog.density<.02);
  const scene=new Scene(),material=new MeshLambertMaterial(),custom=new ShaderMaterial();
  installWind(material,{value:0});const wind=material.onBeforeCompile;installWind(material,{value:0});assert.equal(material.onBeforeCompile,wind);
  scene.add(new Mesh(new BoxGeometry(),material),new Mesh(new BoxGeometry(),custom));
  installHeightFog(scene);const compile=material.onBeforeCompile;installHeightFog(scene);
  assert.equal(material.onBeforeCompile,compile);assert.equal(custom.userData.heightFog,undefined);
  const shader={uniforms:{},vertexShader:'#include <begin_vertex>\n#include <fog_vertex>',fragmentShader:'#include <fog_fragment>'};material.onBeforeCompile(shader);
  assert.equal(shader.vertexShader.match(/uniform float sceneryTime/g).length,1);
  assert.ok(shader.vertexShader.includes('instanceMatrix * fogWorld'));
  assert.ok(shader.vertexShader.includes('vFogDepth *= exp('));
  const empty=new Scene();installHeightFog(empty);
});

test('layered ridges, cutouts, towers and volumetric fire use instanced batches',()=>{
  const scene=new Scene();scene.fog=createZoneFog();const horizon=new Horizon(scene);
  assert.equal(horizon.batches.length,8);
  for(const mesh of horizon.batches)assert.ok(mesh.isInstancedMesh&&mesh.count>0&&mesh.frustumCulled);
  horizon.update(.2,{x:-84,z:18});assert.equal(horizon.batches.find(m=>m.name==='horizon:hell:fire').visible,false);
  updateZoneFog(scene.fog,63);horizon.update(.2,{x:63,z:10});
  assert.equal(horizon.batches.find(m=>m.name==='horizon:hell:fire').visible,true);
  assert.equal(horizon.fireMaterial.uniforms.density.value,.02);
  assert.ok(horizon.fireMaterial.uniforms.time.value>0);
});
