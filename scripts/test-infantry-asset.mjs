import {readFileSync,existsSync} from 'node:fs';
import assert from 'node:assert/strict';
import {test} from 'node:test';

test('Blender infantry ships with readable equipment and a grounded, bounded GLB',()=>{
  const url=new URL('../apps/web/public/models/agent-arena/han-infantry.glb',import.meta.url);
  assert.ok(existsSync(url),'Blender infantry GLB must exist');
  const file=readFileSync(url);
  assert.equal(file.readUInt32LE(0),0x46546c67);
  assert.equal(file.readUInt32LE(4),2);
  assert.ok(file.length<150000,`GLB exceeds 150 KB: ${file.length}`);
  const json=JSON.parse(file.subarray(20,20+file.readUInt32LE(12)).toString());
  const names=json.materials.map(m=>m.name);
  for(const name of ['iron-lamellar','linen-tunic','leather','skin','spear-wood'])assert.ok(names.includes(name),name);
  let triangles=0,minY=Infinity,maxY=-Infinity;
  for(const mesh of json.meshes)for(const p of mesh.primitives){
    const pos=json.accessors[p.attributes.POSITION];
    assert.ok(p.attributes.NORMAL!==undefined);
    minY=Math.min(minY,pos.min[1]);maxY=Math.max(maxY,pos.max[1]);
    triangles+=(p.indices===undefined?pos.count:json.accessors[p.indices].count)/3;
  }
  assert.ok(triangles>1000&&triangles<12000,`triangle budget ${triangles}`);
  assert.ok(Math.abs(minY)<.005,`ground pivot ${minY}`);
  assert.ok(maxY>2&&maxY<2.8,`spear height ${maxY}`);
});
