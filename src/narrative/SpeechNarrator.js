export function pickEnglishVoice(voices) {
  const english = voices.filter(voice => /^en(?:[-_]|$)/i.test(voice.lang));
  return ['Google UK English Male', 'Daniel'].map(name => english.find(voice => voice.name === name)).find(Boolean)
    ?? english.find(voice => /^en[-_]GB$/i.test(voice.lang))
    ?? english.find(voice => voice.default) ?? english[0]
    ?? voices.find(voice => voice.default) ?? null;
}

export function splitWords(text) {
  return Array.from(text.matchAll(/\S+/g), match => ({ text: match[0], charIndex: match.index }));
}

export class SpeechNarrator extends EventTarget {
  constructor({ synth = globalThis.window?.speechSynthesis, Utterance = globalThis.SpeechSynthesisUtterance,
    now = () => performance.now() / 1000 } = {}) {
    super();
    Object.assign(this, { synth, Utterance, now });
    this.muted = false; this.generation = 0; this.current = null; this.primed = false;
    this.refreshVoices = () => { this.voice = pickEnglishVoice(this.synth?.getVoices() ?? []); };
    this.refreshVoices();
    synth?.addEventListener('voiceschanged', this.refreshVoices);
  }
  emit(type, detail) { this.dispatchEvent(new CustomEvent(type, { detail })); }
  unlock() {
    if (this.primed || !this.synth || !this.Utterance || this.muted) return;
    this.primed = true;
    const prime = new this.Utterance(' '); prime.volume = 0;
    this.synth.speak(prime);
  }
  speak(text, { zone = 'ACT_I_EDEN', id = null } = {}) {
    const words = splitWords(text);
    if (!words.length) return null;
    const generation = ++this.generation;
    if (this.current && !this.current.ended) this.end('interrupted');
    this.synth?.cancel();
    const line = { id: id ?? generation, text, words, zone, started: this.now(),
      duration: words.length / (2.6 * 0.88), wordIndex: -1, source: 'estimate', ended: false };
    this.current = line;
    this.emit('line-start', line);
    this.advance(0);
    if (this.muted || !this.synth || !this.Utterance) return line;
    this.refreshVoices();
    const utterance = new this.Utterance(text);
    Object.assign(utterance, { rate: 0.88, pitch: 0.90, volume: 1.0, lang: 'en-GB' });
    if (this.voice) utterance.voice = this.voice;
    const active = () => generation === this.generation && this.current === line && !line.ended;
    utterance.onboundary = event => {
      if (!active() || (event.name && event.name !== 'word')) return;
      line.source = 'boundary';
      const index = words.findLastIndex(word => word.charIndex <= event.charIndex);
      this.advance(index);
    };
    utterance.onend = () => { if (active()) { this.advance(words.length - 1); this.end('complete'); } };
    utterance.onerror = () => { if (active()) line.source = 'estimate'; };
    this.synth.speak(utterance);
    return line;
  }
  advance(index) {
    const line = this.current;
    if (!line || line.ended) return;
    for (let i = line.wordIndex + 1; i <= Math.min(index, line.words.length - 1); i++) {
      line.wordIndex = i;
      this.emit('word', { id: line.id, index: i, charIndex: line.words[i].charIndex, source: line.source });
    }
  }
  end(reason) {
    if (!this.current || this.current.ended) return;
    this.current.ended = true;
    this.emit('line-end', { id: this.current.id, reason, source: this.current.source });
  }
  update() {
    const line = this.current;
    if (!line || line.ended) return;
    const elapsed = this.now() - line.started;
    if (line.source === 'estimate') this.advance(Math.floor(elapsed * 2.6 * 0.88));
    if ((line.source === 'estimate' && elapsed > line.duration + 1.2) || elapsed > line.duration * 2 + 5) this.end('complete');
  }
  setMuted(muted) {
    if (this.muted === muted) return;
    this.muted = muted;
    if (muted) {
      ++this.generation;
      this.synth?.cancel();
      if (this.current && !this.current.ended) this.current.source = 'estimate';
    }
    this.emit('mute', { muted });
  }
  dispose() {
    this.reset();
    this.synth?.removeEventListener('voiceschanged', this.refreshVoices);
  }
  reset() {
    ++this.generation;
    this.synth?.cancel();
    this.end('reset');
    this.current = null;
  }
}
