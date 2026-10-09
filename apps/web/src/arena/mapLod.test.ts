import { describe,it,expect } from 'vitest';
import { BoxGeometry,InstancedMesh,Matrix4,MeshBasicMaterial,Raycaster,Vector3 } from 'three';
import { fadeCounty,refreshInstanceBounds,retainLodSlots } from './mapLod';
describe('map LOD regression safeguards',()=>{
  it('fades individual counties both ways without popping or frame-rate dependence',()=>{
    const entering=fadeCounty(0,true,1/60);expect(entering).toBeGreaterThan(0);expect(entering).toBeLessThan(.15);
    expect(fadeCounty(1,false,1/60)).toBeGreaterThan(.85);
    let x=0;for(let i=0;i<60;i++)x=fadeCounty(x,true,1/60);expect(x).toBeCloseTo(fadeCounty(0,true,1),10);
    const reverse=fadeCounty(x,false,1/60);expect(reverse).toBeLessThan(x);expect(reverse).toBeGreaterThan(.8);
  });
  it('keeps instanced city picking valid after moving to another region',()=>{
    const geometry=new BoxGeometry(),material=new MeshBasicMaterial(),mesh=new InstancedMesh(geometry,material,1);
    mesh.setMatrixAt(0,new Matrix4());refreshInstanceBounds(mesh);mesh.updateMatrixWorld();
    const ray=new Raycaster(new Vector3(0,0,4),new Vector3(0,0,-1));expect(ray.intersectObject(mesh)).not.toHaveLength(0);
    mesh.setMatrixAt(0,new Matrix4().makeTranslation(20,0,0));refreshInstanceBounds(mesh);
    ray.set(new Vector3(20,0,4),new Vector3(0,0,-1));expect(ray.intersectObject(mesh)).not.toHaveLength(0);
    geometry.dispose();material.dispose();mesh.dispose();
  });
  it('does not evict visible models or reuse stale opacity during rapid region changes',()=>{
    const alpha=new Map([[1,1],[2,.5],[99,1]]);
    const next=retainLodSlots([{id:1},{id:2}],[{id:3},{id:4}],alpha,2);
    expect(next.map(c=>c.id)).toEqual([1,2]);expect(alpha.has(99)).toBe(false);
    alpha.set(1,.001);alpha.set(2,.001);
    expect(retainLodSlots(next,[{id:3},{id:4}],alpha,2).map(c=>c.id)).toEqual([3,4]);
    expect(alpha.has(1)).toBe(false);expect(alpha.has(2)).toBe(false);
  });
});
