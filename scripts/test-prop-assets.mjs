import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {test} from 'node:test';

for(const [name,budget,materials] of [
  ['pasture-horse',60000,['horse-chestnut','horse-muzzle','horse-mane-hooves']],
  ['quarry-outcrop',20000,['quarry-stone']],
  ['han-infantry',150000,['iron-lamellar','linen-tunic','leather','skin','spear-wood']],
  ['han-archer',150000,['iron-lamellar','linen-tunic','leather','skin','spear-wood']],
  ['han-swordsman',150000,['iron-lamellar','linen-tunic','leather','skin','spear-wood']],
  ['han-cavalry',200000,['iron-lamellar','horse-chestnut','saddle-leather']],
  ['shan-shui-pine',60000,['pine-bark','pine-needles','pine-tips']],
])test(`${name} ships compressed, grounded geometry with original materials`,()=>{
  const file=readFileSync(new URL(`../apps/web/public/models/agent-arena/${name}.glb`,import.meta.url));
  assert.equal(file.readUInt32LE(0),0x46546c67);
  assert.equal(file.readUInt32LE(4),2);
  assert.equal(file.readUInt32LE(8),file.length);
  assert.ok(file.length<budget,`${file.length} exceeds ${budget}`);
  const doc=JSON.parse(file.subarray(20,20+file.readUInt32LE(12)).toString());
  assert.ok(doc.extensionsRequired?.includes('KHR_draco_mesh_compression'));
  for(const material of materials)assert.ok(doc.materials.some(m=>m.name===material),material);
  let triangles=0,minY=Infinity;
  for(const mesh of doc.meshes)for(const primitive of mesh.primitives){
    assert.ok(primitive.extensions?.KHR_draco_mesh_compression);
    assert.ok(primitive.attributes.NORMAL!==undefined);
    const pos=doc.accessors[primitive.attributes.POSITION];
    assert.ok(pos.min.every(Number.isFinite)&&pos.max.every(Number.isFinite));
    minY=Math.min(minY,pos.min[1]);
    triangles+=(primitive.indices===undefined?pos.count:doc.accessors[primitive.indices].count)/3;
  }
  assert.ok(triangles>100&&triangles<(name==='han-cavalry'?22000:12000),`triangle budget: ${triangles}`);
  assert.ok(Math.abs(minY)<.01,`ground height: ${minY}`);
});
