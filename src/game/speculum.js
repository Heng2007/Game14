import * as THREE from 'three';
import { GameState } from '../core/GameState.js';
import { FirstPersonController } from '../core/FirstPersonController.js';
import * as audio from '../core/audio.js';
import { fountain, berry, bubble, twistedBranch, paintedBackdrop } from '../core/procedural.js';
import { ZONES, EDEN_OBSTACLES, zoneHeight } from '../shared/positions.js';
import './speculum.css';

export const state = new GameState();
export let controller;

export function init({ camera, renderer, scene, ui }) {
  camera.near = 0.1;
  camera.updateProjectionMatrix();
  const zone = ZONES.ACT_I_EDEN;
  camera.position.set(zone.spawn.x, zoneHeight(zone.spawn.x, zone.spawn.z) + 1.7, zone.spawn.z);
  controller = new FirstPersonController(camera, renderer.domElement, {
    getHeight: zoneHeight, bounds: zone.bounds, obstacles: EDEN_OBSTACLES,
  });
  const props = [fountain(), berry(), twistedBranch()];
  props.forEach((prop, i) => {
    const { x, z } = EDEN_OBSTACLES[i];
    prop.position.set(x, zoneHeight(x, z), z);
    scene.add(prop);
  });
  for (let i = 0; i < 5; i++) {
    const sphere = bubble(0.5 + i * 0.3);
    sphere.position.set(6 + i * 2.5, 2 + i, -6 - i * 2);
    scene.add(sphere);
  }
  for (let i = 0; i < 3; i++) {
    const backdrop = paintedBackdrop(i);
    backdrop.position.set((i - 1) * 35, 10 + i * 2, -47 - i * 9);
    scene.add(backdrop);
  }
  ui.innerHTML = `
    <div class="sm-hud"><span>SPECULUM MUNDI</span><h2>I · The first garden</h2><p>EDEN / A STUDY IN INNOCENCE</p></div>
    <div class="sm-crosshair">+</div>
    <div class="sm-caption" aria-live="polite">The world is young. What will you carry from it?</div>
    <div class="sm-controls">W A S D · WALK &nbsp; / &nbsp; MOUSE · LOOK &nbsp; / &nbsp; E / CLICK · TOUCH &nbsp; / &nbsp; Q · CHOOSE &nbsp; / &nbsp; M · MUTE</div>
    <button class="sm-resume" hidden>Return to the garden</button>
    <div class="sm-menu">
      <div class="sm-shutter sm-left"></div><div class="sm-shutter sm-right"></div>
      <div class="sm-title"><span>AN INTERACTIVE TRIPTYCH</span><h1>Speculum<br><em>Mundi</em></h1><p>A mirror of the world</p><div class="sm-rule">✧</div><p>Innocence. Desire. Consequence.<br>Step inside a world not yet finished.</p><button class="sm-open">Open the shutters <b>↗</b></button><small>HEADPHONES RECOMMENDED · WASD + MOUSE</small></div>
    </div>`;
  const menu = ui.querySelector('.sm-menu');
  const resume = ui.querySelector('.sm-resume');
  const caption = ui.querySelector('.sm-caption');
  ui.querySelector('.sm-open').addEventListener('click', () => {
    audio.unlock();
    state.setZone('ACT_I_EDEN');
    menu.classList.add('sm-opening');
    setTimeout(() => { menu.hidden = true; }, 1400);
    controller.lock();
  }, { once: true });
  resume.addEventListener('click', () => { audio.unlock(); controller.lock(); });
  controller.controls.addEventListener('lock', () => { resume.hidden = true; });
  controller.controls.addEventListener('unlock', () => { resume.hidden = state.currentZone === 'SHUTTER_MENU'; });
  controller.addEventListener('primary', () => {
    const distance = Math.hypot(camera.position.x, camera.position.z);
    const text = distance < 7 ? 'The fountain keeps its own counsel. Listen to the water.' : 'Move closer to the rose-coloured fountain. Every beginning has a source.';
    caption.textContent = text;
    audio.speak(text);
  });
  controller.addEventListener('secondary', () => {
    caption.textContent = 'For now, you choose to observe. The garden waits.';
  });
  controller.addEventListener('mute', () => {
    caption.textContent = audio.toggleMute() ? 'Sound and narration muted.' : 'Sound and narration restored.';
  });
  if (new URLSearchParams(location.search).has('fly')) {
    menu.hidden = true;
    ui.querySelector('.sm-controls').textContent = 'STUDY MODE · DRAG TO ORBIT / SCROLL TO ZOOM';
  }
  scene.userData.speculum = { camera, state, controller };
}
export function update(dt) { controller?.update(dt); }
