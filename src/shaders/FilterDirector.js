import { Box3, MathUtils, Raycaster, Sphere, Vector2, Vector3, Vector4 } from 'three';

const PULSES = {
  touch:['uTouch',.65], ring:['uRings',1.3], align:['uAlign',2],
  fruit:['uStrawberry',1.7], lute:['uShock',1.1], invert:['uInvert',.22],
  eat:['uEat',2.2], crack:['uGlassCrack',.55],
};
const GRADES = ['uSepia','uDream','uOwl','uAmber','uNoir'];

export function createFilterUniforms() {
  const uniforms={uTime:{value:0},uInteractFocus:{value:0},uSaturation:{value:1},
    uFocusRegion:{value:new Vector4(.5,.5,.2,.2)},uTargetDepth:{value:1},uTargetSpread:{value:0},uTargetVisible:{value:0},
    uBubble:{value:0},uShockRadius:{value:0},uAlignRadius:{value:0}};
  for(const name of [...GRADES,...Object.values(PULSES).map(p=>p[0])])uniforms[name]={value:0};
  return uniforms;
}

export class FilterDirector {
  constructor(uniforms) {
    this.uniforms=uniforms;this.center=new Vector3();this.projected=new Vector3();this.box=new Box3();
    this.raycaster=new Raycaster();this.cursor=new Vector2();this.sphere=new Sphere(new Vector3(),.7);
    this.reset();
  }
  reset() {
    const defaults=createFilterUniforms();
    for(const [key,{value}] of Object.entries(defaults)){
      if(typeof value==='number')this.uniforms[key].value=value;
      else this.uniforms[key].value.copy(value);
    }
    this.pulses=new Map();this.previous={decisions:{},puzzles:{}};this.passedFruit=false;
    this.target=null;this.cooldown=0;this.time=0;
  }
  pulse(kind='touch') {
    if(!PULSES[kind])throw new RangeError(`Unknown filter pulse: ${kind}`);
    const [name,duration]=PULSES[kind];this.pulses.set(kind,{name,duration,age:0,fresh:true});this.uniforms[name].value=1;
    if(kind==='lute')this.uniforms.uShockRadius.value=0;
    if(kind==='align')this.uniforms.uAlignRadius.value=0;
  }
  observe(state) {
    const d=state.decisions,p=state.puzzlesCompleted;
    for(const key of Object.keys(d))if(d[key]!==null&&d[key]!==this.previous.decisions[key]){
      this.pulse(key==='ateDragonFruit'&&d[key]===true?'eat':'touch');
    }
    if(p.edenRings&&!this.previous.puzzles.edenRings)this.pulse('align');
    if(p.hellLute&&!this.previous.puzzles.hellLute)this.pulse('invert');
    this.previous={decisions:{...d},puzzles:{...p}};
  }
  selectTarget(world,camera) {
    const nearby=world.nearby(camera.position);if(nearby)return nearby;
    camera.updateMatrixWorld();this.raycaster.setFromCamera(this.cursor,camera);this.raycaster.far=camera.far;
    const roots=new Map(world.interactables.filter(item=>item.object.visible).map(item=>[item.object,item]));
    const hits=this.raycaster.intersectObjects([...roots.keys()],true);
    let selected=null,distance=Infinity;
    for(const hit of hits){
      let object=hit.object;while(object&&!roots.has(object))object=object.parent;
      if(object&&hit.distance<distance){selected=roots.get(object);distance=hit.distance;}
    }
    for(const [object,item] of roots)if(!object.isMesh&&!object.children.length){
      object.getWorldPosition(this.sphere.center);
      if(this.raycaster.ray.intersectSphere(this.sphere,this.projected)){
        const d=this.projected.distanceTo(camera.position);if(d<distance){selected=item;distance=d;}
      }
    }
    return selected;
  }
  focus(object,camera) {
    const u=this.uniforms;u.uTargetVisible.value=0;
    if(!object){this.target=null;return;}
    camera.updateMatrixWorld();
    if(object!==this.target){
      this.target=object;this.box.setFromObject(object);
      if(this.box.isEmpty())this.box.setFromCenterAndSize(object.getWorldPosition(this.center),new Vector3(1.4,1.4,1.4));
      this.corners=[];
      for(const x of [this.box.min.x,this.box.max.x])for(const y of [this.box.min.y,this.box.max.y])for(const z of [this.box.min.z,this.box.max.z]){
        this.corners.push(object.worldToLocal(new Vector3(x,y,z)));
      }
    }
    let left=Infinity,right=-Infinity,bottom=Infinity,top=-Infinity,near=Infinity,far=-Infinity,front=0;
    for(const corner of this.corners){
      object.localToWorld(this.projected.copy(corner));this.projected.applyMatrix4(camera.matrixWorldInverse);
      const depth=-this.projected.z;near=Math.min(near,depth);far=Math.max(far,depth);
      if(depth<camera.near)continue;
      front++;this.projected.applyMatrix4(camera.projectionMatrix);
      left=Math.min(left,this.projected.x*.5+.5);right=Math.max(right,this.projected.x*.5+.5);
      bottom=Math.min(bottom,this.projected.y*.5+.5);top=Math.max(top,this.projected.y*.5+.5);
    }
    if(!front)return;
    if(front<8){left=bottom=0;right=top=1;}
    left=MathUtils.clamp(left,0,1);right=MathUtils.clamp(right,0,1);bottom=MathUtils.clamp(bottom,0,1);top=MathUtils.clamp(top,0,1);
    near=Math.max(camera.near,near);
    u.uFocusRegion.value.set((left+right)*.5,(bottom+top)*.5,Math.max(.04,(right-left)*.5),Math.max(.04,(top-bottom)*.5));
    u.uTargetDepth.value=(near+far)*.5;u.uTargetSpread.value=(far-near)*.5;
    u.uTargetVisible.value=right>left&&top>bottom?1:0;
  }
  update(dt,{state,focus=false,bubble=false,pitch=0,angularSpeed=0,x=-100,active=true}) {
    if(!Number.isFinite(dt)||dt<0)throw new RangeError('Filter timestep must be non-negative');
    this.time+=dt;this.uniforms.uTime.value=this.time;this.cooldown=Math.max(0,this.cooldown-dt);
    this.observe(state);
    if(active&&x>-33&&state.decisions.ateDragonFruit!==true)this.passedFruit=true;
    if(bubble&&this.cooldown===0&&(Math.abs(pitch)>.8||angularSpeed>2.8)){
      this.pulse('crack');this.cooldown=.75;
    }
    for(const [kind,p] of this.pulses){
      if(p.fresh)p.fresh=false;else p.age+=dt;
      this.uniforms[p.name].value=Math.max(0,1-Math.max(0,p.age-.08)/p.duration)**2;
      if(kind==='lute')this.uniforms.uShockRadius.value=Math.min(1,p.age/p.duration);
      if(kind==='align')this.uniforms.uAlignRadius.value=Math.min(1,p.age/p.duration);
      if(p.age>=p.duration+.08)this.pulses.delete(kind);
    }
    const d=state.decisions,hell=state.currentZone==='ACT_III_HELL';
    const targets={uInteractFocus:active&&focus&&!bubble?1:0,uBubble:bubble?1:0,
      uSaturation:hell&&d.candleAction==='snuffed'?.25:d.ateDragonFruit===true?1.35:1,
      uSepia:d.ateDragonFruit===false||this.passedFruit&&d.ateDragonFruit!==true?.75:0,
      uDream:d.owlAction==='heeded'?.65:0,uOwl:d.owlAction==='shooed'?.7:0,
      uAmber:hell&&d.candleAction==='kept'?.8:0,uNoir:hell&&d.candleAction==='snuffed'?1:0};
    for(const [name,target] of Object.entries(targets)){
      const value=this.uniforms[name].value,step=dt/.3;
      this.uniforms[name].value=value+Math.sign(target-value)*Math.min(Math.abs(target-value),step);
    }
  }
  snapshot() {
    return Object.fromEntries(Object.entries(this.uniforms).filter(([key])=>key.startsWith('u')).map(([key,{value}])=>[key,value?.toArray?value.toArray():value]));
  }
}
