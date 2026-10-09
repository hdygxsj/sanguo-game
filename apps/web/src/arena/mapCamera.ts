import {transitionAt} from './mapTransition';

// Elevation is measured above the ground, not down from the vertical.
export const MAP_CAMERA={farElevation:60,nearElevation:35,azimuth:25,distance:30,padding:.9};
export function mapCameraView(zoom:number,mapWidth:number,mapHeight:number,viewportWidth:number,viewportHeight:number,config=MAP_CAMERA){
  const radians=Math.PI/180;
  const elevation=config.farElevation+(config.nearElevation-config.farElevation)*transitionAt(zoom).detail;
  const pitch=elevation*radians,yaw=config.azimuth*radians;
  const horizontal=Math.cos(pitch)*config.distance;
  const offset:[number,number,number]=[Math.sin(yaw)*horizontal,Math.sin(pitch)*config.distance,Math.cos(yaw)*horizontal];
  // Fit rotated bounds at overview; keep this base scale fixed during angle changes.
  const projectedWidth=Math.abs(Math.cos(yaw))*mapWidth+Math.abs(Math.sin(yaw))*mapHeight;
  const projectedHeight=Math.sin(config.farElevation*radians)*(Math.abs(Math.sin(yaw))*mapWidth+Math.abs(Math.cos(yaw))*mapHeight);
  const fit=Math.min(viewportWidth/projectedWidth,viewportHeight/projectedHeight)*config.padding;
  return {offset,elevation,scale:fit*zoom};
}
