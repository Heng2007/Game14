import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SoundManager, bedWeights } from './SoundManager.js';

function audioMock() {
  const nodes=[];
  const parameter=()=>({value:0,setValueAtTime(v){this.value=v;},exponentialRampToValueAtTime(v){this.value=v;},setTargetAtTime(v){this.value=v;}});
  const node=()=>{const n={gain:parameter(),frequency:parameter(),detune:parameter(),Q:parameter(),connect(){},disconnect(){this.disconnected=true;},start(){this.started=true;},stop(){this.stopped=true;}};nodes.push(n);return n;};
  return {nodes,context:{sampleRate:100,currentTime:0,state:'running',createGain:node,createOscillator:node,createBufferSource:node,createBiquadFilter:node,createBuffer:(_,length)=>({getChannelData:()=>new Float32Array(length)})}};
}
test('act weights crossfade continuously and sum to one', () => {
  assert.deepEqual(bedWeights(-90),[1,0,0]);assert.deepEqual(bedWeights(0),[0,1,0]);assert.deepEqual(bedWeights(90),[0,0,1]);
  assert.deepEqual(bedWeights(-35),[0.5,0.5,0]);assert.deepEqual(bedWeights(35),[0,0.5,0.5]);
  for(let x=-100;x<=100;x++)assert.ok(Math.abs(bedWeights(x).reduce((a,b)=>a+b)-1)<1e-10);
});
test('locked sound is inert; shared-context beds duck, shots dispose, stop is idempotent', () => {
  const manager=new SoundManager();manager.start(null,null);manager.update(0);manager.bell();manager.pluck();manager.stop();
  assert.equal(manager.diagnostics.contextState,'locked');
  const {context,nodes}=audioMock();manager.start(context,{});const count=nodes.length;manager.start(context,{});assert.equal(nodes.length,count);
  manager.update(-90);assert.deepEqual(manager.diagnostics.sourcesByAct,[3,4,2]);assert.deepEqual(manager.diagnostics.bedGains,[1,0,0]);
  manager.ducked=true;manager.update(0);assert.deepEqual(manager.diagnostics.bedGains,[0,0.4,0]);
  manager.bell();manager.pluck();assert.equal(manager.shots.size,2);
  for(const shot of [...manager.shots]){shot.sources.forEach(s=>s.onended());assert.ok(shot.nodes.every(n=>n.disconnected));}
  assert.equal(manager.shots.size,0);manager.bell();manager.stop();manager.stop();assert.ok(nodes.every(n=>n.disconnected));
  assert.equal(manager.diagnostics.nodes,0);manager.start(context,{});assert.equal(manager.diagnostics.contextState,'running');manager.stop();
});
test('arpeggios schedule polyphony without a render loop, shift scales, and all SFX and murmurs clean up', () => {
  const manager=new SoundManager(),{context,nodes}=audioMock();manager.start(context,{});
  assert.equal(manager.musicShots.size,2);assert.ok(manager.beds[0].gain.value>0);
  for(const x of [-92,0,60]){manager.update(x);context.currentTime+=1;manager.schedule();}
  assert.ok(manager.musicShots.size>=8);
  for(const kind of ['ring','bubble','fruit','lute',undefined])manager.interaction(kind);
  manager.murmur('innocence');manager.murmur('the',true);assert.ok(manager.shots.size>5);
  for(const shot of [...manager.shots,...manager.musicShots])shot.sources.forEach(source=>source.onended());
  assert.equal(manager.shots.size,0);assert.equal(manager.musicShots.size,0);manager.stop();assert.ok(nodes.every(node=>node.disconnected));
  manager.murmur('');manager.interaction('ring');manager.schedule();assert.equal(manager.shots.size,0);
});
