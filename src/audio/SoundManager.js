const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x-a)/(b-a))); return t*t*(3-2*t); };
export function bedWeights(x) {
  const garden = smooth(-40,-30,x), hell = smooth(30,40,x);
  return [(1-garden)*(1-hell), garden*(1-hell), hell];
}

// Background music: "Garden Of Unseen Things", looped under the soundscape.
const MUSIC_FILE = 'audio/garden-of-unseen-things.mp3';
const MUSIC_VOLUME = 0.3;
let musicBytes = null; // downloaded once, reused on replay

export class SoundManager {
  constructor() { this.context = null; this.beds = []; this.sources = []; this.nodes = []; this.shots = new Set(); this.ducked = false; }
  start(context, master) {
    if (!context || this.context) return;
    this.context = context; this.master = master;
    const noise = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
    const data = noise.getChannelData(0);
    for (let i=0;i<data.length;i++) data[i]=Math.random()*2-1;
    this.noise = noise;
    this.beds = [0,1,2].map(() => { const gain=context.createGain();gain.gain.value=0;gain.connect(master);this.nodes.push(gain);return gain; });
    const oscillator = (bed, type, frequency, volume, detune=0, filter=null) => {
      const source=context.createOscillator(), gain=context.createGain();
      source.type=type;source.frequency.value=frequency;source.detune.value=detune;gain.gain.value=volume;
      source.connect(gain);gain.connect(filter??this.beds[bed]);source.start();
      this.sources.push({source,bed});this.nodes.push(source,gain);
    };
    oscillator(0,'sine',146.8324,0.065);oscillator(0,'triangle',220,0.025);
    const water=context.createBufferSource(), waterFilter=context.createBiquadFilter(), waterGain=context.createGain();
    water.buffer=noise;water.loop=true;waterFilter.type='bandpass';waterFilter.frequency.value=1650;waterFilter.Q.value=0.7;waterGain.gain.value=0.035;
    water.connect(waterFilter);waterFilter.connect(waterGain);waterGain.connect(this.beds[0]);water.start();
    this.waterFilter=waterFilter;
    this.sources.push({source:water,bed:0});this.nodes.push(water,waterFilter,waterGain);
    const choir=context.createBiquadFilter();choir.type='lowpass';choir.frequency.value=850;choir.Q.value=1.4;choir.connect(this.beds[1]);this.nodes.push(choir);
    for(const [frequency,detune] of [[146.8324,-9],[146.8324,9],[220,-6],[293.6648,7]])oscillator(1,'triangle',frequency,0.028,detune,choir);
    oscillator(2,'sine',36.7081,0.095);oscillator(2,'triangle',55,0.026);
    this.musicGain=context.createGain();this.musicGain.gain.value=0;this.musicGain.connect(master);this.nodes.push(this.musicGain);
    if(typeof context.decodeAudioData==='function')this.startMusic(context);
  }
  // Loads and loops the music. If the file is missing or can't be decoded, the game carries on without it.
  async startMusic(context) {
    try {
      musicBytes??=fetch((import.meta.env?.BASE_URL??'/')+MUSIC_FILE).then(response=>{
        if(!response.ok)throw new Error(`music: HTTP ${response.status}`);return response.arrayBuffer();
      });
      this.musicBuffer??=await context.decodeAudioData((await musicBytes).slice(0));
      if(this.context!==context||!this.musicGain)return; // stopped while loading
      const source=context.createBufferSource();source.buffer=this.musicBuffer;source.loop=true;
      source.connect(this.musicGain);source.start();
      this.sources.push({source,bed:'music'});this.nodes.push(source);
    } catch { musicBytes=null; }
  }
  update(x) {
    if(!this.context)return;
    const now=this.context.currentTime;
    bedWeights(x).forEach((weight,i)=>this.beds[i].gain.setTargetAtTime(weight*(this.ducked?0.4:1),now,0.7));
    this.musicGain?.gain.setTargetAtTime(MUSIC_VOLUME*(this.ducked?0.45:1),now,0.7); // quieter under the narrator
    this.waterFilter.frequency.setTargetAtTime(1550+Math.sin(now*0.7)*450,now,0.4);
  }
  oneShot(sources,nodes,duration) {
    const shot={sources,nodes};this.shots.add(shot);
    let remaining=sources.length;
    const clean=()=>{if(--remaining)return;nodes.forEach(node=>node.disconnect());this.shots.delete(shot);};
    sources.forEach(source=>{source.onended=clean;source.start();source.stop(this.context.currentTime+duration);});
  }
  bell(frequency=659.255) {
    if(!this.context)return;
    const now=this.context.currentTime, nodes=[], sources=[];
    for(const [ratio,level] of [[1,0.12],[2.756,0.035],[5.404,0.012]]) {
      const source=this.context.createOscillator(),gain=this.context.createGain();source.type='sine';source.frequency.value=frequency*ratio;
      gain.gain.setValueAtTime(level,now);gain.gain.exponentialRampToValueAtTime(0.0001,now+1.7);
      source.connect(gain);gain.connect(this.master);nodes.push(source,gain);sources.push(source);
    }
    this.oneShot(sources,nodes,1.8);
  }
  pluck(frequency=293.6648) {
    if(!this.context)return;
    const now=this.context.currentTime,source=this.context.createBufferSource(),filter=this.context.createBiquadFilter(),gain=this.context.createGain();
    source.buffer=this.noise;filter.type='bandpass';filter.frequency.value=frequency;filter.Q.value=35;
    gain.gain.setValueAtTime(0.4,now);gain.gain.exponentialRampToValueAtTime(0.0001,now+1.1);
    source.connect(filter);filter.connect(gain);gain.connect(this.master);
    const overtone=this.context.createOscillator(),toneGain=this.context.createGain();overtone.type='triangle';overtone.frequency.value=frequency;
    toneGain.gain.setValueAtTime(0.08,now);toneGain.gain.exponentialRampToValueAtTime(0.0001,now+1.2);overtone.connect(toneGain);toneGain.connect(this.master);
    this.oneShot([source,overtone],[source,filter,gain,overtone,toneGain],1.3);
  }
  get diagnostics() { return {contextState:this.context?.state??'locked',bedGains:this.beds.map(b=>b.gain.value),sourcesByAct:[0,1,2].map(i=>this.sources.filter(s=>s.bed===i).length),oneShots:this.shots.size,nodes:this.nodes.length}; }
  stop() {
    this.sources.forEach(({source})=>source.stop());
    for(const shot of this.shots){shot.sources.forEach(source=>{source.onended=null;try{source.stop();}catch{}});shot.nodes.forEach(node=>node.disconnect());}
    this.shots.clear();this.nodes.forEach(node=>node.disconnect());this.sources=[];this.nodes=[];this.beds=[];this.musicGain=null;this.context=null;
  }
}
