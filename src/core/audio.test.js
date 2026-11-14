import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAudioPipeline } from './audio.js';

test('master defaults to 0.25 with analyser connected to destination; explicit mute is zero', () => {
  const makeNode=()=>({gain:{value:1},connect(destination){this.destination=destination;}});
  const context={createGain:makeNode,createAnalyser:makeNode,destination:{}};
  const {masterGain,analyser}=createAudioPipeline(context);
  assert.equal(masterGain.gain.value,0.25);assert.equal(masterGain.destination,analyser);assert.equal(analyser.destination,context.destination);
  assert.equal(createAudioPipeline(context,true).masterGain.gain.value,0);
});
test('unlock and fallback gestures resume suspended context; mute controls the common master', async () => {
  const previous=globalThis.window,window=new EventTarget();globalThis.window=window;
  let resumes=0;
  class Context {
    constructor(){this.state='suspended';this.destination={};}
    createGain(){return {gain:{value:0},connect(){}};}
    createAnalyser(){return {connect(){},getFloatTimeDomainData(data){data.fill(0);}};}
    resume(){resumes++;this.state='running';return Promise.resolve();}
  }
  window.AudioContext=Context;
  try {
    const audio=await import('./audio.js?gesture-test');audio.unlock();assert.equal(resumes,1);assert.equal(audio.getMasterGain().gain.value,0.25);
    audio.getContext().state='suspended';window.dispatchEvent(new Event('pointerdown'));assert.equal(resumes,2);
    audio.getContext().state='suspended';window.dispatchEvent(new Event('keydown'));assert.equal(resumes,3);
    assert.equal(audio.toggleMute(),true);assert.equal(audio.getMasterGain().gain.value,0);
    assert.equal(audio.toggleMute(),false);assert.equal(audio.getMasterGain().gain.value,0.25);
    window.dispatchEvent(new Event('pointerdown'));assert.equal(resumes,3);
  } finally { globalThis.window=previous; }
});
