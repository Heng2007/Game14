export const LUTE_NOTES = [293.6648, 349.2282, 329.6276, 440];
export const LUTE_SEQUENCE = [1, 2, 3, 4];
export const RING_START = [7, 6, 5];

export class PuzzleProgress {
  constructor(state) { this.state = state; this.reset(); }
  reset() { this.rings = [...RING_START]; this.luteIndex = 0; this.peeled = 0; }
  rotateRing(index) {
    if (!Number.isInteger(index) || index < 0 || index > 2) throw new RangeError('Unknown ring');
    this.rings[index] = (this.rings[index] + 1) % 8;
    if (this.rings.every(tick => tick === 0)) this.state.completePuzzle('edenRings');
    return this.state.puzzlesCompleted.edenRings;
  }
  peel() {
    this.peeled = Math.min(8, this.peeled + 1);
    if (this.peeled === 8) this.state.completePuzzle('gardenFruit');
    return this.peeled;
  }
  pluck(note) {
    if (!LUTE_NOTES[note - 1]) throw new RangeError('Unknown lute string');
    if (this.state.puzzlesCompleted.hellLute) return true;
    this.luteIndex = note === LUTE_SEQUENCE[this.luteIndex] ? this.luteIndex + 1 : 0;
    if (this.luteIndex === LUTE_SEQUENCE.length) this.state.completePuzzle('hellLute');
    return this.state.puzzlesCompleted.hellLute;
  }
  decide(key, value) {
    if (this.state.decisions[key] !== null) return false;
    this.state.setDecision(key, value); return true;
  }
}
