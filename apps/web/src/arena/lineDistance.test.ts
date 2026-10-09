import {expect,it} from 'vitest';
import {lineDistance} from './lineDistance';
it('matches exhaustive segment distances including zero-length segments and the legacy cap',()=>{
  const lines=[{points:[[0,0],[1,2],[1,2],[-3,4]] as [number,number][]}];
  const query=lineDistance(lines);
  for(let x=-5;x<=5;x+=.25)for(let z=-5;z<=5;z+=.25){
    let expected=100;
    for(const line of lines)for(let i=1;i<line.points.length;i++){
      const a=line.points[i-1]!,b=line.points[i]!,dx=b[0]-a[0],dz=b[1]-a[1];
      const t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz||1)));
      expected=Math.min(expected,Math.hypot(x-a[0]-t*dx,z-a[1]-t*dz));
    }
    expect(query(x,z)).toBeCloseTo(expected,12);
  }
  expect(query(1000,1000)).toBe(100);
  expect(lineDistance([])(0,0)).toBe(100);
});
