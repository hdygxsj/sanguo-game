import {it,expect} from 'vitest';
import * as placement from './forestPlacement';
it('places deterministic woodland on low plains, leaving settlement, farm and route clearances',()=>{
  const field={bounds:{x:0,z:0,width:2,height:2},height:()=>.035,contains:(x:number,z:number)=>x>=0&&z>=0&&x<=2&&z<=2};
  const obstacles=[{x:.5,z:.5,radius:.16},{x:1.5,z:.5,radius:.08}];
  const routes=[{a:[0,1] as [number,number],b:[2,1] as [number,number],width:.05}];
  const trees=placement.forestPositions(field,obstacles,routes);
  expect(trees.length).toBeGreaterThan(100);
  expect(trees.length).toBeLessThan(2000);
  expect(placement.forestPositions(field,obstacles,routes)).toEqual(trees);
  for(const tree of trees){
    expect(tree.y).toBe(.035);
    expect(Math.abs(tree.z-1)).toBeGreaterThan(.05);
    for(const obstacle of obstacles)expect(Math.hypot(tree.x-obstacle.x,tree.z-obstacle.z)).toBeGreaterThan(obstacle.radius);
  }
  expect(placement.forestPositions({...field,contains:()=>false},[],[])).toEqual([]);
});
