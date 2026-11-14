// PART 1 owns this file. Keep the three exported function signatures.
// Starter version: flat green ground, flat blue water, one soft light.

import * as THREE from 'three';
import { MAP_SIZE, ISLAND_RADIUS, LAKE_RADIUS, RIVER_WIDTH } from '../shared/positions.js';
import { zoneHeight } from '../shared/positions.js';
import { PALETTES } from '../core/palette.js';

// Called once at startup. ctx = { renderer, scene, camera, ui }.
export function init({ scene, legacy }) {
  if (!legacy) {
    scene.background = new THREE.Color(PALETTES.eden.sky);
    scene.fog = new THREE.Fog(PALETTES.eden.sky, 38, 115);
    scene.add(new THREE.HemisphereLight('#fff3d3', '#465e50', 2.4));
    const sun = new THREE.DirectionalLight('#fff0ce', 2);
    sun.position.set(-20, 40, 15);
    scene.add(sun);
    const geometry = new THREE.PlaneGeometry(220, 220, 120, 120).rotateX(-Math.PI / 2);
    const vertices = geometry.attributes.position;
    for (let i = 0; i < vertices.count; i++) vertices.setY(i, zoneHeight(vertices.getX(i), vertices.getZ(i)));
    geometry.computeVertexNormals();
    scene.add(new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: PALETTES.eden.meadow, roughness: 1 })));
    return;
  }
  scene.background = new THREE.Color(0xcfe3ea);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x9bb07a, 2.5));

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(MAP_SIZE, MAP_SIZE, 40, 40).rotateX(-Math.PI / 2),
    new THREE.MeshLambertMaterial({ color: 0x7fae5a }),
  );
  scene.add(ground);

  const water = new THREE.MeshBasicMaterial({ color: 0x8fb7d9 });
  const lake = new THREE.Mesh(
    new THREE.RingGeometry(ISLAND_RADIUS, LAKE_RADIUS, 64).rotateX(-Math.PI / 2),
    water,
  );
  lake.position.y = 0.1;
  scene.add(lake);

  const length = MAP_SIZE / 2 - LAKE_RADIUS;
  const mid = LAKE_RADIUS + length / 2;
  for (const [x, z, turn] of [[0, mid, 0], [0, -mid, 0], [mid, 0, 1], [-mid, 0, 1]]) {
    const river = new THREE.Mesh(
      new THREE.PlaneGeometry(RIVER_WIDTH, length).rotateX(-Math.PI / 2),
      water,
    );
    river.position.set(x, 0.1, z);
    river.rotation.y = (turn * Math.PI) / 2;
    scene.add(river);
  }
}

// Called every frame. dt = seconds since the last frame.
export function update(dt) {}

// Called every frame, last. Draws the picture. The full-screen paint effect goes here.
export function render({ renderer, scene, camera }) {
  renderer.render(scene, camera);
}
