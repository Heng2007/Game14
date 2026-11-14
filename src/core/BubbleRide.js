import { Vector3 } from 'three';
import { pathHeight } from '../shared/positions.js';

export class BubbleRide {
  constructor(camera,controller,bubble){
    Object.assign(this,{camera,controller,bubble});this.home=bubble.position.clone();this.active=false;this.elapsed=0;
  }
  start(){
    if(this.active)return false;
    this.active=true;this.elapsed=0;this.from=this.camera.position.clone();
    this.controller.enabled=false;
    this.controller.keys.clear();this.controller.velocity.set(0,0,0);return true;
  }
  update(dt){
    if(!this.active)return;
    this.elapsed=Math.min(10,this.elapsed+dt);
    const t=Math.max(0,Math.min(1,(this.elapsed-1)/7)),s=t*t*(3-2*t);
    const x=-21+48*s,z=4*(1-s)+(-1)*s+Math.sin(s*Math.PI)*14;
    const target=new Vector3(x,pathHeight(x,z)+4+Math.sin(s*Math.PI)*2,z);
    if(this.elapsed<1)this.camera.position.lerpVectors(this.from,target,this.elapsed);
    else this.camera.position.copy(target);
    this.bubble.position.copy(target).add(new Vector3(0,-0.4,0));
    if(this.elapsed>8)this.camera.position.y=target.y+(pathHeight(27,-1)+1.7-target.y)*((this.elapsed-8)/2);
    if(this.elapsed===10)this.reset();
  }
  reset(){
    this.active=false;this.elapsed=0;this.bubble.position.copy(this.home);
    this.controller.enabled=true;this.controller.controls.enabled=true;
    this.controller.keys.clear();this.controller.velocity.set(0,0,0);
  }
}
