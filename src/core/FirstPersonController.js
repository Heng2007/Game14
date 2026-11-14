import { Vector3 } from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { pushFromBoxes } from './Corridor.js';

export class FirstPersonController extends EventTarget {
  constructor(camera, element, { getHeight, bounds, obstacles = [], eyeHeight = 1.7, blocked = () => false, corridor }) {
    super();
    Object.assign(this, { camera, getHeight, bounds, obstacles, eyeHeight, blocked, corridor });
    this.controls = new PointerLockControls(camera, element);
    this.keys = new Set();
    this.velocity = new Vector3();
    this.enabled = true;
    document.addEventListener('keydown', (event) => {
      if (event.code === 'KeyM' && !event.repeat) { this.dispatchEvent(new Event('mute')); return; }
      if (!this.enabled) return;
      if (!this.controls.isLocked) return;
      this.keys.add(event.code);
      if (event.repeat) return;
      const action = { KeyE: 'primary', KeyQ: 'secondary' }[event.code];
      if (action) this.dispatchEvent(new Event(action));
    });
    document.addEventListener('keyup', (event) => this.keys.delete(event.code));
    this.controls.addEventListener('unlock', () => { this.keys.clear(); this.velocity.set(0, 0, 0); });
    window.addEventListener('blur', () => { this.keys.clear(); this.velocity.set(0, 0, 0); });
    element.addEventListener('click', () => {
      if (this.enabled && this.controls.isLocked) this.dispatchEvent(new Event('primary'));
    });
  }
  lock() {
    const request = this.controls.lock();
    request?.catch?.(() => {});
  }
  constrain(position) {
    const margin = 0.45;
    const b = this.bounds;
    for (let pass = 0; pass < 3; pass++) {
      if (b.radius !== undefined) {
        const distance = Math.hypot(position.x - (b.x ?? 0), position.z - (b.z ?? 0));
        if (distance > b.radius - margin) {
          const scale = (b.radius - margin) / distance;
          position.x = (b.x ?? 0) + (position.x - (b.x ?? 0)) * scale;
          position.z = (b.z ?? 0) + (position.z - (b.z ?? 0)) * scale;
        }
      } else {
        position.x = Math.max(b.minX + margin, Math.min(b.maxX - margin, position.x));
        position.z = Math.max(b.minZ + margin, Math.min(b.maxZ - margin, position.z));
      }
      for (const obstacle of this.obstacles) {
        const dx = position.x - obstacle.x, dz = position.z - obstacle.z;
        const distance = Math.hypot(dx, dz), radius = obstacle.radius + margin;
        if (distance < radius) {
          position.x = obstacle.x + (distance ? dx / distance : 1) * radius;
          position.z = obstacle.z + (distance ? dz / distance : 0) * radius;
        }
      }
      this.corridor?.project(position, margin);
      pushFromBoxes(position, this.corridor?.boxes, margin);
    }
    position.y = this.getHeight(position.x, position.z) + this.eyeHeight;
  }
  update(dt) {
    if (this.enabled === false || !this.controls.isLocked) return;
    dt = Math.min(dt, 0.25);
    const steps = Math.max(1, Math.ceil(dt / 0.025));
    for (let step = 0; step < steps; step++) this.moveStep(dt / steps);
  }
  moveStep(dt) {
    const direction = new Vector3(Number(this.keys.has('KeyD')) - Number(this.keys.has('KeyA')), 0,
      Number(this.keys.has('KeyW')) - Number(this.keys.has('KeyS'))).normalize().multiplyScalar(4);
    this.velocity.lerp(direction, 1 - Math.exp(-9 * dt));
    const previous = this.camera.position.clone();
    this.controls.moveRight(this.velocity.x * dt);
    this.controls.moveForward(this.velocity.z * dt);
    this.constrain(this.camera.position);
    const invalid = position => this.blocked?.(position.x, position.z) ||
      (this.corridor && !this.corridor.contains(position.x, position.z, 0.45));
    if (invalid(this.camera.position)) {
      const next = this.camera.position.clone();
      this.camera.position.set(next.x, next.y, previous.z);
      this.constrain(this.camera.position);
      if (invalid(this.camera.position)) {
        this.camera.position.set(previous.x, next.y, next.z);
        this.constrain(this.camera.position);
        if (invalid(this.camera.position)) this.camera.position.copy(previous);
      }
      this.camera.position.y = this.getHeight(this.camera.position.x, this.camera.position.z) + this.eyeHeight;
    }
  }
}
