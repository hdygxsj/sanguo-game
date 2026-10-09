import type {Object3D} from 'three';
import {bakeHorseGeometry} from './horseGeometry';

export const INFANTRY_MODEL_URL='/models/agent-arena/han-infantry.glb?v=20261008';
export const ARCHER_MODEL_URL='/models/agent-arena/han-archer.glb?v=20261008';
export const SWORD_MODEL_URL='/models/agent-arena/han-swordsman.glb?v=20261008';
export const CAVALRY_MODEL_URL='/models/agent-arena/han-cavalry.glb?v=20261008';
export function bakeInfantryGeometry(root:Object3D,targetHeight=2){
  // Reuse the established material-to-vertex-colour batching contract. Infantry
  // uses height rather than the pasture asset's horizontal-size convention.
  const geometry=bakeHorseGeometry(root);geometry.computeBoundingBox();
  const height=geometry.boundingBox!.max.y-geometry.boundingBox!.min.y;
  const scale=targetHeight/Math.max(height,.0001);geometry.scale(scale,scale,scale);
  return geometry;
}
