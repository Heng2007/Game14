// PART 1 owns this file.
// Keep this function signature exactly as it is.

import * as THREE from 'three';

const OUTLINE_COLOR = 0x3a2a20; // dark umber, like the painting's line work
const OUTLINE_SCALE = 1.06;
const MIN_OUTLINE_VERTS = 12; // flat cards and triangles cannot carry a hull

// One shared material for every outline: it is never mutated, so clones and
// repeated calls stay safe (loadModel clones share geometry/material caches).
const outlineMaterial = new THREE.MeshBasicMaterial({
  color: OUTLINE_COLOR,
  side: THREE.BackSide,
});

// Softened pastel version of a source colour: half the saturation, lightness
// lifted toward cream. Hue is preserved so multi-part models keep their
// pink/blue/red variation.
function paintedColor(source) {
  const hsl = {};
  source.getHSL(hsl);
  return new THREE.Color().setHSL(
    hsl.h,
    hsl.s * 0.5,
    Math.min(0.92, hsl.l * 0.72 + 0.2),
  );
}

// A brand-new Lambert material per mesh — the original (possibly shared with
// other clones) is never touched.
function paintedMaterial(original) {
  const mat = new THREE.MeshLambertMaterial({
    color: paintedColor(original.color ?? new THREE.Color(0xffffff)),
  });
  if (original.transparent) {
    mat.transparent = true;
    mat.opacity = original.opacity;
    mat.depthWrite = original.depthWrite;
  }
  if (original.side !== undefined) mat.side = original.side;
  if (original.vertexColors) mat.vertexColors = true;
  return mat;
}

// Inverted hull: a slightly larger BackSide copy of the same geometry.
// The hull is scaled about the bounds centre so it grows evenly.
function addOutline(mesh) {
  const geo = mesh.geometry;
  const pos = geo.getAttribute('position');
  if (!pos || pos.count < MIN_OUTLINE_VERTS) return;
  if (!geo.boundingBox) geo.computeBoundingBox();
  const bb = geo.boundingBox;
  if (bb.isEmpty()) return;
  const size = bb.getSize(new THREE.Vector3());
  if (Math.max(size.x, size.y, size.z) < 0.03) return;

  const hull = new THREE.Mesh(geo, outlineMaterial);
  hull.scale.setScalar(OUTLINE_SCALE);
  hull.position.copy(bb.getCenter(new THREE.Vector3())).multiplyScalar(1 - OUTLINE_SCALE);
  hull.userData.paintDone = true;
  hull.userData.paintOutline = true;
  mesh.add(hull);
}

// Called by shared/models.js on every model and stand-in after it loads.
// Change the object's materials here so it matches the painted style.
export function applyPaintedLook(object) {
  if (!object || !object.traverse) return;
  object.traverse((node) => {
    if (!node.isMesh || node.userData.paintDone) return;
    node.userData.paintDone = true;

    const mats = node.material;
    if (Array.isArray(mats)) {
      if (mats.length) node.material = mats.map(paintedMaterial);
    } else if (mats) {
      node.material = paintedMaterial(mats);
    }

    // Skinned meshes deform through bones the hull does not share, and
    // instanced meshes would need one hull per instance: skip both.
    if (!node.isSkinnedMesh && !node.isInstancedMesh) addOutline(node);
  });
}
