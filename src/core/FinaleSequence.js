import { triptychHeight } from '../shared/positions.js';

export function buildEpilogue({ ateDragonFruit, owlAction, candleAction }) {
  const fruit = ateDragonFruit === true ? 'You tasted the dragon fruit, and carried its sweetness beyond the garden.'
    : ateDragonFruit === false ? 'You refused the dragon fruit; even an untouched branch remembers a hand.'
    : 'The dragon fruit remained unnamed by your hunger.';
  const owl = owlAction === 'heeded' ? 'You heeded the owl, leaving room for a wisdom not your own.'
    : owlAction === 'shooed' ? 'You drove the owl away; its silence followed you.'
    : 'The owl kept its counsel, neither welcomed nor dismissed.';
  const candle = candleAction === 'kept' ? 'You kept the candle burning, a small refusal of the dark.'
    : candleAction === 'snuffed' ? 'You snuffed the candle, and accepted the shape of darkness.'
    : 'The candle waited for a choice that never came.';
  return `${fruit} ${owl} ${candle} The shutters close. The world remains a mirror, not a verdict.`;
}

const ease = t => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };
export class FinaleSequence {
  constructor({ camera, controller, world, state, onComplete = () => {} }) {
    Object.assign(this, { camera, controller, world, state, onComplete }); this.reset();
  }
  reset() {
    this.phase = 'idle'; this.elapsed = 0;
    this.controller.enabled = true; this.controller.controls.enabled = true;
  }
  get active() { return this.phase !== 'idle'; }
  start() {
    if (this.active) return false;
    this.phase = 'pullback'; this.elapsed = 0; this.from = this.camera.position.clone();
    this.controller.enabled = false; this.controller.controls.enabled = false;
    this.controller.keys.clear(); this.controller.velocity.set(0, 0, 0);
    this.world.opening = null;
    return true;
  }
  update(dt) {
    if (!this.active || this.phase === 'complete') return;
    this.elapsed = Math.min(14, this.elapsed + dt);
    const t = ease(this.elapsed / 12);
    const x = this.from.x + (-120 - this.from.x) * t, z = this.from.z + (26 - this.from.z) * t;
    const y = Math.max(triptychHeight(x, z) + 2, this.from.y + (9 - this.from.y) * t + Math.sin(t * Math.PI) * 5);
    this.camera.position.set(x, y, z); this.camera.rotation.set(0, -Math.PI / 2, 0);
    this.camera.fov = 60 + ease((this.elapsed - 9) / 3) * 24; this.camera.updateProjectionMatrix();
    if (this.elapsed >= 12) {
      this.phase = 'closing'; this.world.setShutterAmount(1 - ease((this.elapsed - 12) / 2));
    }
    if (this.elapsed === 14) {
      this.phase = 'complete'; this.state.setZone('FINALE'); this.controller.controls.unlock();
      this.onComplete(buildEpilogue(this.state.decisions));
    }
  }
}
