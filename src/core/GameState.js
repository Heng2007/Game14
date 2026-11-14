export const ZONE_NAMES = Object.freeze(['SHUTTER_MENU', 'ACT_I_EDEN', 'ACT_II_GARDEN', 'ACT_III_HELL', 'FINALE']);

export class GameState {
  #listeners = new Set();
  constructor() { this.reset(); }
  reset() {
    this.currentZone = 'SHUTTER_MENU';
    this.decisions = { ateDragonFruit: null, owlAction: null, candleAction: null };
    this.puzzlesCompleted = { edenRings: false, gardenBubble: false, gardenFruit: false, hellLute: false };
    this.emit();
  }
  setZone(zone) {
    if (!ZONE_NAMES.includes(zone)) throw new RangeError(`Unknown zone: ${zone}`);
    this.currentZone = zone;
    this.emit();
  }
  setDecision(key, value) {
    if (!Object.hasOwn(this.decisions, key)) throw new RangeError(`Unknown decision: ${key}`);
    this.decisions[key] = value;
    this.emit();
  }
  completePuzzle(key) {
    if (!Object.hasOwn(this.puzzlesCompleted, key)) throw new RangeError(`Unknown puzzle: ${key}`);
    this.puzzlesCompleted[key] = true;
    this.emit();
  }
  subscribe(listener) { this.#listeners.add(listener); return () => this.#listeners.delete(listener); }
  emit() { for (const listener of this.#listeners) listener(this); }
}
