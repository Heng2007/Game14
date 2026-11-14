export function corridorDistance(x, z, segments, margin = 0) {
  if (!segments.length) return Infinity;
  return Math.min(...segments.map(({ a, b, halfWidth }) => {
    const dx = b.x - a.x, dz = b.z - a.z;
    const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz || 1)));
    return Math.hypot(x - a.x - dx * t, z - a.z - dz * t) - halfWidth + margin;
  }));
}

export function projectCorridor(position, segments, margin = 0.45) {
  if (corridorDistance(position.x, position.z, segments, margin) <= 0) return position;
  let nearest, distance = Infinity;
  for (const { a, b, halfWidth } of segments) {
    const dx = b.x - a.x, dz = b.z - a.z;
    const t = Math.max(0, Math.min(1, ((position.x - a.x) * dx + (position.z - a.z) * dz) / (dx * dx + dz * dz || 1)));
    const x = a.x + dx * t, z = a.z + dz * t;
    const length = Math.hypot(position.x - x, position.z - z);
    const radius = Math.max(0, halfWidth - margin - 1e-7);
    if (length - radius < distance) {
      distance = length - radius;
      nearest = { x: x + (position.x - x) * radius / (length || 1), z: z + (position.z - z) * radius / (length || 1) };
    }
  }
  if (nearest) Object.assign(position, nearest);
  return position;
}

export function pushFromBoxes(position, boxes = [], margin = 0.45) {
  for (const box of boxes) {
    const dx = position.x - box.x, dz = position.z - box.z;
    const u = dx * box.ux + dz * box.uz, v = -dx * box.uz + dz * box.ux;
    const du = box.halfLength + margin - Math.abs(u), dv = box.halfWidth + margin - Math.abs(v);
    if (du <= 0 || dv <= 0) continue;
    if (du < dv) {
      position.x += (Math.sign(u) || 1) * du * box.ux;
      position.z += (Math.sign(u) || 1) * du * box.uz;
    } else {
      position.x -= (Math.sign(v) || 1) * dv * box.uz;
      position.z += (Math.sign(v) || 1) * dv * box.ux;
    }
  }
}
