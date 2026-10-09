import {expect,it} from 'vitest';
import {findTerrainRoad,roadPosition} from './terrainRoad.js';
const field={bounds:{x:-2,z:-2,width:4,height:4},height:(x:number,z:number)=>Math.max(0,1-Math.abs(x)*5)*Math.max(0,1-Math.abs(z)),contains:(x:number,z:number)=>Math.abs(x)<=2&&Math.abs(z)<=2};
it('detours around a steep ridge and every sampled segment respects the grade limit',()=>{
  const path=findTerrainRoad(field,[-1,0],[1,0]);
  expect(path).not.toBeNull();expect(path!.points.some(p=>Math.abs(p[1])>.7)).toBe(true);
  expect(path!.length).toBeGreaterThan(2);
  for(let i=1;i<path!.points.length;i++){
    const a=path!.points[i-1]!,b=path!.points[i]!;
    expect(Math.abs(field.height(...b)-field.height(...a))/Math.hypot(b[0]-a[0],b[1]-a[1])).toBeLessThanOrEqual(.451);
  }
});
it('returns no road across an unbroken impassable cliff instead of a straight fallback',()=>{
  expect(findTerrainRoad({...field,height:(x:number)=>x<0?0:2},[-1,0],[1,0])).toBeNull();
});
it('places marching troops by travelled path distance rather than endpoint interpolation',()=>{
  expect(roadPosition([[0,0],[0,1],[3,1]],.5)).toEqual([1,1]);
  expect(roadPosition([[3,1],[0,1],[0,0]],.5)).toEqual([1,1]);
});
