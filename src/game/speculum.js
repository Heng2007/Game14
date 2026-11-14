import { GameState } from '../core/GameState.js';
import { FirstPersonController } from '../core/FirstPersonController.js';
import * as audio from '../core/audio.js';
import { TRIPTYCH, triptychHeight, triptychBlocked, zoneAtX } from '../shared/positions.js';
import { DiegeticText } from '../narrative/DiegeticText.js';
import { NarrativeTriggers, OPENING_LINE } from '../narrative/script.js';
import { SoundManager } from '../audio/SoundManager.js';
import { FinaleSequence } from '../core/FinaleSequence.js';
import './speculum.css';

export const state = new GameState();
export let controller;
let world, hud, caption, entered = false;
let diegetic;
let finale;
const sound = new SoundManager();
const triggers = new NarrativeTriggers();
const titles = {
  ACT_I_EDEN: ['I · The Garden of Eden','INNOCENCE / THE FIRST LIGHT'],
  ACT_II_GARDEN: ['II · Earthly Delights','DESIRE / THE POOL OF LUST'],
  ACT_III_HELL: ['III · Musical Hell','CONSEQUENCE / A BROKEN SONG'],
  FINALE: ['The mirror closes','WHAT WE BROUGHT / WHAT REMAINS'],
};
function setZone(zone) {
  if (state.currentZone === zone) return;
  state.setZone(zone);
  hud.querySelector('h2').textContent = titles[zone][0];
  hud.querySelector('p').textContent = titles[zone][1];
  hud.classList.toggle('sm-dark',zone === 'ACT_III_HELL');
}
export function init({ camera, renderer, scene, ui }) {
  world=scene.userData.triptych;
  camera.near=0.1;camera.updateProjectionMatrix();
  camera.position.set(-126,8,26);camera.rotation.set(0,-Math.PI/2,0);
  controller=new FirstPersonController(camera,renderer.domElement,{
    getHeight:triptychHeight,bounds:TRIPTYCH.bounds,obstacles:world.obstacles,blocked:triptychBlocked,
  });
  ui.innerHTML=`
    <div class="sm-hud"><span>SPECULUM MUNDI</span><h2>I · The Garden of Eden</h2><p>INNOCENCE / THE FIRST LIGHT</p></div>
    <div class="sm-crosshair">+</div>
    <div class="sm-caption" aria-live="polite" aria-atomic="true"></div>
    <div class="sm-status" role="status"></div>
    <div class="sm-prompt" role="status"></div>
    <div class="sm-controls">W A S D · WALK &nbsp; / &nbsp; MOUSE · LOOK &nbsp; / &nbsp; E / CLICK · TOUCH &nbsp; / &nbsp; Q · CHOOSE &nbsp; / &nbsp; M · MUTE</div>
    <button class="sm-resume" hidden>Return to the triptych</button>
    <section class="sm-finale" hidden aria-label="Epilogue"><div><span>THE MIRROR CLOSES</span><h2>What remains</h2><p></p><button class="sm-again">Re-open the Triptych (Play Again)</button></div></section>
    <div class="sm-menu sm-triptych-menu">
      <div class="sm-title"><span>AN INTERACTIVE TRIPTYCH</span><h1>Speculum <em>Mundi</em></h1><p>A mirror of the world</p><button class="sm-open">Open the Triptych <b>↗</b></button><small>INNOCENCE · DESIRE · CONSEQUENCE</small></div>
    </div>`;
  const menu=ui.querySelector('.sm-menu'),resume=ui.querySelector('.sm-resume');
  ui.classList.add('sm-at-shutters');
  hud=ui.querySelector('.sm-hud');caption=ui.querySelector('.sm-caption');
  const status=ui.querySelector('.sm-status');
  const prompt=ui.querySelector('.sm-prompt'),ending=ui.querySelector('.sm-finale');
  diegetic=new DiegeticText(scene,camera,audio.narrator,caption);
  world.configureGameplay(state,sound);
  audio.narrator.addEventListener('line-start',()=>{sound.ducked=true;});
  audio.narrator.addEventListener('line-end',()=>{sound.ducked=false;});
  finale=new FinaleSequence({camera,controller,world,state,onComplete:text=>{
    hud.querySelector('h2').textContent=titles.FINALE[0];hud.querySelector('p').textContent=titles.FINALE[1];
    ending.querySelector('p').textContent=text;ending.hidden=false;resume.hidden=true;
    audio.speak(text,{id:'epilogue',zone:'ACT_I_EDEN'});
  }});
  function open() {
    audio.unlock();sound.start(audio.getContext(),audio.getMasterGain());menu.classList.add('sm-opening');
    audio.speak(OPENING_LINE.text,OPENING_LINE);
    // Capture the activation now; walking stays disabled during the entrance.
    controller.lock();
    world.open(()=>{
      entered=true;menu.hidden=true;ui.classList.remove('sm-at-shutters');setZone('ACT_I_EDEN');
      if(!controller.controls.isLocked)resume.hidden=false;
    });
  }
  ui.querySelector('.sm-open').addEventListener('click',open,{once:true});
  ui.querySelector('.sm-again').addEventListener('click',()=>{
    entered=false;ending.hidden=true;resume.hidden=true;status.textContent='';prompt.textContent='';
    state.reset();triggers.reset();audio.narrator.reset();diegetic.clear();sound.stop();sound.ducked=false;
    world.resetGameplay();finale.reset();controller.keys.clear();controller.velocity.set(0,0,0);
    camera.fov=60;camera.updateProjectionMatrix();camera.position.set(-126,8,26);camera.rotation.set(0,-Math.PI/2,0);
    menu.hidden=false;ui.classList.add('sm-at-shutters');open();
  });
  resume.addEventListener('click',()=>{audio.unlock();controller.lock();});
  controller.controls.addEventListener('lock',()=>{resume.hidden=true;});
  controller.controls.addEventListener('unlock',()=>{resume.hidden=!entered||finale.active;});
  controller.addEventListener('primary',()=>{
    if(!entered||finale.active)return;
    const text=world.interact(camera.position);audio.speak(text,{zone:state.currentZone});
  });
  controller.addEventListener('secondary',()=>{if(entered&&!finale.active)audio.speak(world.interact(camera.position,true),{zone:state.currentZone});});
  controller.addEventListener('mute',()=>{status.textContent=audio.toggleMute()?'Voice muted · subtitles remain on':'Voice restored';});
  document.addEventListener('keydown',event=>{
    if(event.repeat||!entered||finale.active)return;
    if(event.code==='Digit0'){audio.narrator.reset();diegetic.clear();prompt.textContent='';finale.start();return;}
    const destination={Digit7:TRIPTYCH.spawn,Digit8:{x:-29,z:26},Digit9:{x:43,z:26}}[event.code];
    if(destination){
      controller.keys.clear();controller.velocity.set(0,0,0);camera.position.set(destination.x,triptychHeight(destination.x,destination.z)+1.7,destination.z);
      camera.rotation.set(0,-Math.PI/2,0);setZone(zoneAtX(destination.x));return;
    }
    if(!controller.controls.isLocked)return;
    const note=Number(event.code.match(/^Digit([1-4])$/)?.[1]);
    if(note){const instrument=world.nearby(camera.position,'onNote');if(instrument)status.textContent=instrument.onNote(note);}
  });
  world.prompt=prompt;
  if(new URLSearchParams(location.search).has('fly')) {
    menu.hidden=true;entered=true;ui.classList.remove('sm-at-shutters');setZone('ACT_II_GARDEN');
    ui.querySelector('.sm-controls').textContent='STUDY MODE · DRAG TO ORBIT / SCROLL TO ZOOM';
  }
  if(import.meta.env.DEV)window.__speculum={state,controller,renderer,world,narrator:audio.narrator,diegetic,triggers,sound,finale};
}
export function update(dt) {
  audio.narrator.update();diegetic?.update(dt);
  if(!entered)return;
  if(!finale.active&&Math.hypot(controller.camera.position.x-TRIPTYCH.throne.x,controller.camera.position.z-TRIPTYCH.throne.z)<4){
    audio.narrator.reset();diegetic.clear();world.prompt.textContent='';finale.start();
  }
  if(finale.active){finale.update(dt);sound.update(controller.camera.position.x);return;}
  controller.update(dt);
  sound.update(controller.camera.position.x);
  setZone(zoneAtX(controller.camera.position.x));
  world.prompt.textContent=world.nearby(controller.camera.position)?.prompt?.()??'';
  triggers.update(controller.camera.position,line=>audio.speak(line.text,line));
}
