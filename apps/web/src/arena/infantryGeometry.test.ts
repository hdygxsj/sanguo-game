import {it,expect} from 'vitest';
import {Group,Mesh,BoxGeometry,MeshStandardMaterial} from 'three';
import * as infantry from './infantryGeometry';
it('keeps the archer body at the spearman scale instead of stretching it to spear height',()=>{
  const root=new Group();root.add(new Mesh(new BoxGeometry(.4,1.73,.3),new MeshStandardMaterial()));
  const g=infantry.bakeInfantryGeometry(root,2*1.73/2.58);g.computeBoundingBox();
  expect(g.boundingBox!.max.y).toBeCloseTo(2*1.73/2.58);g.dispose();
});

it('bakes infantry into a grounded two-metre coloured batch without changing source transforms',()=>{
  const root=new Group(),body=new Mesh(new BoxGeometry(1,4,1),new MeshStandardMaterial({color:'#52605b'}));
  body.position.set(3,5,2);root.add(body);
  const g=infantry.bakeInfantryGeometry(root);g.computeBoundingBox();
  expect(g.boundingBox!.min.y).toBeCloseTo(0);
  expect(g.boundingBox!.max.y).toBeCloseTo(2);
  expect(g.boundingBox!.getCenter(body.position.clone()).x).toBeCloseTo(0);
  expect(g.getAttribute('color').count).toBe(g.getAttribute('position').count);
  expect(g.getAttribute('color').getX(0)).toBeCloseTo(body.material.color.r);
  expect(Array.from(g.getAttribute('normal').array).every(Number.isFinite)).toBe(true);
  expect(body.position.toArray()).toEqual([3,5,2]);
  g.dispose();body.geometry.dispose();body.material.dispose();
});
