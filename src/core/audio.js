import { SpeechNarrator } from '../narrative/SpeechNarrator.js';

export const narrator = new SpeechNarrator();
let context, masterGain;
export function unlock() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (AudioContext && !context) {
    context = new AudioContext();
    masterGain = context.createGain();
    masterGain.gain.value = narrator.muted ? 0 : 1;
    masterGain.connect(context.destination);
  }
  context?.resume().catch(() => {});
  narrator.unlock();
}
export function speak(text, options) {
  return narrator.speak(text, options);
}
export function toggleMute() {
  narrator.setMuted(!narrator.muted);
  if (masterGain) masterGain.gain.value = narrator.muted ? 0 : 1;
  return narrator.muted;
}
export function getMasterGain() { return masterGain; }
export function getContext() { return context; }
