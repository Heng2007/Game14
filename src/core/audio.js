let context, masterGain;
let muted = false;
export function unlock() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (AudioContext && !context) {
    context = new AudioContext();
    masterGain = context.createGain();
    masterGain.gain.value = muted ? 0 : 1;
    masterGain.connect(context.destination);
  }
  context?.resume().catch(() => {});
  if (window.speechSynthesis && window.SpeechSynthesisUtterance) {
    const prime = new SpeechSynthesisUtterance(' ');
    prime.volume = 0;
    window.speechSynthesis.speak(prime);
  }
}
export function speak(text) {
  if (muted || !text || !window.speechSynthesis || !window.SpeechSynthesisUtterance) return;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
}
export function toggleMute() {
  muted = !muted;
  if (masterGain) masterGain.gain.value = muted ? 0 : 1;
  if (muted) window.speechSynthesis?.cancel();
  return muted;
}
export function getMasterGain() { return masterGain; }
