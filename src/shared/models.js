// SHARED FILE: do not edit in a part branch. Changes go in their own small pull request.
//
// loadModel(name) returns a Promise of a THREE.Object3D for public/models/<name>.glb.
// If the file does not exist yet, it returns a plain box of about the right
// size, so the game runs before Part 3 has delivered that model.
// Every model (real or stand-in) is passed through Part 1's applyPaintedLook.

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { applyPaintedLook } from '../world/look.js';
import { BRIDGE_LENGTH, BRIDGE_WIDTH } from './positions.js';

// name: [[width (x), height (y), depth (z)] in metres, colour]
// These sizes are also the target sizes for the real models in Part 3.
export const STAND_INS = {
  fountain: [[8, 20, 8], 0xf2a6b8],
  tower_pink: [[8, 15, 8], 0xf2a6b8],
  tower_blue: [[8, 15, 8], 0x8fb7d9],
  strawberry: [[1, 1, 1], 0xd8342c],
  cherry: [[1, 1, 1], 0xa3172a],
  blackberry: [[1, 1, 1], 0x2c2540],
  mount: [[1, 1.5, 2], 0xc9a27a],
  player: [[0.6, 1.7, 0.4], 0xf1d7c4],
  bridge: [[BRIDGE_WIDTH, 0.5, BRIDGE_LENGTH], 0xe8d9b5],
  tree: [[3, 8, 3], 0x4f8a4b],
  bird: [[2, 3, 2], 0x6f8fb0],
  glass_sphere: [[3, 3, 3], 0xcfe8ef],
  shell: [[2, 1.5, 2], 0xf3e3d3],
};

const loader = new GLTFLoader();
const cache = new Map(); // name -> Promise<Object3D>

function standIn(name) {
  const [[w, h, d], color] = STAND_INS[name] ?? [[1, 1, 1], 0x888888];
  const geometry = new THREE.BoxGeometry(w, h, d);
  geometry.translate(0, h / 2, 0); // base sits on y = 0
  return new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({ color }));
}

function loadOriginal(name) {
  if (!cache.has(name)) {
    const url = `${import.meta.env.BASE_URL}models/${name}.glb`;
    cache.set(
      name,
      loader.loadAsync(url).then(
        (gltf) => gltf.scene,
        () => standIn(name), // file missing or unreadable
      ),
    );
  }
  return cache.get(name);
}

export async function loadModel(name) {
  const object = (await loadOriginal(name)).clone();
  object.name = name;
  applyPaintedLook(object);
  return object;
}
