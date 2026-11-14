import * as THREE from 'three';

const MAX_WORDS = 36;
const MAX_MESHES = 180;
export class DiegeticText {
  constructor(scene, camera, narrator, subtitle, { pixelRatio = window.devicePixelRatio || 1 } = {}) {
    Object.assign(this, { scene, camera, narrator, subtitle, pixelRatio });
    this.words = []; this.elapsed = 0; this.activeId = null;
    this.handlers = {
      'line-start': event => this.start(event.detail),
      word: event => this.reveal(event.detail),
      'line-end': event => this.end(event.detail),
    };
    for (const [name, handler] of Object.entries(this.handlers)) narrator.addEventListener(name, handler);
  }
  start(line) {
    this.activeId = line.id;
    this.subtitleUntil = undefined;
    this.subtitle.replaceChildren();
    this.subtitle.classList.add('sm-narrating');
    this.subtitle.setAttribute('aria-label', line.text);
    this.subtitleWords = line.words.map((word, index) => {
      const span = document.createElement('span'); span.textContent = word.text;
      if (index) this.subtitle.append(' ');
      this.subtitle.append(span); return span;
    });
    const forward = new THREE.Vector3(); this.camera.getWorldDirection(forward);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(this.camera.quaternion);
    const center = this.camera.position.clone().addScaledVector(forward, 6);
    const rows = [[]]; let width = 0;
    for (const word of line.words.slice(0, MAX_WORDS)) {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      context.font = '64px Georgia, serif';
      const logicalWidth = Math.ceil(context.measureText(word.text).width + 30), logicalHeight = 110;
      const ratio = Math.max(2, Math.min(this.pixelRatio * 2, 4));
      canvas.width = Math.ceil(logicalWidth * ratio); canvas.height = Math.ceil(logicalHeight * ratio);
      context.scale(ratio, ratio); context.font = '64px Georgia, serif';
      context.textBaseline = 'middle'; context.textAlign = 'center';
      context.fillStyle = '#fff1d1'; context.shadowColor = '#3b2a1e'; context.shadowBlur = 5;
      context.shadowOffsetY = 2; context.fillText(word.text, logicalWidth / 2, logicalHeight / 2);
      const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
      const height = 0.57, wordWidth = height * logicalWidth / logicalHeight;
      const geometry = new THREE.PlaneGeometry(wordWidth, height);
      const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, opacity: 0, side: THREE.DoubleSide });
      const mesh = new THREE.Mesh(geometry, material), node = new THREE.Group();
      node.add(mesh); node.quaternion.copy(this.camera.quaternion); this.scene.add(node);
      const item = { id: line.id, index: this.words.filter(w => w.id === line.id).length,
        zone: line.zone, node, mesh, geometry, material, texture, width: wordWidth, height,
        revealed: null, disturbed: null, ending: null, shards: [], velocity: new THREE.Vector3(),
        forward: forward.clone(), eyeY: this.camera.position.y };
      if (width + wordWidth > 5.8 && rows.at(-1).length) { rows.push([]); width = 0; }
      rows.at(-1).push(item); width += wordWidth + 0.07;
      this.words.push(item);
    }
    rows.forEach((row, rowIndex) => {
      let x = -row.reduce((sum, word) => sum + word.width + 0.07, -0.07) / 2;
      row.forEach(word => {
        const offset = x + word.width / 2;
        word.node.position.copy(center).addScaledVector(right, offset)
          .addScaledVector(up, (rows.length - 1) * 0.33 - rowIndex * 0.66 + 0.2)
          .addScaledVector(forward, offset * offset * 0.045);
        word.origin = word.node.position.clone(); x += word.width + 0.07;
      });
    });
    this.enforceCap();
  }
  reveal({ id, index }) {
    for (const word of this.words) if (word.id === id && word.index === index) word.revealed = this.elapsed;
    if (id === this.activeId) this.subtitleWords.forEach((span, i) => {
      span.classList.toggle('sm-spoken', i < index); span.classList.toggle('sm-speaking', i === index);
    });
  }
  end({ id, reason }) {
    for (const word of this.words) if (word.id === id) word.ending = this.elapsed + (reason === 'complete' ? 2 : 0);
    if (id === this.activeId) {
      this.subtitleWords?.forEach(span => span.classList.remove('sm-speaking'));
      this.subtitleUntil = this.elapsed + (reason === 'complete' ? 3 : 0.3);
    }
  }
  fracture(word) {
    word.mesh.visible = false;
    const columns = 4, w = word.width, h = word.height;
    for (let i = 0; i < columns; i++) for (let half = 0; half < 2; half++) {
      const u = i / columns, v = (i + 1) / columns;
      const uv = half ? [u,0,v,1,u,1] : [u,0,v,0,v,1];
      const vertices = [];
      for (let j = 0; j < uv.length; j += 2) vertices.push((uv[j] - 0.5) * w, (uv[j+1] - 0.5) * h, 0);
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
      geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      const mesh = new THREE.Mesh(geometry, word.material.clone());
      word.node.add(mesh);
      word.shards.push({ mesh, velocity: new THREE.Vector3((i-1.5)*0.28, 0.2 + half*0.3, -3.5), spin: (i%2 ? 1 : -1)*(1+half) });
    }
    this.enforceCap();
  }
  get meshCount() { return this.words.reduce((n, word) => n + 1 + word.shards.length, 0); }
  enforceCap() { while (this.meshCount > MAX_MESHES) this.remove(this.words[0]); }
  remove(word) {
    word.node.removeFromParent(); word.geometry.dispose(); word.material.dispose(); word.texture.dispose();
    word.shards.forEach(shard => { shard.mesh.geometry.dispose(); shard.mesh.material.dispose(); });
    this.words.splice(this.words.indexOf(word), 1);
  }
  update(dt) {
    this.elapsed += dt;
    for (const word of [...this.words]) {
      if (!this.words.includes(word)) continue;
      if (word.revealed === null) {
        if (word.ending !== null && this.elapsed > word.ending) this.remove(word);
        continue;
      }
      const age = this.elapsed - word.revealed;
      const distance = word.node.position.distanceTo(this.camera.position);
      const threshold = word.zone === 'ACT_II_GARDEN' ? 3 : 1.2;
      const passed = this.camera.position.clone().sub(word.origin).dot(word.forward) > 0;
      if (word.disturbed === null && (distance < threshold || passed)) {
        word.disturbed = this.elapsed;
        word.velocity.copy(word.node.position).sub(this.camera.position).normalize().multiplyScalar(1.9);
        if (word.zone === 'ACT_III_HELL') this.fracture(word);
        if (!this.words.includes(word)) continue;
      }
      let opacity = Math.min(1, age / 0.4);
      if (word.ending !== null) opacity *= 1 - Math.max(0, (this.elapsed - word.ending) / 0.6);
      if (word.disturbed !== null) {
        const decay = this.elapsed - word.disturbed;
        opacity *= 1 - decay / 1.6;
        if (word.zone === 'ACT_III_HELL') {
          const gravity = new THREE.Vector3(0, -3.8, 0).applyQuaternion(word.node.quaternion.clone().invert());
          word.shards.forEach(shard => {
            shard.velocity.addScaledVector(gravity, dt); shard.mesh.position.addScaledVector(shard.velocity, dt);
            shard.mesh.rotation.z += shard.spin * dt; shard.mesh.rotation.x += shard.spin * dt * 0.6;
            shard.mesh.material.opacity = Math.max(0, opacity);
          });
        } else if (word.zone === 'ACT_II_GARDEN') {
          word.node.position.addScaledVector(word.velocity, dt); word.node.position.y += dt * 0.35;
        } else {
          word.node.position.y += dt * 0.75; word.node.position.x += Math.sin(age*8+word.index)*dt*0.14;
          word.node.scale.setScalar(1 + decay * 0.3);
        }
      } else {
        word.node.position.y = word.origin.y + this.camera.position.y - word.eyeY
          + (word.zone === 'ACT_I_EDEN' ? age * 0.045 : Math.sin(age*2.3+word.index)*0.08);
      }
      word.material.opacity = Math.max(0, opacity);
      if (opacity <= 0 && age > 0.4) this.remove(word);
    }
    if (this.subtitleUntil !== undefined && this.elapsed > this.subtitleUntil) {
      this.subtitle.classList.remove('sm-narrating'); this.subtitle.replaceChildren();
      this.subtitle.removeAttribute('aria-label'); this.subtitleUntil = undefined;
    }
  }
  dispose() {
    for (const [name, handler] of Object.entries(this.handlers)) this.narrator.removeEventListener(name, handler);
    for (const word of [...this.words]) this.remove(word);
  }
}
