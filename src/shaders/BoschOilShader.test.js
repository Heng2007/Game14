import test from 'node:test';
import assert from 'node:assert/strict';
import { Scene, Mesh, SphereGeometry, MeshBasicMaterial } from 'three';
import { BoschOilPass } from './BoschOilShader.js';

test('focused transparent puzzle contributes normals and all visibility is restored',()=>{
  const scene=new Scene(),geometry=new SphereGeometry(1,8,4),material=new MeshBasicMaterial({transparent:true,opacity:.2});
  const bubble=new Mesh(geometry,material),other=new Mesh(geometry,material);scene.add(bubble,other);
  for(const filterTarget of [null,bubble]){
    let rendered;
    const renderer={getRenderTarget:()=>null,setRenderTarget(){},clear(){},render(){rendered=[bubble.visible,other.visible];}};
    const pass={scene,renderer,filterTarget,camera:{near:.1,far:200},normalMaterial:{},normalTarget:{},
      pass:{uniforms:{cameraNear:{},cameraFar:{}}},composer:{render(){}}};
    BoschOilPass.prototype.render.call(pass);
    assert.deepEqual(rendered,[Boolean(filterTarget),false]);assert.equal(bubble.visible,true);assert.equal(other.visible,true);assert.equal(scene.overrideMaterial,null);
  }
  geometry.dispose();material.dispose();
});
