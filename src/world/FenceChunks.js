import { Mesh } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export class FenceChunks {
  constructor(scene, { size = 16, distance = 60, detailDistance = 24 } = {}) {
    Object.assign(this, { scene, size, distance, detailDistance });
    this.pending = new Map(); this.meshes = [];
  }
  add(geometry, act, x, detail = false) {
    const key = `${act}:${Math.floor(x / this.size)}:${detail ? 'detail' : 'structure'}`;
    if (!this.pending.has(key)) this.pending.set(key, { geometries: [], detail });
    this.pending.get(key).geometries.push(geometry);
  }
  build(material) {
    for (const [key, { geometries, detail }] of this.pending) {
      const geometry = mergeGeometries(geometries);
      geometry.computeBoundingBox(); geometry.computeBoundingSphere();
      const mesh = new Mesh(geometry, material);
      mesh.name = `fence:${key}`;
      mesh.userData.fenceDistance = detail ? this.detailDistance : this.distance;
      this.scene.add(mesh); this.meshes.push(mesh);
      geometries.forEach(part => part.dispose());
    }
    this.pending.clear();
  }
  update(position) {
    if (!Number.isFinite(position?.x) || !Number.isFinite(position?.z)) return;
    for (const mesh of this.meshes) {
      const { min, max } = mesh.geometry.boundingBox;
      const dx = Math.max(min.x - position.x, 0, position.x - max.x);
      const dz = Math.max(min.z - position.z, 0, position.z - max.z);
      mesh.visible = dx * dx + dz * dz <= mesh.userData.fenceDistance ** 2;
    }
  }
}
