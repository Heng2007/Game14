import * as THREE from 'three';
import { PALETTES } from './palette.js';

const material = (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.9 });
export function twistedBranch(color = '#5c7160') {
  const points = Array.from({ length: 12 }, (_, i) => new THREE.Vector3(Math.sin(i * 0.55) * i * 0.12, i * 0.5, Math.cos(i * 0.5) * i * 0.09));
  return new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 48, 0.19, 7, false), material(color));
}
export function fountain() {
  const group = new THREE.Group();
  const profile = [[0, 0], [3.8, 0], [3.8, 0.4], [1.4, 0.7], [0.7, 2], [2.4, 3], [2.5, 3.3], [0.8, 3.6], [0.6, 6], [1.3, 7], [0.3, 8], [0, 10]];
  group.add(new THREE.Mesh(new THREE.LatheGeometry(profile.map(([x, y]) => new THREE.Vector2(x, y)), 48), material(PALETTES.eden.fountain)));
  for (let i = 0; i < 6; i++) {
    const horn = twistedBranch(PALETTES.eden.fountain);
    horn.rotation.y = i * Math.PI / 3;
    horn.position.y = 4;
    group.add(horn);
  }
  const pool = new THREE.Mesh(new THREE.CylinderGeometry(3.3, 3.3, 0.12, 48), material('#9dbfc0'));
  pool.position.y = 0.46;
  group.add(pool);
  return group;
}
export function berry() {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.IcosahedronGeometry(2.3, 3), material(PALETTES.garden.berry));
  body.scale.y = 1.25;
  body.position.y = 2.5;
  group.add(body);
  for (let i = 0; i < 6; i++) {
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.5, 2.2, 4), material('#456948'));
    leaf.position.set(Math.sin(i) * 0.6, 5, Math.cos(i) * 0.6);
    leaf.rotation.z = Math.sin(i) * 0.8;
    group.add(leaf);
  }
  return group;
}
export function bubble(radius = 2) {
  return new THREE.Mesh(new THREE.SphereGeometry(radius, 32, 24), new THREE.MeshPhysicalMaterial({
    color: PALETTES.garden.bubble, roughness: 0.14, metalness: 0.15, transparent: true, opacity: 0.3, side: THREE.DoubleSide,
  }));
}
export function paintedBackdrop(layer = 0) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024; canvas.height = 512;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 0, 512);
  gradient.addColorStop(0, '#a3bcb7'); gradient.addColorStop(1, '#668774');
  ctx.fillStyle = gradient;
  ctx.beginPath(); ctx.moveTo(0, 512);
  for (let x = 0; x <= 1024; x += 4) ctx.lineTo(x, 230 + Math.sin(x * 0.012 + layer) * 65 + Math.sin(x * 0.027) * 24);
  ctx.lineTo(1024, 512); ctx.fill();
  for (let i = 0; i < 2600; i++) {
    const x = (i * 137.51) % 1024, y = 315 + (i * 41.3) % 197;
    ctx.fillStyle = i % 2 ? '#eee1bc18' : '#283f3e12';
    ctx.fillRect(x, y, 14, 2);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Mesh(new THREE.PlaneGeometry(130, 32), new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, side: THREE.DoubleSide }));
}
