import { BufferGeometry, CylinderGeometry, Float32BufferAttribute, IcosahedronGeometry, Quaternion, Vector3 } from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import type {Object3D} from 'three';
import {bakeHorseGeometry} from './horseGeometry';

export const FOREST_MODEL_URL='/models/agent-arena/shan-shui-pine.glb?v=20261008';
export function bakeForestGeometry(root:Object3D){
  const geometry=bakeHorseGeometry(root);geometry.computeBoundingBox();
  const height=geometry.boundingBox!.max.y-geometry.boundingBox!.min.y;
  const scale=2/Math.max(height,.0001);geometry.scale(scale,scale,scale);return geometry;
}

/** Fixed world-space seed: culling/reordering must not change a tree's silhouette. */
export function forestAppearance(x: number, z: number) {
  const raw = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  const seed = raw - Math.floor(raw);
  return {
    size: .012 + seed * .006,
    rotation: seed * Math.PI * 2,
    color: ['#e0e7d7', '#eff1df', '#d7e3d8', '#ece7d2'][Math.floor(seed * 4)],
  };
}

/** Seven overlapping asymmetric crowns, batched once and instanced by the map. */
export function createForestGeometry(): { canopy: BufferGeometry; wood: BufferGeometry } {
  const crowns: [number, number, number, number, number, number][] = [
    [0, 1.65, 0, .52, .67, .48],
    [-.48, 1.28, .05, .47, .42, .43],
    [.46, 1.4, .16, .5, .48, .4],
    [-.12, 1.27, -.48, .44, .4, .43],
    [.05, 1.08, .44, .47, .36, .43],
    [-.32, 1.78, -.17, .34, .4, .32],
    [.3, 1.89, -.19, .34, .36, .36],
  ];
  const leaves = crowns.map(([cx, cy, cz, sx, sy, sz], crown) => {
    const geometry = new IcosahedronGeometry(1, 1);
    const positions = geometry.getAttribute('position');
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i), y = positions.getY(i), z = positions.getZ(i);
      const irregularity = 1 + .12 * Math.sin(x * 9 + z * 7 + y * 11 + crown * 2);
      positions.setXYZ(i, cx + x * sx * irregularity, cy + y * sy * irregularity, cz + z * sz * irregularity);
    }
    geometry.deleteAttribute('normal');
    geometry.deleteAttribute('uv');
    const smooth = mergeVertices(geometry);
    geometry.dispose();
    smooth.computeVertexNormals();
    const p = smooth.getAttribute('position'), colours = [];
    for (let i = 0; i < p.count; i++) {
      const shade = .68 + .12 * p.getY(i) + .045 * Math.sin(p.getX(i) * 14 + p.getZ(i) * 9);
      colours.push(shade * .96, shade, shade * .88);
    }
    smooth.setAttribute('color', new Float32BufferAttribute(colours, 3));
    return smooth;
  });
  const canopy = mergeGeometries(leaves);
  leaves.forEach(part => part.dispose());
  const branches = new Array<BufferGeometry>();
  const limb = (start: Vector3, end: Vector3, radius: number) => {
    const direction = end.clone().sub(start);
    const geometry = new CylinderGeometry(radius * .48, radius, direction.length(), 6);
    geometry.applyQuaternion(new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), direction.normalize()));
    geometry.translate(...start.clone().add(end).multiplyScalar(.5).toArray());
    branches.push(geometry);
  };
  limb(new Vector3(0, 0, 0), new Vector3(-.05, 1.65, 0), .1);
  for (const [x, y, z] of crowns.slice(1, 5)) {
    limb(new Vector3(0, .6, 0), new Vector3(x, y, z), .048);
  }
  const wood = mergeGeometries(branches);
  branches.forEach(part => part.dispose());
  // Flatten the tilted trunk's root cap onto the same ground plane as the map.
  const roots = wood.getAttribute('position');
  for (let i = 0; i < roots.count; i++) roots.setY(i, Math.max(0, roots.getY(i)));
  wood.computeVertexNormals();
  canopy.computeBoundingSphere(); wood.computeBoundingSphere();
  return { canopy, wood };
}
