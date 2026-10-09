import {Box3,Mesh,Object3D,Vector3,type BufferGeometry} from 'three';

export const ROCK_MODEL_URL='/models/agent-arena/quarry-outcrop.glb?v=20261008';
export function bakeRockGeometry(root:Object3D):BufferGeometry{
  root.updateMatrixWorld(true);
  const meshes:Mesh[]=[];root.traverse(node=>{if(node instanceof Mesh)meshes.push(node);});
  if(meshes.length!==1)throw Error('Quarry asset must contain exactly one mesh');
  const mesh=meshes[0]!,geometry=mesh.geometry.clone();
  geometry.applyMatrix4(mesh.matrixWorld);
  geometry.computeBoundingBox();
  const bounds=geometry.boundingBox as Box3,center=bounds.getCenter(new Vector3());
  geometry.translate(-center.x,-bounds.min.y,-center.z);
  return geometry;
}
