import {Box3,Color,Float32BufferAttribute,Mesh,MeshStandardMaterial,Object3D,Vector3} from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

export const HORSE_MODEL_URL='/models/agent-arena/pasture-horse.glb?v=20261008';
export function bakeHorseGeometry(root:Object3D){
  root.updateMatrixWorld(true);
  const box=new Box3().setFromObject(root),center=box.getCenter(new Vector3()),size=box.getSize(new Vector3());
  const scale=2.2/Math.max(size.x,size.z);
  const pieces:import('three').BufferGeometry[]=[];
  root.traverse(node=>{
    if(!(node instanceof Mesh))return;
    const copy=node.geometry.clone(),g=copy.index?copy.toNonIndexed():copy;
    if(g!==copy)copy.dispose();
    g.applyMatrix4(node.matrixWorld);g.translate(-center.x,-box.min.y,-center.z);g.scale(scale,scale,scale);
    for(const name of Object.keys(g.attributes))if(!['position','normal'].includes(name))g.deleteAttribute(name);
    if(!g.getAttribute('normal'))g.computeVertexNormals();
    const material=(Array.isArray(node.material)?node.material[0]:node.material) as MeshStandardMaterial;
    const color=material.color??new Color('#756049'),values=new Float32Array(g.getAttribute('position').count*3);
    for(let i=0;i<values.length;i+=3){values[i]=color.r;values[i+1]=color.g;values[i+2]=color.b;}
    g.setAttribute('color',new Float32BufferAttribute(values,3));pieces.push(g);
  });
  if(!pieces.length)throw Error('Horse asset contains no meshes');
  const result=mergeGeometries(pieces);pieces.forEach(g=>g.dispose());return result;
}
