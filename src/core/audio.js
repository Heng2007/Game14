import { SpeechNarrator } from '../narrative/SpeechNarrator.js';

export const narrator = new SpeechNarrator();
let context, masterGain, analyser;
export function createAudioPipeline(context, muted = false) {
  const masterGain = context.createGain(), analyser = context.createAnalyser();
  masterGain.gain.value = muted ? 0 : 0.25;
  analyser.fftSize = 1024;
  masterGain.connect(analyser);analyser.connect(context.destination);
  return { masterGain, analyser };
}
export function resumeIfSuspended() {
  if (context?.state === 'suspended') context.resume().catch(() => {});
}
globalThis.window?.addEventListener('pointerdown', resumeIfSuspended);
globalThis.window?.addEventListener('keydown', resumeIfSuspended);
export function unlock() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (AudioContext && !context) {
    context = new AudioContext();
    ({ masterGain, analyser } = createAudioPipeline(context, narrator.muted));
  }
  context?.resume().catch(() => {});
  narrator.unlock();
}
export function speak(text, options) {
  return narrator.speak(text, options);
}
export function toggleMute() {
  narrator.setMuted(!narrator.muted);
  if (masterGain) masterGain.gain.value = narrator.muted ? 0 : 0.25;
  return narrator.muted;
}
export function getMasterGain() { return masterGain; }
export function getContext() { return context; }
export function getOutputLevel() {
  if (!analyser) return 0;
  const samples = new Float32Array(analyser.fftSize);analyser.getFloatTimeDomainData(samples);
  return Math.sqrt(samples.reduce((sum, value) => sum + value * value, 0) / samples.length);
}
