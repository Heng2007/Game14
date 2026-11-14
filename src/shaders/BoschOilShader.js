import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { createFilterUniforms } from './FilterDirector.js';

export const BoschOilShader = {
  uniforms: {
    tDiffuse: { value: null }, tDepth: { value: null }, tNormal: { value: null },
    resolution: { value: new THREE.Vector2() }, cameraNear: { value: 0.1 }, cameraFar: { value: 2000 },
    strength: { value: 0.72 }, varnish: { value: new THREE.Color('#f5e1b5') },
    outlineStrength: { value: 0.35 }, crackStrength: { value: 0.075 },
    ...createFilterUniforms(),
  },
  vertexShader: `varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse, tDepth, tNormal;
    uniform vec2 resolution;
    uniform float cameraNear, cameraFar, strength, outlineStrength, crackStrength;
    uniform vec3 varnish;
    uniform float uTime, uInteractFocus, uSaturation, uTargetDepth, uTargetSpread, uTargetVisible;
    uniform vec4 uFocusRegion;
    uniform float uRings, uAlign, uBubble, uStrawberry, uShock, uInvert, uEat, uGlassCrack, uTouch;
    uniform float uSepia, uDream, uOwl, uAmber, uNoir, uShockRadius, uAlignRadius;
    varying vec2 vUv;
    vec2 hash2(vec2 p) { return fract(sin(vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3)))) * 43758.5453); }
    float depthAt(vec2 uv) {
      float z = texture2D(tDepth, uv).x;
      return cameraNear * cameraFar / (cameraFar - z * (cameraFar - cameraNear));
    }
    vec3 normalAt(vec2 uv) { return texture2D(tNormal, uv).xyz * 2.0 - 1.0; }
    void main() {
      vec2 uvPaint=vUv,radial=vUv-.5;
      float radius=length(radial),rim=smoothstep(.18,.68,radius);
      if(uBubble>.001)uvPaint+=vec2(sin(vUv.y*23.0+uTime*2.4),cos(vUv.x*19.0+uTime*1.9))*.0035*uBubble;
      if(uAlign>.001){
        vec2 r=vUv-uFocusRegion.xy;float d=length(r);
        uvPaint+=normalize(r+vec2(.0001))*sin(d*90.0-uTime*12.0)*.009*uAlign*exp(-pow(d-uAlignRadius*.8,2.0)*70.0);
      }
      if(uShock>.001)uvPaint+=normalize(radial+vec2(.0001))*sin(radius*85.0-uTime*21.0)*.016*uShock*exp(-pow(radius-uShockRadius*.8,2.0)*55.0);
      vec3 original = texture2D(tDiffuse, uvPaint).rgb;
      float aberration=(uBubble*.005+uEat*.018)*rim;
      if(aberration>.00001){
        vec2 shift=normalize(radial+vec2(.0001))*aberration;
        original.r=texture2D(tDiffuse,uvPaint+shift).r;original.b=texture2D(tDiffuse,uvPaint-shift).b;
      }
      float bloom=uInteractFocus*.13+uStrawberry*.65+uDream*.22+uTouch*.2;
      if(bloom+uRings>.001){
        vec2 blur=3.5/resolution+radial*uRings*.025;
        vec3 soft=(texture2D(tDiffuse,uvPaint+blur).rgb+texture2D(tDiffuse,uvPaint-blur).rgb+
          texture2D(tDiffuse,uvPaint+vec2(-blur.x,blur.y)).rgb+texture2D(tDiffuse,uvPaint+vec2(blur.x,-blur.y)).rgb)*.25;
        original=mix(original,soft,clamp(uStrawberry*.42+uRings*.3+uDream*.15,0.0,.6));
        original+=max(soft-vec3(.2),vec3(0.0))*bloom*(.75+.25*sin(uTime*4.0));
      }
      float lum = dot(original, vec3(0.299,0.587,0.114));
      float band = lum * 5.0;
      float stepped = (floor(band) + smoothstep(0.22,0.82,fract(band))) / 5.0;
      vec3 paint = original * mix(1.0, stepped / max(lum,0.025), strength * 0.7);
      vec2 px = 2.0 / resolution;
      float dx = 0.0, dy = 0.0;
      vec3 nx = vec3(0.0), ny = vec3(0.0);
      float centerDepth = depthAt(vUv);
      float focusMask=0.0;
      if(uInteractFocus*uTargetVisible>.001){
        vec2 region=(vUv-uFocusRegion.xy)/max(uFocusRegion.zw,vec2(.02));
        focusMask=exp(-dot(region,region)*1.8)*exp(-max(0.0,abs(centerDepth-uTargetDepth)-uTargetSpread)/max(1.0,uTargetDepth*.1));
      }
      px*=1.0+focusMask*uInteractFocus*.9+uOwl*.45;
      for (int y = -1; y <= 1; y++) {
        for (int x = -1; x <= 1; x++) {
          vec2 uv = vUv + vec2(float(x),float(y)) * px;
          float wx = float(x) * (y == 0 ? 2.0 : 1.0);
          float wy = float(y) * (x == 0 ? 2.0 : 1.0);
          float d = depthAt(uv) / max(centerDepth,1.0);
          dx += d * wx; dy += d * wy;
          vec3 n = normalAt(uv); nx += n * wx; ny += n * wy;
        }
      }
      float edge = smoothstep(0.11,0.7,length(vec2(dx,dy))) + smoothstep(0.65,2.4,length(nx)+length(ny)) * 0.65;
      paint = mix(paint, vec3(0.044,0.023,0.013), clamp(edge,0.0,1.0) * min(.95,outlineStrength+focusMask*uInteractFocus*.4+uOwl*.35));
      vec2 p = gl_FragCoord.xy / 39.0;
      vec2 cell = floor(p), f = fract(p);
      float first = 10.0, second = 10.0;
      for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
        vec2 g = vec2(float(i),float(j));
        float d = length(g + hash2(cell+g) - f);
        if (d < first) { second = first; first = d; } else second = min(second,d);
      }
      float crack = 1.0 - smoothstep(0.008,0.034,second-first);
      float grain = (hash2(gl_FragCoord.xy).x - 0.5) * 0.0025;
      float canvas = sin(gl_FragCoord.x * 2.4) * sin(gl_FragCoord.y * 2.1) * 0.0008;
      float oak = sin(gl_FragCoord.y * 0.13 + sin(gl_FragCoord.x * 0.008)) * 0.0006;
      paint *= 1.0 - crack * (crackStrength+uOwl*.22);
      paint += grain + canvas + oak;
      paint *= mix(vec3(1.0), varnish, 0.10 * strength);
      vec2 q = vUv * (1.0-vUv.yx);
      paint *= mix(0.88,1.0,pow(clamp(q.x*q.y*16.0,0.0,1.0),0.18));
      float luminance=dot(paint,vec3(.299,.587,.114));
      paint=mix(vec3(luminance),paint,uSaturation*(1.0+uEat*.8+uRings*.3+uStrawberry*.35));
      paint=(paint-.18)*(1.0+uRings*.22+uAmber*.3-uDream*.2)+.18;
      paint=mix(paint,paint*vec3(1.16,1.12,.72)+vec3(.025,.015,0.0),uRings*.6);
      paint=mix(paint,paint*vec3(1.18,.94,1.03)+vec3(.04,.012,.02),uStrawberry*.7);
      paint=mix(paint,vec3(luminance)*vec3(1.13,1.04,.84)+vec3(.025,.023,.015),uSepia*.55);
      paint=mix(paint,paint*.88+vec3(.07,.045,.055),uDream*.5);
      paint=mix(paint,paint*vec3(1.25,.95,.65)+vec3(.025,.012,0.0),uAmber*.7);
      if(uNoir>.001){
        float charcoal=smoothstep(0.0,.65,pow(max(dot(paint,vec3(.299,.587,.114)),0.0),.65));
        paint=mix(paint,vec3(charcoal)*vec3(.94,.96,1.0),uNoir*.95);
      }
      paint*=1.0-uOwl*rim*(.25+.12*sin(uTime*3.2));
      float gold=smoothstep(mix(.6,.28,uInteractFocus),.72,radius)*uInteractFocus;
      paint=mix(paint,paint*.7+vec3(.16,.085,.018),gold*.65);
      if(uBubble>.001)paint+=rim*uBubble*(.014+.014*sin(vec3(0.0,2.1,4.2)+uTime+radius*25.0));
      if(uGlassCrack>.001){
        float angle=atan(radial.y,radial.x);
        float fractures=pow(abs(sin(angle*7.0+sin(radius*31.0)*.09)),75.0)*smoothstep(.07,.18,radius);
        paint=mix(paint,vec3(.85,.95,1.0),fractures*uGlassCrack*.95);
      }
      if(uInvert>.001)paint=mix(paint,vec3(1.0)-smoothstep(vec3(.1),vec3(.65),paint),uInvert*.9);
      gl_FragColor = vec4(max(paint,vec3(0.0)),1.0);
    }`,
};

export class BoschOilPass {
  constructor(renderer, scene, camera) {
    Object.assign(this, { renderer, scene, camera });
    this.normalMaterial = new THREE.MeshNormalMaterial();
    this.normalTarget = new THREE.WebGLRenderTarget(1, 1, { depthTexture: new THREE.DepthTexture(1, 1) });
    this.composer = new EffectComposer(renderer);
    this.composer.addPass(new RenderPass(scene, camera));
    this.pass = new ShaderPass(BoschOilShader);
    this.pass.uniforms.tDepth.value = this.normalTarget.depthTexture;
    this.pass.uniforms.tNormal.value = this.normalTarget.texture;
    this.composer.addPass(this.pass);
    this.composer.addPass(new OutputPass());
    this.resize = () => {
      const size = renderer.getSize(new THREE.Vector2());
      const ratio = renderer.getPixelRatio();
      this.composer.setPixelRatio(ratio);
      this.composer.setSize(size.x, size.y);
      this.normalTarget.setSize(Math.ceil(size.x * ratio / 2), Math.ceil(size.y * ratio / 2));
      this.pass.uniforms.resolution.value.set(size.x * ratio, size.y * ratio);
    };
    window.addEventListener('resize', this.resize);
    this.resize();
  }
  render() {
    const { renderer, scene, camera } = this;
    const target = renderer.getRenderTarget();
    const override = scene.overrideMaterial;
    const transparent = [];
    scene.traverse(object => {
      let focused=false;
      for(let parent=object;this.filterTarget&&parent;parent=parent.parent)if(parent===this.filterTarget){focused=true;break;}
      if (object.visible && (object.isMesh || object.isPoints) && (object.material.transparent || object.userData.noOutline) && !focused) {
        transparent.push(object); object.visible = false;
      }
    });
    scene.overrideMaterial = this.normalMaterial;
    renderer.setRenderTarget(this.normalTarget);
    renderer.clear(); renderer.render(scene, camera);
    scene.overrideMaterial = override;
    transparent.forEach(object => { object.visible = true; });
    renderer.setRenderTarget(target);
    this.pass.uniforms.cameraNear.value = camera.near;
    this.pass.uniforms.cameraFar.value = camera.far;
    this.composer.render();
  }
}
