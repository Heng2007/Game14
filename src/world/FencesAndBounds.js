import * as THREE from 'three';
import { PATH, pathHeight } from '../shared/positions.js';
import { corridorDistance, projectCorridor } from '../core/Corridor.js';
import { FenceChunks } from './FenceChunks.js';

export class FencesAndBounds {
  constructor(scene) {
    this.segments = PATH; this.boxes = []; this.time = 0;
    this.chunks = new FenceChunks(scene); this.assets = {};
    const cube = new THREE.BoxGeometry(1,1,1), rock = new THREE.OctahedronGeometry(1,0);
    const thorn = new THREE.ConeGeometry(0.12,0.7,3);
    const sphere = new THREE.OctahedronGeometry(0.19,0);
    const weave = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.045,0,-0.55),new THREE.Vector3(0.045,0,0),new THREE.Vector3(-0.045,0,0.55),
    ]),2,0.025,3,false);
    const vine = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.2,0,-0.6),new THREE.Vector3(0.25,0.35,-0.2),new THREE.Vector3(-0.25,0.7,0.2),new THREE.Vector3(0.2,1,0.6),
    ]),3,0.09,3,false);
    const batches = new Map();
    let currentAct;
    const add = (key, geometry, color, x, y, z, sx, sy, sz, angle = 0) => {
      if (!batches.has(key)) batches.set(key,{geometry,items:[],seen:new Set()});
      const batch=batches.get(key),id=[currentAct,color,x,y,z,sx,sy,sz,angle].join(':');
      if(batch.seen.has(id))return;
      batch.seen.add(id);batch.items.push({act:currentAct,color,x,y,z,sx,sy,sz,angle});
    };
    const trails = { eden: [], garden: [], hell: [] };
    let lantern = 0;
    for (const segment of PATH) {
      const { a,b,halfWidth:w,act,kind } = segment;
      currentAct=act;
      const dx=b.x-a.x,dz=b.z-a.z,length=Math.hypot(dx,dz),ux=dx/(length||1),uz=dz/(length||1);
      if (length) {
        const points=trails[act], width=kind==='bridge'?1:Math.min(w*0.55,1.2);
        for(let t=0;t<length;t+=1.25){
          const corner=(distance,side)=>{const x=a.x+ux*distance-uz*width*side,z=a.z+uz*distance+ux*width*side;return [x,pathHeight(x,z)+0.07,z];};
          const p=corner(t,-1),q=corner(t,1),r=corner(Math.min(length,t+1.25),-1),s=corner(Math.min(length,t+1.25),1);
          points.push(...p,...q,...r,...q,...s,...r);
        }
      }
      const edges=[];
      for(let distance=0;distance<length;distance+=1){
        const t=Math.min(length,distance+0.5);
        for(const side of [-1,1]) edges.push({x:a.x+ux*t-uz*w*side,z:a.z+uz*t+ux*w*side,tx:ux,tz:uz});
      }
      for(const center of [a,b]) for(let angle=0;angle<Math.PI*2;angle+=0.16){
        const x=center.x+Math.cos(angle)*w,z=center.z+Math.sin(angle)*w;
        if(Math.abs(corridorDistance(x,z,[segment]))<0.02)edges.push({x,z,tx:-Math.sin(angle),tz:Math.cos(angle)});
      }
      for(const {x,z,tx,tz} of edges){
        if(corridorDistance(x,z,PATH)<-0.06)continue;
        const y=pathHeight(x,z),angle=Math.atan2(tx,tz);
        this.boxes.push({x,z,ux:tx,uz:tz,halfLength:0.5,halfWidth:0.09});
        const wood=act==='hell'?'#685d54':act==='garden'?'#d4a6b2':'#756044';
        add(act+'-wood',cube,wood,x,y+0.85,z,0.15,1.7,0.15,angle);
        for(const h of [0.45,0.85,1.25])add(act+'-wood',cube,wood,x,y+h,z,0.1,0.09,1.05,angle);
        if(kind==='bridge'||kind==='ice')continue;
        if(act==='eden'){
          for(let h=0.2;h<1.5;h+=0.35)add('wattle',weave,'#a18b62',x,y+h,z,1,1,1,angle);
          add('hedge',rock,'#3b593c',x,y+0.65,z,0.5,0.8,0.6,angle);
          add('thorn',thorn,'#544c35',x+0.25,y+1.3,z,1,1,1,angle);
          if(Math.floor(x*3+z*2)%3===0)add('ledge',rock,'#396651',x,y+0.9,z,0.65,1.8,0.6,angle);
        }else if(act==='garden'){
          add('garden-wood',cube,'#a2becb',x,y+0.1,z,0.45,0.2,1.05,angle);
          add('garden-wood',cube,'#e4b7bf',x,y+1.35,z,0.32,0.16,1.05,angle);
          add('bramble',vine,'#63575f',x,y+0.15,z,1,1,1,angle);
          add('thorn',thorn,'#6f5267',x,y+0.7,z,1,1,1,angle);
        }else{
          add('pike',thorn,'#a26b4c',x,y+1.8,z,1.1,1.2,1.1,angle);
          add('hell-wood',cube,'#84969c',x+tx*0.3,y+0.85,z+tz*0.3,0.12,1.8,0.17,angle);
          if(Math.floor(x+z)%3===0)add('obsidian',rock,'#292d3b',x,y+0.9,z,0.55,2.2,0.6,angle);
        }
        if(++lantern%16===0){
          add('posts',cube,'#5a493e',x,y+1.3,z,0.12,2.6,0.12);
          add('orbs',sphere,'#ffcf86',x,y+2.65,z,1,1,1);
        }
      }
    }
    const matrix=new THREE.Matrix4(),rotation=new THREE.Quaternion(),scale=new THREE.Vector3(),position=new THREE.Vector3();
    const prepare=(geometry,color,matrix)=>{
      const copy=geometry.index?geometry.toNonIndexed():geometry.clone();
      copy.applyMatrix4(matrix);
      const colors=new Float32Array(copy.attributes.position.count*3),ink=new THREE.Color(color);
      for(let i=0;i<colors.length;i+=3){colors[i]=ink.r;colors[i+1]=ink.g;colors[i+2]=ink.b;}
      copy.setAttribute('color',new THREE.BufferAttribute(colors,3));
      copy.setAttribute('uv',new THREE.BufferAttribute(new Float32Array(copy.attributes.position.count*2).fill(0.5),2));
      return copy;
    };
    for(const [key,{geometry,items}] of batches){
      this.assets[key]={instances:items.length,triangles:(geometry.index?.count??geometry.attributes.position.count)/3*items.length};
      if(key==='orbs')continue;
      for(const item of items){
        position.set(item.x,item.y,item.z);rotation.setFromAxisAngle(THREE.Object3D.DEFAULT_UP,item.angle);scale.set(item.sx,item.sy,item.sz);
        matrix.compose(position,rotation,scale);
        this.chunks.add(prepare(geometry,item.color,matrix),item.act,item.x,['wattle','bramble','thorn'].includes(key));
      }
    }
    const orbs=batches.get('orbs')?.items??[];
    this.lanterns=orbs;
    this.orbMaterial=new THREE.MeshLambertMaterial({color:'#ffcf86',emissive:'#ffc06c',emissiveIntensity:1.2});
    this.orbMesh=new THREE.InstancedMesh(sphere,this.orbMaterial,orbs.length);scene.add(this.orbMesh);
    const glowMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{time:{value:0}},
      vertexShader:'varying vec2 uvGlow; varying float phase; void main(){uvGlow=uv; phase=instanceMatrix[3].x; vec4 center=modelViewMatrix*instanceMatrix*vec4(0.,0.,0.,1.); center.xy+=position.xy*1.4; gl_Position=projectionMatrix*center;}',
      fragmentShader:'uniform float time; varying vec2 uvGlow; varying float phase; void main(){float a=pow(max(0.,1.-length(uvGlow-.5)*2.),2.); gl_FragColor=vec4(1.,.68,.3,a*(.3+.08*sin(time*1.7-phase*.12)));}',
    });
    this.glowMaterial=glowMaterial;
    this.glows=new THREE.InstancedMesh(new THREE.PlaneGeometry(1,1),glowMaterial,orbs.length);
    this.glows.instanceMatrix=this.orbMesh.instanceMatrix;scene.add(this.glows);
    orbs.forEach((lamp,i)=>this.orbMesh.setMatrixAt(i,matrix.makeTranslation(lamp.x,lamp.y,lamp.z)));
    const canvas=document.createElement('canvas');canvas.width=128;canvas.height=128;
    const ctx=canvas.getContext('2d');ctx.fillStyle='#9e9379';ctx.fillRect(0,0,128,128);
    for(let row=0;row<8;row++)for(let col=0;col<8;col++){ctx.fillStyle=(row+col)%3?'#afa58e':'#867e69';ctx.fillRect(col*16+(row%2)*5,row*16,13,12);}
    ctx.fillStyle='white';ctx.fillRect(60,60,8,8);
    const texture=new THREE.CanvasTexture(canvas);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
    for(const [act,vertices] of Object.entries(trails)){
      for(let i=0;i<vertices.length;i+=18){
        const strip=vertices.slice(i,i+18),geometry=new THREE.BufferGeometry();
        geometry.setAttribute('position',new THREE.Float32BufferAttribute(strip,3));geometry.computeVertexNormals();
        const painted=prepare(geometry,act==='hell'?'#89949b':'#c2b398',matrix.identity());
        painted.setAttribute('uv',new THREE.Float32BufferAttribute(strip.flatMap((v,j)=>j%3===1?[]:[v*0.45]),2));
        this.chunks.add(painted,act,strip[0]);geometry.dispose();
      }
    }
    const ice=new THREE.BoxGeometry(2.7,0.2,18);
    this.chunks.add(prepare(ice,'#a4cbd0',matrix.makeTranslation(59,pathHeight(59,-13)+0.04,-13)),'hell',59);ice.dispose();
    for(const [from,to] of [[-28,-20.8],[-13.2,-6]]){
      const geometry=new THREE.PlaneGeometry(3.6,to-from,1,8).rotateX(-Math.PI/2);
      const vertices=geometry.attributes.position;
      for(let i=0;i<vertices.count;i++){const x=81+vertices.getX(i),z=(from+to)/2+vertices.getZ(i);vertices.setXYZ(i,x,pathHeight(x,z)+0.03,z);}
      geometry.computeVertexNormals();this.chunks.add(prepare(geometry,'#87745c',matrix.identity()),'hell',81);geometry.dispose();
    }
    this.chunks.build(new THREE.MeshLambertMaterial({map:texture,vertexColors:true,flatShading:true}));
    for(const geometry of [cube,rock,thorn,weave,vine])geometry.dispose();
    this.lanternMatrix=new THREE.Matrix4();
  }
  contains(x,z,margin=0){return corridorDistance(x,z,this.segments,margin)<=1e-7;}
  project(position,margin=0.45){return projectCorridor(position,this.segments,margin);}
  update(dt,position){
    this.time+=dt;this.glowMaterial.uniforms.time.value=this.time;this.orbMaterial.emissiveIntensity=1.1+Math.sin(this.time*1.7)*0.2;
    if(!Number.isFinite(position?.x)||!Number.isFinite(position?.z))return;
    this.chunks.update(position);
    let count=0;
    for(const lamp of this.lanterns)if(Math.hypot(lamp.x-position.x,lamp.z-position.z)<=60){
      this.orbMesh.setMatrixAt(count++,this.lanternMatrix.makeTranslation(lamp.x,lamp.y,lamp.z));
    }
    for(const mesh of [this.orbMesh,this.glows]){mesh.count=count;mesh.visible=count>0;mesh.computeBoundingSphere();}
    this.glows.boundingSphere.radius+=0.3;
    this.orbMesh.instanceMatrix.needsUpdate=true;
  }
}
