import {it,expect} from 'vitest';
import {Group,Mesh,BoxGeometry,MeshStandardMaterial} from 'three';
import * as horse from './horseGeometry';
it('bakes horse material colors into one grounded instanced geometry without mutating the source',()=>{
  const root=new Group(),mesh=new Mesh(new BoxGeometry(4,2,1),new MeshStandardMaterial({color:'#805030'}));
  mesh.position.set(3,4,2);root.add(mesh);
  const g=horse.bakeHorseGeometry(root);g.computeBoundingBox();
  expect(g.boundingBox!.min.y).toBeCloseTo(0);
  expect(g.boundingBox!.max.x-g.boundingBox!.min.x).toBeCloseTo(2.2);
  expect(g.getAttribute('color').count).toBe(g.getAttribute('position').count);
  expect(g.getAttribute('color').getX(0)).toBeCloseTo(mesh.material.color.r);
  expect(Array.from(g.getAttribute('normal').array).every(Number.isFinite)).toBe(true);
  expect(mesh.position.toArray()).toEqual([3,4,2]);
  g.dispose();mesh.geometry.dispose();mesh.material.dispose();
});
