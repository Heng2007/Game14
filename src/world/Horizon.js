import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { composite, cube, cone, part } from './AmbientGeometry.js';

const COLOURS = ['#bfcdb1','#d4dfe0','#11151c'].map(color=>new THREE.Color(color));

export function createZoneFog() { return new THREE.FogExp2(COLOURS[0],0.0115); }

export function updateZoneFog(fog,x) {
  const garden=THREE.MathUtils.smoothstep(x,-40,-30),hell=THREE.MathUtils.smoothstep(x,30,40);
  fog.color.copy(COLOURS[0]).lerp(COLOURS[1],garden).lerp(COLOURS[2],hell);
  fog.density=THREE.MathUtils.lerp(THREE.MathUtils.lerp(.0115,.01,garden),.02,hell);
}

export function installHeightFog(scene) {
  const installed=new Set();
  scene.traverse(object=>{
    for(const material of Array.isArray(object.material)?object.material:[object.material]){
      if(!material||material.isShaderMaterial||installed.has(material)||material.userData.heightFog)continue;
      installed.add(material);material.userData.heightFog=true;
      const compile=material.onBeforeCompile,key=material.customProgramCacheKey();
      material.onBeforeCompile=function(shader,renderer){
        compile.call(this,shader,renderer);
        shader.vertexShader=shader.vertexShader.replace('#include <fog_pars_vertex>',`#include <fog_pars_vertex>
          #ifdef USE_FOG
            uniform float fogDensity;
            varying float sceneryFog;
          #endif`);
        shader.vertexShader=shader.vertexShader.replace('#include <fog_vertex>',`#include <fog_vertex>
          #ifdef USE_FOG
            vec4 fogWorld = vec4(transformed,1.0);
            #ifdef USE_INSTANCING
              fogWorld = instanceMatrix * fogWorld;
            #endif
            fogWorld = modelMatrix * fogWorld;
            vFogDepth *= exp(-max(0.0,fogWorld.y + 8.0) * 0.018);
            sceneryFog = 1.0 - exp(-fogDensity * fogDensity * vFogDepth * vFogDepth);
          #endif`);
        shader.fragmentShader=shader.fragmentShader.replace('#include <fog_pars_fragment>',`#include <fog_pars_fragment>
          #ifdef USE_FOG
            varying float sceneryFog;
          #endif`).replace('#include <fog_fragment>',`#ifdef USE_FOG
            gl_FragColor.rgb = mix(gl_FragColor.rgb,fogColor,sceneryFog);
          #endif`);
      };
      material.customProgramCacheKey=()=>`${key}:height-fog`;
      material.needsUpdate=true;
    }
  });
}

function silhouette() {
  const shape=new THREE.Shape();shape.moveTo(-4,0);
  for(const [x,y] of [[-4,8],[-2,10],[-2,15],[-1,17],[0,23],[1,17],[2,15],[2,10],[4,8],[4,0]])shape.lineTo(x,y);
  shape.closePath();return new THREE.ShapeGeometry(shape);
}

function cityTower() {
  const p=[part(cube(),'#202731',[0,-19,0],[3,58,3]),part(cone(),'#292b32',[0,12,0],[2.5,4,2.5])];
  for(const x of [-1.1,1.1])p.push(part(cube(),'#32313b',[x,10,0],[.5,2,3.8]));
  for(const x of [-.7,.7])for(const y of [3,6,9])p.push(part(cube(),'#b46436',[x,y,1.53],[.35,.8,.05]));
  return composite(p);
}

export class Horizon {
  constructor(scene) {
    this.scene=scene;this.time=0;this.batches=[];this.matrix=new THREE.Object3D();
    const ridge=composite([
      part(cone(),'#718277',[0,.5,0],[1,1,1]),
      part(cone(),'#87968a',[-.3,.32,.1],[.6,.65,.7]),
      part(cone(),'#5c756c',[.3,.28,-.1],[.6,.56,.7]),
    ]);
    const cutout=silhouette();
    const zones=[['eden',-130,-35,'#788a78'],['garden',-35,35,'#9a9ca4'],['hell',35,110,'#303947']];
    for(const [act,from,to,color] of zones){
      const peaks=[],painted=[];
      for(let layer=0;layer<3;layer++)for(const side of [-1,1]){
        for(let x=from;x<to+10;x+=18){
          const h=34+layer*8+Math.sin(x*.29+layer*2)*3;
          peaks.push({x,y:-19,z:side*(49+layer*19),sx:26,sy:h,sz:13+layer*5,angle:Math.sin(x)*.2});
        }
      }
      for(let x=from+3;x<to;x+=13)for(const side of [-1,1])painted.push({x,y:5,z:side*59,sx:.7,sy:.8+(Math.sin(x)*.5+.5)*.6,sz:1,angle:side<0?0:Math.PI});
      if(act==='eden'||act==='hell')for(let z=-50;z<=50;z+=12)peaks.push({x:act==='eden'?-130:117,y:-19,z,sx:22,sy:50,sz:20,angle:0});
      this.addBatch(scene,`${act}:ridges`,ridge,new THREE.MeshBasicMaterial({vertexColors:true,color}),peaks);
      this.addBatch(scene,`${act}:cutouts`,cutout,new THREE.MeshBasicMaterial({color,side:THREE.DoubleSide}),painted);
    }
    const towers=[];
    for(let i=0;i<20;i++)towers.push({x:38+i*4,y:18+(i%3)*3,z:-65-(i%3)*6,sx:1,sy:.7+(i%5)*.16,sz:1,angle:i*.12});
    this.addBatch(scene,'hell:city',cityTower(),new THREE.MeshLambertMaterial({vertexColors:true,emissive:'#442619',emissiveIntensity:.4}),towers);
    const planes=[0,Math.PI/3,Math.PI*2/3].map(angle=>new THREE.PlaneGeometry(1,1,1,4).translate(0,.5,0).rotateY(angle));
    const columns=mergeGeometries(planes);planes.forEach(plane=>plane.dispose());
    this.fireMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,
      uniforms:{time:{value:0},fogColor:{value:new THREE.Color()},density:{value:.02}},
      vertexShader:`varying vec2 fireUv; varying float distanceToEye; varying float altitude; uniform float time;
        void main(){fireUv=uv;vec3 p=position;p.x+=sin(time*2.1+instanceMatrix[3].x+p.y*5.0)*p.y*.14;
          vec4 world=modelMatrix*instanceMatrix*vec4(p,1.0);vec4 view=viewMatrix*world;distanceToEye=length(view.xyz);altitude=world.y;
          gl_Position=projectionMatrix*view;}`,
      fragmentShader:`varying vec2 fireUv; varying float distanceToEye; varying float altitude; uniform float time; uniform vec3 fogColor; uniform float density;
        void main(){float y=fireUv.y;float wave=sin(y*18.0-time*4.0+sin(y*7.0+time*1.7))*0.13;
          float width=(1.0-y)*.5;float a=(1.0-smoothstep(width-.12,width+.06,abs(fireUv.x-.5+wave)))*(1.0-y)*.45;
          float fog=1.0-exp(-pow(distanceToEye*density*exp(-max(0.0,altitude+8.0)*.018),2.0));
          vec3 color=mix(vec3(1.0,.58,.12),vec3(.7,.12,.035),y);gl_FragColor=vec4(mix(color,fogColor,fog),a*(1.0-fog));}`,
    });
    this.addBatch(scene,'hell:fire',columns,this.fireMaterial,towers.filter((_,i)=>i%2===0).map(p=>({...p,y:p.y+5*p.sy,sx:3,sy:9+(p.x%7),sz:3})));
  }
  addBatch(scene,name,geometry,material,items){
    const mesh=new THREE.InstancedMesh(geometry,material,items.length);mesh.name=`horizon:${name}`;
    mesh.userData.noOutline=true;
    items.forEach((p,i)=>{
      this.matrix.position.set(p.x,p.y,p.z);this.matrix.scale.set(p.sx,p.sy,p.sz);this.matrix.rotation.set(0,p.angle,0);this.matrix.updateMatrix();mesh.setMatrixAt(i,this.matrix.matrix);
    });
    mesh.computeBoundingSphere();scene.add(mesh);this.batches.push(mesh);
  }
  update(dt,position){
    this.time+=dt;this.fireMaterial.uniforms.time.value=this.time;
    this.fireMaterial.uniforms.fogColor.value.copy(this.scene.fog.color);this.fireMaterial.uniforms.density.value=this.scene.fog.density;
    for(const mesh of this.batches){
      const {center,radius}=mesh.boundingSphere;
      mesh.visible=Math.hypot(center.x-position.x,center.z-position.z)<170+radius;
      if(mesh.name.includes('hell:city')||mesh.name.includes('hell:fire'))mesh.visible&&=position.x>5;
    }
  }
}
