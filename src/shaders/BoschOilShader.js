import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

export const BoschOilShader = {
  uniforms: {
    tDiffuse: { value: null }, tDepth: { value: null }, tNormal: { value: null },
    resolution: { value: new THREE.Vector2() }, cameraNear: { value: 0.1 }, cameraFar: { value: 2000 },
    strength: { value: 0.72 }, varnish: { value: new THREE.Color('#f5e1b5') },
    outlineStrength: { value: 0.35 }, crackStrength: { value: 0.075 },
  },
  vertexShader: `varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse, tDepth, tNormal;
    uniform vec2 resolution;
    uniform float cameraNear, cameraFar, strength, outlineStrength, crackStrength;
    uniform vec3 varnish;
    varying vec2 vUv;
    vec2 hash2(vec2 p) { return fract(sin(vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3)))) * 43758.5453); }
    float depthAt(vec2 uv) {
      float z = texture2D(tDepth, uv).x;
      return cameraNear * cameraFar / (cameraFar - z * (cameraFar - cameraNear));
    }
    vec3 normalAt(vec2 uv) { return texture2D(tNormal, uv).xyz * 2.0 - 1.0; }
    void main() {
      vec3 original = texture2D(tDiffuse, vUv).rgb;
      float lum = dot(original, vec3(0.299,0.587,0.114));
      float band = lum * 5.0;
      float stepped = (floor(band) + smoothstep(0.22,0.82,fract(band))) / 5.0;
      vec3 paint = original * mix(1.0, stepped / max(lum,0.025), strength * 0.7);
      vec2 px = 2.0 / resolution;
      float dx = 0.0, dy = 0.0;
      vec3 nx = vec3(0.0), ny = vec3(0.0);
      float centerDepth = depthAt(vUv);
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
      paint = mix(paint, vec3(0.044,0.023,0.013), clamp(edge,0.0,1.0) * outlineStrength);
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
      paint *= 1.0 - crack * crackStrength;
      paint += grain + canvas + oak;
      paint *= mix(vec3(1.0), varnish, 0.10 * strength);
      vec2 q = vUv * (1.0-vUv.yx);
      paint *= mix(0.88,1.0,pow(clamp(q.x*q.y*16.0,0.0,1.0),0.18));
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
      if (object.visible && (object.isMesh || object.isPoints) && (object.material.transparent || object.userData.noOutline)) {
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
