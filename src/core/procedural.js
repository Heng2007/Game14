import * as THREE from 'three';
import { PALETTES } from './palette.js';

const material = (color) => new THREE.MeshLambertMaterial({ color });
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
  return new THREE.Mesh(new THREE.SphereGeometry(radius, 24, 16), new THREE.MeshLambertMaterial({
    color: PALETTES.garden.bubble, transparent: true, opacity: 0.24, side: THREE.DoubleSide,
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

const paints = new Map();
export function paint(color) {
  if (!paints.has(color)) paints.set(color, new THREE.MeshLambertMaterial({ color }));
  return paints.get(color);
}
const orbGeometry = new THREE.SphereGeometry(1, 16, 12);
const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
export function orb(group, color, position, scale) {
  const mesh = new THREE.Mesh(orbGeometry, paint(color));
  mesh.position.set(...position); mesh.scale.set(...scale); group.add(mesh); return mesh;
}
export function box(group, color, position, scale) {
  const mesh = new THREE.Mesh(boxGeometry, paint(color));
  mesh.position.set(...position); mesh.scale.set(...scale); group.add(mesh); return mesh;
}
export function tube(group, points, radius, color) {
  const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
  const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, radius, 6, false), paint(color));
  group.add(mesh); return mesh;
}
export function stoneRings() {
  const group = new THREE.Group();
  group.userData.rings = [];
  for (let i = 0; i < 3; i++) {
    const pivot = new THREE.Group();
    const radius = 1.5 + i * 0.8;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.16, 6, 48), paint('#c5bda1'));
    ring.rotation.x = -Math.PI / 2; pivot.add(ring);
    for (let j = 0; j < 8; j++) {
      const a = j * Math.PI / 4;
      box(pivot, j === 0 ? '#ac655c' : '#737c68', [Math.sin(a) * radius, 0.1, Math.cos(a) * radius], [0.16, 0.1, 0.3]).rotation.y = a;
    }
    pivot.position.y = 0.3 + i * 0.1;
    let target = 0;
    pivot.rotate = () => { target += Math.PI / 4; };
    pivot.userData.update = dt => { pivot.rotation.y = THREE.MathUtils.damp(pivot.rotation.y, target, 7, dt); };
    group.add(pivot); group.userData.rings.push(pivot);
  }
  return group;
}
export function dragonTree() {
  const group = new THREE.Group();
  tube(group, [[0,0,0],[-1,3,0],[1,6,0],[0,9,0]], 0.7, '#686f4e');
  for (let i = 0; i < 7; i++) {
    const a = i * Math.PI * 2 / 7, x = Math.cos(a), z = Math.sin(a);
    tube(group, [[0,4,0],[x*2,7,z*2],[x*4,9+i%2,z*4]], 0.22, '#686f4e');
    orb(group, '#4e7451', [x*4,9+i%2,z*4], [2.3,0.9,1.7]);
    orb(group, '#a64e4c', [x*3.5,8.2,z*3.5], [0.25,0.4,0.25]);
  }
  return group;
}
export function organicSpire(color) {
  const group = new THREE.Group();
  const points = [[0,0],[2.2,0],[2.4,1],[1,2],[1.4,4],[0.7,6],[1.1,8],[0.35,10],[0,14]];
  group.add(new THREE.Mesh(new THREE.LatheGeometry(points.map(([x,y]) => new THREE.Vector2(x,y)), 24), paint(color)));
  for (let i = 0; i < 3; i++) {
    const branch = twistedBranch(color); branch.position.y = 6; branch.rotation.y = i * 2.1;
    group.add(branch);
  }
  return group;
}
export function owl() {
  const group = new THREE.Group();
  orb(group, '#a9a082', [0,2,0], [1.5,2.1,1.1]);
  orb(group, '#c6b994', [0,4,0], [1.7,1.3,1]);
  for (const side of [-1,1]) {
    orb(group, '#eee1bc', [side*0.7,4.15,0.85], [0.62,0.66,0.2]);
    orb(group, '#28322b', [side*0.7,4.15,1.04], [0.25,0.33,0.12]);
    orb(group, '#eee1bc', [side*0.62,4.25,1.15], [0.07,0.08,0.03]);
    tube(group, [[side*1.1,4.6,0],[side*1.5,5.7,0],[side*0.8,5.2,0]], 0.15, '#77735b');
  }
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.32,0.9,4), paint('#ae7c4d'));
  beak.position.set(0,3.65,1.15); beak.rotation.x = Math.PI; group.add(beak);
  return group;
}
export function peelableStrawberry() {
  const group = new THREE.Group(), segments = [];
  for (let i = 0; i < 8; i++) {
    const pivot = new THREE.Group();
    pivot.rotation.y = i * Math.PI / 4;
    const skin = new THREE.Mesh(new THREE.SphereGeometry(4,12,16,0,Math.PI/4,0.1,Math.PI-0.2), paint(i%2 ? '#b94950' : '#c25858'));
    skin.scale.y = 1.3; skin.position.y = 5.2;
    pivot.add(skin); group.add(pivot);
    let peeled = false;
    pivot.userData.peel = () => { peeled = true; };
    pivot.userData.update = dt => {
      skin.rotation.z = THREE.MathUtils.damp(skin.rotation.z, peeled ? -1.15 : 0, 3, dt);
      skin.position.y = THREE.MathUtils.damp(skin.position.y, peeled ? 1.5 : 5.2, 3, dt);
    };
    segments.push(pivot);
  }
  orb(group, '#e8c7a0', [0,5.2,0], [3.6,4.7,3.6]);
  for (let i = 0; i < 7; i++) {
    const a = i * Math.PI * 2 / 7;
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.8,4,4), paint('#567854'));
    leaf.position.set(Math.sin(a)*1.3,10,Math.cos(a)*1.3); leaf.rotation.z = Math.sin(a)*0.8;
    group.add(leaf);
  }
  let next = 0;
  group.peel = () => { if (next >= segments.length) return false; segments[next++].userData.peel(); return true; };
  group.userData.update = dt => segments.forEach(s => s.userData.update(dt));
  return group;
}
export function instruments() {
  const lute = new THREE.Group(), harp = new THREE.Group();
  orb(lute, '#9f784e', [0,4,0], [3,4,0.9]);
  orb(lute, '#d0ab6b', [0,4,0.75], [2.7,3.7,0.2]);
  orb(lute, '#342d29', [0,5,0.96], [0.65,0.65,0.03]);
  box(lute, '#806442', [0,10,0], [0.75,9,0.6]);
  box(lute, '#b99964', [0,14.4,0], [1.5,1.5,0.7]);
  box(lute, '#4e3c30', [0,2,1], [2.3,0.25,0.15]);
  for (let i = 0; i < 6; i++) tube(lute, [[(i-2.5)*0.11,2,1.1],[(i-2.5)*0.08,8,0.45],[(i-2.5)*0.08,14.8,0.45]],0.018,'#e8d8a8');
  tube(harp, [[-3,0,0],[-4,7,0],[-2,12,0],[3,10,0],[4,0,0],[-3,0,0]],0.35,'#b18c57');
  for (let i = 0; i < 11; i++) {
    const x = -2.5 + i*0.55;
    tube(harp, [[x,0.6,0],[x,9.8+(2-x)*0.19,0]],0.022,'#d9cda4');
  }
  return { lute, harp };
}
export function scorePlaque() {
  const canvas = document.createElement('canvas'); canvas.width = 768; canvas.height = 384;
  const c = canvas.getContext('2d');
  c.fillStyle = '#c5b28a'; c.fillRect(0,0,768,384);
  c.strokeStyle = '#493c30'; c.lineWidth = 3;
  c.strokeRect(12,12,744,360);
  c.fillStyle = '#493c30'; c.font = '32px Georgia'; c.textAlign = 'center';
  c.fillText('CANTUS · MUNDI',384,66);
  for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(65,125+i*33); c.lineTo(700,125+i*33); c.stroke(); }
  for (let i = 0; i < 4; i++) {
    const x = 200+i*130, y = [191,158,175,125][i];
    c.save(); c.translate(x,y); c.rotate(Math.PI/4); c.fillRect(-10,-10,20,20); c.restore();
    c.fillRect(x+11,y-63,3,66);
  }
  c.font = '23px Georgia'; c.fillText('D    ·    F    ·    E    ·    A',390,300);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  const group = new THREE.Group();
  const plaque = new THREE.Mesh(new THREE.PlaneGeometry(4.5,2.25), new THREE.MeshLambertMaterial({ map:texture, emissive:'#8a7451', emissiveMap:texture, side:THREE.DoubleSide }));
  plaque.position.y = 2; group.add(plaque);
  box(group,'#51483c',[0,0.8,-0.1],[0.25,1.7,0.25]);
  return group;
}
export function treeMan() {
  const group = new THREE.Group();
  const shell = new THREE.Mesh(new THREE.SphereGeometry(4.5,32,24,0.55,Math.PI*2-1.1,0.3,2.5), new THREE.MeshLambertMaterial({color:'#c8c1aa',side:THREE.DoubleSide}));
  shell.position.y = 8; shell.scale.set(1,1.2,1); shell.rotation.y = Math.PI/2; group.add(shell);
  for (const side of [-1,1]) {
    tube(group, [[side*2,0,0],[side*2.8,3,0],[side*2,6,0]],0.6,'#857e67');
    tube(group, [[side*3,9,0],[side*6,11,0],[side*7,14,1]],0.25,'#857e67');
    tube(group, [[side*6,11,0],[side*5,14,-1],[side*6,16,-2]],0.12,'#857e67');
  }
  orb(group,'#c8c1aa',[0,14,0],[2.3,1.2,2.2]);
  orb(group,'#535346',[0,14.1,1.9],[1,0.25,0.1]);
  const table = new THREE.Mesh(new THREE.CylinderGeometry(1.8,1.8,0.2,16),paint('#66503b'));
  table.position.set(0,7,0); group.add(table);
  box(group,'#66503b',[0,6,0],[0.3,2,0.3]);
  for (let i = 0; i < 3; i++) {
    const a = i * 2.1;
    orb(group,'#a28765',[Math.sin(a)*1.1,7.3,Math.cos(a)*1.1],[0.2,0.3,0.2]);
  }
  const candle = new THREE.PointLight('#ed9d51',32,14,2); candle.position.set(0,8,0); group.add(candle);
  orb(group,'#f4bc65',[0,7.6,0],[0.1,0.35,0.1]);
  return group;
}
export function birdThrone() {
  const group = new THREE.Group();
  box(group,'#434849',[0,1,0],[7,2,6]);
  box(group,'#4b5554',[0,5,-2],[6,8,0.8]);
  for (const side of [-1,1]) box(group,'#777965',[side*2.7,3,0],[0.7,4,4]);
  orb(group,'#526b76',[0,5.5,0],[1.8,2.8,1.4]);
  orb(group,'#8097a0',[0,8.5,0.5],[1.4,1.2,1.3]);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.6,3,4),paint('#c6a36a'));
  beak.rotation.x = Math.PI/2; beak.position.set(0,8.3,2.5); group.add(beak);
  for (const side of [-1,1]) orb(group,'#171d22',[side*0.7,8.8,1.5],[0.18,0.2,0.13]);
  box(group,'#af9470',[0,10.1,0.5],[3,0.3,2]);
  return group;
}
