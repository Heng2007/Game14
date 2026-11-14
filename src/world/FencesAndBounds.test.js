import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { BoxGeometry, MeshBasicMaterial, Scene } from 'three';
import { FenceChunks } from './FenceChunks.js';
import { FencesAndBounds } from './FencesAndBounds.js';

test('static fences merge per act and x chunk with default frustum culling', () => {
  const scene = new Scene(), chunks = new FenceChunks(scene);
  chunks.add(new BoxGeometry(), 'eden', 0);
  chunks.add(new BoxGeometry().translate(2, 0, 0), 'eden', 2);
  chunks.add(new BoxGeometry().translate(17, 0, 0), 'eden', 17);
  chunks.add(new BoxGeometry(), 'garden', 0);
  chunks.build(new MeshBasicMaterial());
  assert.equal(chunks.meshes.length, 3);
  assert.equal(chunks.meshes[0].geometry.index.count / 3, 24);
  assert.equal(chunks.pending.size, 0);
  for (const mesh of chunks.meshes) assert.equal(mesh.frustumCulled, true);
  chunks.update({ x: 62.5, z: 0 });
  assert.equal(chunks.meshes[0].visible, true);
  chunks.update({ x: 62.51, z: 0 });
  assert.equal(chunks.meshes[0].visible, false);
  chunks.update({ x: 0, z: 61 });
  assert.ok(chunks.meshes.every(mesh => !mesh.visible));
  chunks.update({ x: 0, z: 0 });
  assert.ok(chunks.meshes.every(mesh => mesh.visible));
  chunks.update({ x: NaN, z: 0 });
  assert.ok(chunks.meshes.every(mesh => mesh.visible));
});

test('fine wattle and bramble detail is culled independently of the structural fence', () => {
  const chunks = new FenceChunks(new Scene());
  chunks.add(new BoxGeometry(), 'eden', 0, true);
  chunks.add(new BoxGeometry(), 'eden', 0);
  chunks.build(new MeshBasicMaterial()); chunks.update({ x: 30, z: 0 });
  assert.deepEqual(chunks.meshes.map(mesh => mesh.visible), [false, true]);
  const empty = new FenceChunks(new Scene());
  empty.build(new MeshBasicMaterial()); empty.update({ x: 0, z: 0 });
  assert.deepEqual(empty.meshes, []);
});

test('distance culling preserves every original collision box and projection', () => {
  const previous = globalThis.document;
  globalThis.document = { createElement: () => ({ getContext: () => ({ fillRect() {} }) }) };
  try {
    const scene = new Scene(), fences = new FencesAndBounds(scene);
    const hash = () => createHash('sha256').update(JSON.stringify(fences.boxes.map(box =>
      Object.fromEntries(Object.entries(box).map(([key, value]) => [key, Number(value.toFixed(8))]))))).digest('hex');
    assert.equal(fences.boxes.length, 1198);
    assert.equal(hash(), '26411eb1e96630cf1bf0a0ec25754c9c3f06e2b6f482ff06ed134895ece140a8');
    const projected = fences.project({ x: -84, z: 45 });
    const contains = fences.contains(-84, 18, 0.45);
    fences.update(0.1, { x: 1000, z: 1000 });
    assert.ok(fences.chunks.meshes.every(mesh => !mesh.visible));
    assert.equal(fences.orbMesh.count, 0); assert.equal(fences.glows.count, 0);
    assert.equal(fences.glows.visible, false);
    assert.equal(fences.contains(-84, 18, 0.45), contains);
    assert.deepEqual(fences.project({ x: -84, z: 45 }), projected);
    fences.update(0.1, { x: -84, z: 18 });
    assert.ok(fences.orbMesh.count > 0);
    assert.equal(fences.orbMesh.count, fences.glows.count);
    assert.equal(fences.glows.instanceMatrix, fences.orbMesh.instanceMatrix);
    assert.equal(scene.children.filter(mesh => mesh.material === fences.glowMaterial).length, 1);
    assert.equal(fences.glows.frustumCulled, true);
    fences.update(0.1); fences.update(0.1, { x: Infinity, z: 0 });
    assert.equal(hash(), '26411eb1e96630cf1bf0a0ec25754c9c3f06e2b6f482ff06ed134895ece140a8');
  } finally { globalThis.document = previous; }
});
