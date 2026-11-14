// PART 2 owns this file. Keyboard state, read by player.js and index.js.

const down = new Set();
const pressed = new Set(); // keys that went down since the last endFrame()
let taps = [];
let triple = false;

window.addEventListener('keydown', (e) => {
  if (e.repeat) return;
  down.add(e.code);
  pressed.add(e.code);
  if (e.code === 'Space') {
    e.preventDefault();
    const now = performance.now();
    taps = [...taps, now].slice(-3);
    if (taps.length === 3 && now - taps[0] < 800) {
      triple = true;
      taps = [];
    }
  }
});
window.addEventListener('keyup', (e) => down.delete(e.code));
window.addEventListener('blur', () => down.clear());

const ALIASES = { KeyW: 'ArrowUp', KeyS: 'ArrowDown', KeyA: 'ArrowLeft', KeyD: 'ArrowRight' };

export const isDown = (code) => down.has(code) || down.has(ALIASES[code]);
export const wasPressed = (code) => pressed.has(code);
export function consumeTriple() {
  const t = triple;
  triple = false;
  return t;
}
export function endFrame() {
  pressed.clear();
}
