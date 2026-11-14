import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export function composite(parts) {
  const matrix = new THREE.Matrix4(), rotation = new THREE.Quaternion();
  const geometries = parts.map(({ geometry, color, position = [0,0,0], scale = [1,1,1], angles = [0,0,0] }) => {
    const painted = geometry.index ? geometry.toNonIndexed() : geometry;
    rotation.setFromEuler(new THREE.Euler(...angles));
    matrix.compose(new THREE.Vector3(...position), rotation, new THREE.Vector3(...scale));
    painted.applyMatrix4(matrix); painted.deleteAttribute('uv');
    if (!painted.attributes.normal) painted.computeVertexNormals();
    const ink = new THREE.Color(color), colors = [];
    for (let i=0;i<painted.attributes.position.count;i++) colors.push(ink.r,ink.g,ink.b);
    painted.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
    if (painted !== geometry) geometry.dispose();
    return painted;
  });
  const geometry = mergeGeometries(geometries);
  geometries.forEach(part => part.dispose());
  geometry.computeBoundingSphere();
  return geometry;
}

export const ball = () => new THREE.OctahedronGeometry(1);
export const cube = () => new THREE.BoxGeometry(1,1,1);
export const cone = () => new THREE.ConeGeometry(1,1,5);
export const cylinder = () => new THREE.CylinderGeometry(1,1,1,6);
export const part = (geometry,color,position,scale,angles) => ({geometry,color,position,scale,angles});

export function installWind(material,time,weight='min(max(position.y,0.0),3.0)',attribute='') {
  if(material.userData.ambientWind)return;
  material.userData.ambientWind=true;
  const compile=material.onBeforeCompile,key=material.customProgramCacheKey();
  material.onBeforeCompile=function(shader,renderer){
    compile.call(this,shader,renderer);shader.uniforms.sceneryTime=time;
    shader.vertexShader=`uniform float sceneryTime;\n${attribute}\n${shader.vertexShader}`;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
      transformed.x += sin(sceneryTime * 0.8 + position.x * .31 + position.z * .17) * .008 * (${weight});`);
  };
  material.customProgramCacheKey=()=>`${key}:wind:${weight}`;
}
