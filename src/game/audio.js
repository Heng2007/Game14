// PART 2 owns this file. All sound is made in the browser (Web Audio), so there
// are no audio files. Nothing plays until start() is called from a click.

let ac = null, master = null, windGain = null, muted = false, nextNote = 0;
const NOTES = [261.6, 329.6, 392, 440, 523.3, 440, 392, 329.6]; // C major pentatonic-ish

function tone(freq, when, length, type, volume) {
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(volume, when + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, when + length);
  o.connect(g).connect(master);
  o.start(when); o.stop(when + length + 0.05);
}

export function start() {
  try {
    if (!ac) {
      ac = new AudioContext();
      master = ac.createGain();
      master.gain.value = muted ? 0 : 0.6;
      master.connect(ac.destination);

      // wind: looped noise through a band filter
      const buffer = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      const noise = ac.createBufferSource();
      noise.buffer = buffer; noise.loop = true;
      const filter = ac.createBiquadFilter();
      filter.type = 'bandpass'; filter.frequency.value = 700;
      windGain = ac.createGain(); windGain.gain.value = 0;
      noise.connect(filter).connect(windGain).connect(master);
      noise.start();

      // music: a slow arpeggio, scheduled a little ahead
      nextNote = ac.currentTime + 0.1;
      let i = 0;
      setInterval(() => {
        while (nextNote < ac.currentTime + 0.6) {
          tone(NOTES[i % NOTES.length], nextNote, 0.9, 'triangle', 0.07);
          if (i % 8 === 0) tone(NOTES[0] / 2, nextNote, 3.5, 'sine', 0.06);
          nextNote += 0.5; i++;
        }
      }, 200);
    }
    ac.resume();
  } catch { ac = null; }
}

export function setMuted(m) {
  muted = m;
  if (master) master.gain.value = m ? 0 : 0.6;
}

export function pickup() { if (ac) { const t = ac.currentTime; tone(660, t, 0.12, 'square', 0.12); tone(990, t + 0.08, 0.15, 'square', 0.12); } }
export function deliver() { if (ac) { const t = ac.currentTime; [523, 659, 784, 1047].forEach((f, i) => tone(f, t + i * 0.09, 0.4, 'triangle', 0.18)); } }
export function step(mounted) { if (ac) tone(mounted ? 95 : 140, ac.currentTime, 0.09, 'sine', 0.25); }
export function setWind(level) { if (windGain) windGain.gain.setTargetAtTime(level * 0.5, ac.currentTime, 0.2); }
