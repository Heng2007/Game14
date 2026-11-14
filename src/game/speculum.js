import { GameState } from '../core/GameState.js';
import { FirstPersonController } from '../core/FirstPersonController.js';
import * as audio from '../core/audio.js';
import { TRIPTYCH, triptychHeight, triptychBlocked, zoneAtX } from '../shared/positions.js';
import { DiegeticText } from '../narrative/DiegeticText.js';
import { NarrativeTriggers, OPENING_LINE } from '../narrative/script.js';
import './speculum.css';

export const state = new GameState();
export let controller;
let world, hud, caption, entered = false;
let diegetic;
const triggers = new NarrativeTriggers();
const titles = {
  ACT_I_EDEN: ['I · The Garden of Eden','INNOCENCE / THE FIRST LIGHT'],
  ACT_II_GARDEN: ['II · Earthly Delights','DESIRE / THE POOL OF LUST'],
  ACT_III_HELL: ['III · Musical Hell','CONSEQUENCE / A BROKEN SONG'],
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
    <div class="sm-controls">W A S D · WALK &nbsp; / &nbsp; MOUSE · LOOK &nbsp; / &nbsp; E / CLICK · TOUCH &nbsp; / &nbsp; Q · CHOOSE &nbsp; / &nbsp; M · MUTE</div>
    <button class="sm-resume" hidden>Return to the triptych</button>
    <div class="sm-menu sm-triptych-menu">
      <div class="sm-title"><span>AN INTERACTIVE TRIPTYCH</span><h1>Speculum <em>Mundi</em></h1><p>A mirror of the world</p><button class="sm-open">Open the Triptych <b>↗</b></button><small>INNOCENCE · DESIRE · CONSEQUENCE</small></div>
    </div>`;
  const menu=ui.querySelector('.sm-menu'),resume=ui.querySelector('.sm-resume');
  ui.classList.add('sm-at-shutters');
  hud=ui.querySelector('.sm-hud');caption=ui.querySelector('.sm-caption');
  const status=ui.querySelector('.sm-status');
  diegetic=new DiegeticText(scene,camera,audio.narrator,caption);
  ui.querySelector('.sm-open').addEventListener('click',()=>{
    audio.unlock();menu.classList.add('sm-opening');
    audio.speak(OPENING_LINE.text,OPENING_LINE);
    // Capture the activation now; walking stays disabled during the entrance.
    controller.lock();
    world.open(()=>{
      entered=true;menu.hidden=true;ui.classList.remove('sm-at-shutters');setZone('ACT_I_EDEN');
      if(!controller.controls.isLocked)resume.hidden=false;
    });
  },{once:true});
  resume.addEventListener('click',()=>{audio.unlock();controller.lock();});
  controller.controls.addEventListener('lock',()=>{resume.hidden=true;});
  controller.controls.addEventListener('unlock',()=>{resume.hidden=!entered;});
  controller.addEventListener('primary',()=>{
    if(!entered)return;
    const text=world.interact(camera.position);audio.speak(text,{zone:state.currentZone});
  });
  controller.addEventListener('secondary',()=>{if(entered)status.textContent='You choose to observe. The world waits.';});
  controller.addEventListener('mute',()=>{status.textContent=audio.toggleMute()?'Voice muted · subtitles remain on':'Voice restored';});
  if(new URLSearchParams(location.search).has('fly')) {
    menu.hidden=true;entered=true;ui.classList.remove('sm-at-shutters');setZone('ACT_II_GARDEN');
    ui.querySelector('.sm-controls').textContent='STUDY MODE · DRAG TO ORBIT / SCROLL TO ZOOM';
  }
  if(import.meta.env.DEV)window.__speculum={state,controller,renderer,world,narrator:audio.narrator,diegetic,triggers};
}
export function update(dt) {
  audio.narrator.update();diegetic?.update(dt);
  if(!entered)return;
  controller.update(dt);
  setZone(zoneAtX(controller.camera.position.x));
  triggers.update(controller.camera.position,line=>audio.speak(line.text,line));
}
