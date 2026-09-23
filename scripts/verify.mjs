import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const blendPath = path.join(root, 'assets/blender/arena-kit.blend');
const glbPath = path.join(root, 'apps/web/public/models/agent-arena/arena-kit.glb');
const distIndex = path.join(root, 'apps/web/dist/index.html');
const fallbackImage = path.join(root, 'apps/web/public/images/arena-fallback.png');
const requiredRoots = ['village-a', 'village-b', 'fort', 'citadel', 'stronghold', 'imperial', 'mountain', 'grove'];
const requiredMaterials = ['Cedar beams', 'Glazed slate jade', 'Ivory plaster', 'Pine foliage', 'Recessed doorways', 'Roof tile edges', 'Sunlit foliage', 'Weathered limestone', 'Imperial amber glaze', 'Mountain moss', 'Mountain slate'];

function fail(message) {
  console.error(`VERIFY_FAIL ${message}`);
  process.exit(1);
}

for (const file of [blendPath, glbPath, fallbackImage, distIndex]) {
  if (!existsSync(file)) fail(`missing ${path.relative(root, file)}`);
}

const blend = readFileSync(blendPath);
if (!blend.subarray(0, 7).equals(Buffer.from('BLENDER'))) fail('arena-kit.blend is not a Blender file');

const glb = readFileSync(glbPath);
if (glb.readUInt32LE(0) !== 0x46546c67 || glb.readUInt32LE(4) !== 2) fail('arena-kit.glb has an invalid GLB header');
const jsonLength = glb.readUInt32LE(12);
const jsonType = glb.readUInt32LE(16);
if (jsonType !== 0x4e4f534a) fail('arena-kit.glb has no JSON chunk');
const document = JSON.parse(glb.subarray(20, 20 + jsonLength).toString('utf8').trim());
const nodeNames = new Set((document.nodes ?? []).map((node) => node.name));
const materialNames = new Set((document.materials ?? []).map((material) => material.name));
for (const name of requiredRoots) if (!nodeNames.has(name)) fail(`GLB root missing: ${name}`);
for (const name of requiredMaterials) if (!materialNames.has(name)) fail(`GLB material missing: ${name}`);

console.log(`VERIFY_OK roots=${requiredRoots.length} materials=${requiredMaterials.length} glb=${Math.round(glb.length / 1024)}KB`);
