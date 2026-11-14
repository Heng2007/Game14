const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x-a)/(b-a))); return t*t*(3-2*t); };
export function bedWeights(x) {
  const garden = smooth(-40,-30,x), hell = smooth(30,40,x);
  return [(1-garden)*(1-hell), garden*(1-hell), hell];
}

// Background music: "Garden Of Unseen Things", looped under the soundscape.
const MUSIC_FILE = 'audio/garden-of-unseen-things.mp3';
const MUSIC_VOLUME = 0.16;
const SCALES = [[146.8324,164.8138,195.9977,220,261.6256,293.6648],
  [146.8324,164.8138,174.6141,220,246.9417,293.6648],
  [146.8324,155.5635,174.6141,220,233.0819,293.6648]];
let musicBytes = null; // downloaded once, reused on replay

export class SoundManager {
  constructor() { this.context = null; this.beds = []; this.sources = []; this.nodes = []; this.shots = new Set(); this.musicShots = new Set(); this.ducked = false; }
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
    oscillator(0,'sine',146.8324,0.16);oscillator(0,'triangle',220,0.08);
    const water=context.createBufferSource(), waterFilter=context.createBiquadFilter(), waterGain=context.createGain();
    water.buffer=noise;water.loop=true;waterFilter.type='bandpass';waterFilter.frequency.value=1650;waterFilter.Q.value=0.7;waterGain.gain.value=0.035;
    water.connect(waterFilter);waterFilter.connect(waterGain);waterGain.connect(this.beds[0]);water.start();
    this.waterFilter=waterFilter;
    this.sources.push({source:water,bed:0});this.nodes.push(water,waterFilter,waterGain);
    const choir=context.createBiquadFilter();choir.type='lowpass';choir.frequency.value=850;choir.Q.value=1.4;choir.connect(this.beds[1]);this.nodes.push(choir);
    for(const [frequency,detune] of [[146.8324,-9],[146.8324,9],[220,-6],[293.6648,7]])oscillator(1,'triangle',frequency,0.08,detune,choir);
    oscillator(2,'sine',36.7081,0.2);oscillator(2,'triangle',55,0.07);
    this.musicGain=context.createGain();this.musicGain.gain.value=0;this.musicGain.connect(master);this.nodes.push(this.musicGain);
    if(typeof context.decodeAudioData==='function')this.startMusic(context);
    this.x=-92;this.step=0;this.nextNote=context.currentTime;
    this.update(this.x);
    this.scheduler=setInterval(()=>this.schedule(),100);
    this.scheduler.unref?.();
    this.schedule();
  }
  // Loads and loops the music. If the file is missing or can't be decoded, the game carries on without it.
  async startMusic(context) {
    try {
      musicBytes??=fetch((import.meta.env?.BASE_URL??'/')+MUSIC_FILE).then(response=>{
        if(!response.ok)throw new Error(`music: HTTP ${response.status}`);return response.arrayBuffer();
      });
      this.musicBuffer??=await context.decodeAudioData((await musicBytes).slice(0));
      if(this.context!==context||!this.musicGain)return; // stopped while loading
      if(this.sources.some(item=>item.bed==='music'))return;
      const source=context.createBufferSource();source.buffer=this.musicBuffer;source.loop=true;
      source.connect(this.musicGain);source.start();
      this.sources.push({source,bed:'music'});this.nodes.push(source);
    } catch { musicBytes=null; }
  }
  update(x) {
    if(!this.context)return;
    this.x=x;
    const now=this.context.currentTime;
    bedWeights(x).forEach((weight,i)=>this.beds[i].gain.setTargetAtTime(weight*(this.ducked?0.4:1),now,0.7));
    this.musicGain?.gain.setTargetAtTime(MUSIC_VOLUME*(this.ducked?0.45:1),now,0.7); // quieter under the narrator
    this.waterFilter.frequency.setTargetAtTime(1550+Math.sin(now*0.7)*450,now,0.4);
  }
  schedule() {
    if(!this.context)return;
    const now=this.context.currentTime;
    this.nextNote=Math.max(this.nextNote,now);
    while(this.nextNote<now+0.2){
      const zone=this.x< -35?0:this.x<35?1:2,scale=SCALES[zone],step=this.step++;
      const root=scale[[0,2,4,2,1,3,5,3][step%8]],start=this.nextNote;
      this.tone(root,start,0.8,0.22*(this.ducked?0.4:1),'triangle',0,true);
      this.tone(root*1.5,start,1.15,0.07*(this.ducked?0.4:1),'sine',0,true);
      this.nextNote+=0.46;
    }
  }
  tone(frequency,start,duration,volume,type='sine',formant=0,music=false) {
    if(!this.context)return;
    const source=this.context.createOscillator(),gain=this.context.createGain(),nodes=[source,gain];
    source.type=type;source.frequency.value=frequency;source.connect(gain);
    gain.gain.setValueAtTime(0.0001,start);gain.gain.exponentialRampToValueAtTime(volume,start+0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001,start+duration);
    if(formant){const filter=this.context.createBiquadFilter();filter.type='bandpass';filter.frequency.value=formant;filter.Q.value=3;gain.connect(filter);filter.connect(this.master);nodes.push(filter);}
    else gain.connect(this.master);
    const shots=music?this.musicShots:this.shots,shot={sources:[source],nodes};shots.add(shot);
    source.onended=()=>{nodes.forEach(n=>n.disconnect());shots.delete(shot);};
    source.start(start);source.stop(start+duration+0.02);
  }
  murmur(word, naturalVoice=false) {
    if(!this.context)return;
    const now=this.context.currentTime,syllables=Math.max(1,Math.min(4,(word.match(/[aeiouy]+/gi)??[]).length));
    for(let i=0;i<syllables;i++){
      const start=now+i*0.09,frequency=[146.8324,164.8138,195.9977][(word.length+i)%3];
      this.tone(frequency,start,0.15,naturalVoice?0.035:0.65,'sawtooth',650+(word.length%4)*180);
      this.tone(frequency*2,start,0.13,naturalVoice?0.018:0.32,'triangle',1250);
      this.tone(frequency,start,0.18,naturalVoice?0.012:0.12,'triangle');
    }
  }
  interaction(kind) {
    if(!this.context)return;
    const now=this.context.currentTime;
    if(kind==='ring'){this.noiseBurst(1200,350,0.55);this.bell(440);}
    else if(kind==='bubble'){this.tone(220,now,0.8,0.35,'sine');this.bell(880);}
    else if(kind==='fruit'){this.noiseBurst(850,140,0.28);this.bell(659.255);}
    else if(kind==='lute')this.pluck();
    else this.bell(523.251);
  }
  noiseBurst(from,to,duration) {
    if(!this.context)return;
    const now=this.context.currentTime,source=this.context.createBufferSource(),filter=this.context.createBiquadFilter(),gain=this.context.createGain();
    source.buffer=this.noise;filter.type='lowpass';filter.frequency.setValueAtTime(from,now);filter.frequency.exponentialRampToValueAtTime(to,now+duration);
    gain.gain.setValueAtTime(0.35,now);gain.gain.exponentialRampToValueAtTime(0.0001,now+duration);
    source.connect(filter);filter.connect(gain);gain.connect(this.master);this.oneShot([source],[source,filter,gain],duration+0.02);
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
  get diagnostics() { return {contextState:this.context?.state??'locked',bedGains:this.beds.map(b=>b.gain.value),sourcesByAct:[0,1,2].map(i=>this.sources.filter(s=>s.bed===i).length),trackPlaying:this.sources.some(s=>s.bed==='music'),arpeggioVoices:this.musicShots.size,oneShots:this.shots.size,nodes:this.nodes.length}; }
  stop() {
    clearInterval(this.scheduler);
    this.sources.forEach(({source})=>source.stop());
    for(const shot of [...this.shots,...this.musicShots]){shot.sources.forEach(source=>{source.onended=null;try{source.stop();}catch{}});shot.nodes.forEach(node=>node.disconnect());}
    this.shots.clear();this.musicShots.clear();this.nodes.forEach(node=>node.disconnect());this.sources=[];this.nodes=[];this.beds=[];this.musicGain=null;this.context=null;
  }
}
