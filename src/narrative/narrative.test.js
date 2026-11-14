import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Scene, PerspectiveCamera } from 'three';
import { pickEnglishVoice, SpeechNarrator, splitWords } from './SpeechNarrator.js';
import { NarrativeTriggers, SCRIPT } from './script.js';
import { DiegeticText } from './DiegeticText.js';

function setup() {
  let clock = 0;
  const synth = new EventTarget();
  synth.voices = [{ name: 'English', lang: 'en-US', default: true }];
  synth.getVoices = () => synth.voices;
  synth.spoken = []; synth.cancels = 0;
  synth.speak = line => synth.spoken.push(line);
  synth.cancel = () => { synth.cancels++; };
  class Utterance { constructor(text) { this.text = text; } }
  const narrator = new SpeechNarrator({ synth, Utterance, now: () => clock });
  return { narrator, synth, tick: seconds => { clock += seconds; narrator.update(); } };
}
test('voice preference respects English names, regional fallback, default and empty list', () => {
  const voices = [
    { name: 'French', lang: 'fr-FR', default: true }, { name: 'US', lang: 'en-US' },
    { name: 'British', lang: 'en-GB' }, { name: 'Daniel', lang: 'en-GB' },
    { name: 'Google UK English Male', lang: 'en-GB' },
  ];
  for (let i = 4; i >= 0; i--) assert.equal(pickEnglishVoice(voices.slice(0, i + 1)), voices[i]);
  assert.equal(pickEnglishVoice([]), null);
  const { narrator, synth } = setup();
  synth.voices = voices; synth.dispatchEvent(new Event('voiceschanged'));
  narrator.speak('The first light.');
  assert.equal(synth.spoken[0].voice.name, 'Google UK English Male');
  assert.deepEqual([synth.spoken[0].rate, synth.spoken[0].pitch, synth.spoken[0].volume], [0.88, 0.90, 1]);
});
test('new line cancels prior speech and ignores stale boundary/end/error events', () => {
  const { narrator, synth } = setup(); const events = [];
  narrator.addEventListener('word', event => events.push(event.detail));
  narrator.speak('Old words remain.'); const old = synth.spoken[0];
  narrator.speak('New words arrive.'); const current = narrator.current;
  old.onboundary({ charIndex: 10, name: 'word' }); old.onend(); old.onerror();
  assert.equal(narrator.current, current); assert.equal(current.ended, false);
  assert.equal(events.at(-1).index, 0); assert.equal(synth.cancels, 2);
  synth.spoken[1].onboundary({ charIndex: 4, name: 'word' });
  assert.equal(events.at(-1).charIndex, 4); assert.equal(current.source, 'boundary');
});
test('boundary timing and estimates never double-advance words', () => {
  const { narrator, synth, tick } = setup(); const indices = [];
  narrator.addEventListener('word', event => indices.push(event.detail.index));
  narrator.speak('One two three four.'); tick(0.5);
  synth.spoken[0].onboundary({ charIndex: 4, name: 'word' }); tick(0.5);
  assert.deepEqual(indices, [0, 1]);
  synth.spoken[0].onboundary({ charIndex: 8, name: 'word' });
  assert.deepEqual(indices, [0, 1, 2]);
});
test('mute cancels immediately and keeps estimated subtitles advancing without speech', () => {
  const { narrator, synth, tick } = setup();
  narrator.speak('One two three four five.'); const old = synth.spoken[0];
  narrator.setMuted(true); assert.equal(synth.cancels, 2);
  old.onend(); assert.equal(narrator.current.ended, false);
  tick(1); assert.equal(narrator.current.wordIndex, 2);
  narrator.speak('Silent words still appear.'); assert.equal(synth.spoken.length, 1);
  tick(4); assert.equal(narrator.current.ended, true);
  narrator.setMuted(false); narrator.speak('Voice restored.'); assert.equal(synth.spoken.length, 2);
});
test('empty input is a no-op; unavailable or failed speech completes through estimates', () => {
  const { narrator, synth, tick } = setup();
  assert.equal(narrator.speak('   '), null); assert.equal(synth.cancels, 0);
  assert.deepEqual(splitWords(' A  mirror.'), [{ text: 'A', charIndex: 1 }, { text: 'mirror.', charIndex: 4 }]);
  narrator.speak('A mirror.'); synth.spoken[0].onerror({ error: 'synthesis-unavailable' });
  tick(3); assert.equal(narrator.current.ended, true);
  const unavailable = new SpeechNarrator({ synth: null, Utterance: null, now: () => 0 });
  unavailable.speak('Still visible.'); assert.equal(unavailable.current.source, 'estimate');
  narrator.dispose(); assert.equal(synth.cancels, 2);
});
test('unlock primes once; spatial triggers fire once and only inside their radius', () => {
  const { narrator, synth } = setup(); narrator.unlock(); narrator.unlock();
  assert.equal(synth.spoken.length, 1); assert.equal(synth.spoken[0].volume, 0);
  const triggers = new NarrativeTriggers(); const seen = [];
  triggers.update({ x: -86, z: 35 }, line => seen.push(line.id)); assert.equal(seen.length, 0);
  for (const line of SCRIPT) for (let i = 0; i < 2; i++) triggers.update(line, value => seen.push(value.id));
  assert.equal(seen.length, SCRIPT.length); assert.equal(triggers.history.length, SCRIPT.length);
  new NarrativeTriggers([]).update({ x: 0, z: 0 }, () => assert.fail());
});

function fakeDocument() {
  return { createElement(type) {
    if (type === 'canvas') return { width: 1, height: 1, getContext: () => ({
      measureText: text => ({ width: text.length * 32 }), scale() {}, fillText() {},
    }) };
    return { textContent: '', classList: { toggle() {}, remove() {} } };
  } };
}
test('diegetic words reveal, fracture with UVs, expire and dispose all resources', () => {
  const previous = globalThis.document; globalThis.document = fakeDocument();
  try {
    const { narrator } = setup(); const scene = new Scene(), camera = new PerspectiveCamera();
    const subtitle = { replaceChildren() {}, append() {}, setAttribute() {}, removeAttribute() {}, classList: { add() {}, remove() {} } };
    const text = new DiegeticText(scene, camera, narrator, subtitle, { pixelRatio: 2 });
    narrator.setMuted(true); narrator.speak('Broken ice.', { zone: 'ACT_III_HELL' });
    assert.equal(text.meshCount, 2); assert.equal(text.words[0].revealed, 0);
    text.update(0.5); assert.equal(text.words[0].material.opacity, 1);
    camera.position.copy(text.words[0].origin); text.update(0.05);
    assert.equal(text.words[0].shards.length, 8);
    assert.equal(text.words[0].shards[0].mesh.geometry.attributes.uv.count, 3);
    let disposed = 0; text.words[0].texture.addEventListener('dispose', () => disposed++);
    text.update(2); assert.equal(disposed, 1);
    narrator.end('complete'); text.update(3); assert.equal(text.meshCount, 0);
    narrator.speak('Next line.'); text.dispose(); assert.equal(scene.children.length, 0);
  } finally { globalThis.document = previous; }
});
