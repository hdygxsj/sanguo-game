import {BoxGeometry,Float32BufferAttribute,Group,Mesh,MeshStandardMaterial} from 'three';
import {expect,it} from 'vitest';
import {bakeRockGeometry} from './rockGeometry';
it('grounds a transformed rock while preserving baked colors and source geometry',()=>{
  const scene=new Group(),geometry=new BoxGeometry(2,2,1);
  geometry.setAttribute('color',new Float32BufferAttribute(Array(geometry.getAttribute('position').count*3).fill(.23),3));
  const mesh=new Mesh(geometry,new MeshStandardMaterial());mesh.position.set(4,5,6);scene.add(mesh);
  const before=Array.from(geometry.getAttribute('position').array);
  const baked=bakeRockGeometry(scene);baked.computeBoundingBox();
  expect(baked.boundingBox!.min.y).toBeCloseTo(0);
  expect(baked.boundingBox!.max.x-baked.boundingBox!.min.x).toBeCloseTo(2);
  expect(baked.getAttribute('color').getX(0)).toBeCloseTo(.23);
  expect(Array.from(geometry.getAttribute('position').array)).toEqual(before);
  expect(Array.from(baked.getAttribute('normal').array).every(Number.isFinite)).toBe(true);
});
