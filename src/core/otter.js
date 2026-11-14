// The otter companion: a small otter holding a laptop that scampers along just
// ahead of the player and sits down to type whenever the player stops.
import * as THREE from 'three';
import { orb, box, tube, paint } from './procedural.js';

const FUR = '#b9793f', CREAM = '#ead9c2', DARK = '#141820';
// Where the otter likes to be, in metres ahead of and to the right of the player.
export const FOLLOW = { ahead: 6, side: 1.8 };

// Builds the model facing +Z with its base at y = 0, about 1 m tall.
export function otterModel() {
  const group = new THREE.Group(), body = new THREE.Group();
  group.add(body);
  orb(body, FUR, [0, 1.1, 0], [0.95, 1.15, 0.85]);
  orb(body, CREAM, [0, 1.0, 0.35], [0.68, 0.9, 0.6]);
  orb(body, FUR, [0, 2.35, 0.05], [0.95, 0.85, 0.85]);
  orb(body, CREAM, [0, 2.12, 0.55], [0.62, 0.42, 0.42]);
  orb(body, '#a58a84', [0, 2.25, 0.93], [0.16, 0.11, 0.1]);
  const paws = [];
  for (const side of [-1, 1]) {
    orb(body, DARK, [side * 0.42, 2.5, 0.68], [0.2, 0.22, 0.14]);
    orb(body, '#f4f1e6', [side * 0.36, 2.58, 0.8], [0.06, 0.06, 0.03]);
    orb(body, FUR, [side * 0.72, 2.95, 0], [0.2, 0.2, 0.12]);
    paws.push(orb(body, FUR, [side * 0.5, 1.12, 0.72], [0.2, 0.17, 0.4]));
    orb(body, FUR, [side * 0.5, 0.22, 0.75], [0.3, 0.22, 0.42]);
    orb(body, '#8a7a78', [side * 0.5, 0.22, 1.12], [0.16, 0.14, 0.05]);
    for (const lift of [0, 0.14]) {
      tube(body, [[side * 0.5, 2.08 + lift, 0.78], [side * 0.9, 2.1 + lift * 1.6, 0.74], [side * 1.25, 2.2 + lift * 2.4, 0.6]], 0.015, '#f1ead8');
    }
  }
  tube(body, [[0, 0.35, -0.6], [0.45, 0.22, -1.2], [1.0, 0.25, -1.45]], 0.2, FUR);
  // Laptop on its lap, screen facing the otter.
  box(body, '#aeb4bd', [0, 0.9, 1.0], [0.95, 0.06, 0.6]);
  const lid = new THREE.Group(); lid.position.set(0, 0.92, 1.3); lid.rotation.x = 0.3; body.add(lid);
  box(lid, '#8f96a0', [0, 0.36, 0], [0.95, 0.72, 0.05]);
  const screen = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.6, 0.02), new THREE.MeshBasicMaterial({ color: '#9fd6e8' }));
  screen.position.set(0, 0.36, -0.035); lid.add(screen);
  // The screen lights the otter's face, so it can still be found in the dark of Hell.
  const badge = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), screen.material);
  badge.position.set(0, 0.4, 0.03); badge.scale.z = 0.2; lid.add(badge);
  const glow = new THREE.PointLight('#bfe6f2', 1.2, 5, 2); glow.position.set(0, 2.6, 3.2); body.add(glow);
  group.scale.setScalar(0.33);
  group.userData = { body, paws, screen };
  return group;
}

const turn = (from, to, amount) => {
  const diff = Math.atan2(Math.sin(to - from), Math.cos(to - from));
  return from + diff * Math.min(1, amount);
};

// One step of the follow behaviour. `pet` is { x, z, heading, moving }.
// `view` is the player: { x, z, fx, fz } with (fx, fz) the flat look direction.
// Pure numbers, so it can be tested without a renderer.
export function followStep(pet, view, dt, { obstacles = [], bounds } = {}) {
  const tx = view.x + view.fx * FOLLOW.ahead - view.fz * FOLLOW.side, tz = view.z + view.fz * FOLLOW.ahead + view.fx * FOLLOW.side;
  let dx = tx - pet.x, dz = tz - pet.z, distance = Math.hypot(dx, dz);
  if (distance > 30) { pet.x = tx; pet.z = tz; distance = 0; }       // the player jumped far away
  if (distance > (pet.moving ? 0.25 : 0.9)) {
    const step = Math.min(distance, Math.min(6.5, 1.5 + distance * 2) * dt);
    pet.x += dx / distance * step; pet.z += dz / distance * step;
    pet.heading = turn(pet.heading, Math.atan2(dx, dz), dt * 10);
    pet.moving = true;
  } else {
    pet.heading = turn(pet.heading, Math.atan2(view.x - pet.x, view.z - pet.z), dt * 4); // look at the player
    pet.moving = false;
  }
  for (const o of obstacles) {
    const ox = pet.x - o.x, oz = pet.z - o.z, d = Math.hypot(ox, oz), r = o.radius + 0.4;
    if (d < r) { pet.x = o.x + (d ? ox / d : 1) * r; pet.z = o.z + (d ? oz / d : 0) * r; }
  }
  if (bounds) {
    pet.x = Math.max(bounds.minX + 0.5, Math.min(bounds.maxX - 0.5, pet.x));
    pet.z = Math.max(bounds.minZ + 0.5, Math.min(bounds.maxZ - 0.5, pet.z));
  }
  return pet;
}

export class OtterCompanion {
  constructor(scene, { getHeight, obstacles = [], bounds }) {
    Object.assign(this, { getHeight, obstacles, bounds });
    this.object = otterModel(); scene.add(this.object);
    this.pet = { x: 0, z: 0, heading: 0, moving: false }; this.time = 0;
    this.forward = new THREE.Vector3();
  }
  reset(x, z, heading = -Math.PI / 2) {
    Object.assign(this.pet, { x, z, heading, moving: false }); this.place(0);
  }
  place(hop) {
    const { pet, object } = this;
    object.position.set(pet.x, this.getHeight(pet.x, pet.z) + hop, pet.z);
    object.rotation.y = pet.heading;
  }
  // Pass the camera to follow it, or nothing to stay put (menu, finale).
  update(dt, camera) {
    this.time += dt;
    const { pet } = this, { body, paws, screen } = this.object.userData;
    if (camera) {
      camera.getWorldDirection(this.forward); this.forward.y = 0;
      if (this.forward.lengthSq() > 1e-6) {
        this.forward.normalize();
        followStep(pet, { x: camera.position.x, z: camera.position.z, fx: this.forward.x, fz: this.forward.z }, dt, this);
      }
    } else pet.moving = false;
    const hop = pet.moving ? Math.abs(Math.sin(this.time * 11)) * 0.16 : 0;
    this.place(hop);
    body.rotation.x = pet.moving ? 0.22 : 0;                               // lean into the run
    paws.forEach((paw, i) => { paw.position.y = 1.12 + (pet.moving ? 0 : Math.max(0, Math.sin(this.time * 14 + i * Math.PI)) * 0.09); });
    screen.material.color.setHSL(0.53, 0.55, 0.74 + Math.sin(this.time * 9) * 0.04);
  }
}
