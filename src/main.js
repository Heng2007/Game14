// SHARED FILE: do not edit in a part branch. Changes go in their own small pull request.
//
// Owns the renderer, the scene, the camera and the frame loop.
// Part 1 (src/world/) and Part 2 (src/game/) plug in through init / update / render.
//
// Add ?fly to the URL for a free camera (drag to look, scroll to zoom).
// In fly mode game.update() is not called, so Part 1 can work without Part 2.

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import * as world from './world/index.js';
import * as legacyGame from './game/index.js';
import * as speculum from './game/speculum.js';

const legacy = new URLSearchParams(location.search).has('legacy');
const game = legacy ? legacyGame : speculum;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.prepend(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.5, 2000);
const ui = document.getElementById('ui');
const ctx = { renderer, scene, camera, ui, legacy };

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const fly = new URLSearchParams(location.search).has('fly');

async function start() {
  await world.init(ctx);
  await game.init(ctx);

  let controls = null;
  if (fly) {
    camera.position.set(0, 80, 160);
    controls = new OrbitControls(camera, renderer.domElement);
    controls.maxPolarAngle = Math.PI / 2 - 0.02;
  }

  const clock = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 0.1); // seconds since last frame
    if (fly) controls.update();
    else game.update(dt);
    world.update(dt);
    world.render(ctx);
  });
}

start();
