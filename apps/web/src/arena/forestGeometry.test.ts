import { describe, expect, it } from 'vitest';
import * as forest from './forestGeometry';
import {Group,Mesh,BoxGeometry,MeshStandardMaterial} from 'three';

describe('strategic forest geometry', () => {
  it('batches a Blender tree at the common ground pivot without discarding bark and needle colours',()=>{
    const root=new Group();
    const trunk=new Mesh(new BoxGeometry(.2,3,.2),new MeshStandardMaterial({color:'#614831'}));
    const leaves=new Mesh(new BoxGeometry(2,1,2),new MeshStandardMaterial({color:'#344c35'}));
    trunk.position.y=1.5;leaves.position.y=2.5;root.add(trunk,leaves);
    expect(forest.bakeForestGeometry).toBeTypeOf('function');
    const g=forest.bakeForestGeometry(root);g.computeBoundingBox();
    expect(g.boundingBox!.min.y).toBeCloseTo(0);
    expect(g.boundingBox!.max.y).toBeCloseTo(2);
    expect(new Set([...g.getAttribute('color').array]).size).toBeGreaterThan(3);
    g.dispose();for(const mesh of [trunk,leaves]){mesh.geometry.dispose();mesh.material.dispose();}
  });
  it('provides grounded branching wood and varied finite canopy colours within budget', () => {
    expect(forest.createForestGeometry).toBeTypeOf('function');
    const { canopy, wood } = forest.createForestGeometry();
    for (const geometry of [canopy, wood]) {
      geometry.computeBoundingBox();
      expect(geometry.boundingBox!.min.y).toBeGreaterThanOrEqual(-0.001);
      for (const name of ['position', 'normal']) {
        expect([...geometry.getAttribute(name).array].every(Number.isFinite)).toBe(true);
      }
      expect((geometry.index?.count ?? geometry.getAttribute('position').count) / 3).toBeLessThan(750);
    }
    expect(canopy.boundingBox!.min.y).toBeGreaterThan(.5);
    expect(wood.boundingBox!.max.y).toBeGreaterThan(1.2);
    const colours = canopy.getAttribute('color');
    expect(colours.count).toBe(canopy.getAttribute('position').count);
    expect(new Set([...colours.array]).size).toBeGreaterThan(20);
    canopy.dispose(); wood.dispose();
  });

  it('keeps each tree appearance stable irrespective of visible-list ordering', () => {
    expect(forest.forestAppearance).toBeTypeOf('function');
    const positions: [number, number][] = [[1.2, 3.4], [-1.6, 2.8], [0, 0]];
    const before = positions.map(([x,z]) => forest.forestAppearance(x,z));
    expect([...positions].reverse().map(([x,z]) => forest.forestAppearance(x,z)).reverse()).toEqual(before);
    expect(new Set(before.map(value => value.rotation)).size).toBe(3);
    for (const tree of before) {
      expect(tree.size).toBeGreaterThanOrEqual(.012);
      expect(tree.size).toBeLessThanOrEqual(.018);
    }
  });
});
