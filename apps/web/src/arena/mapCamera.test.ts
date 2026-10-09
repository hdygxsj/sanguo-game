import {expect,it} from 'vitest';
import {OrthographicCamera,Vector3} from 'three';
import {mapCameraView} from './mapCamera';

it('uses an oblique orthographic view at every zoom, with visible building sides',()=>{
  for(const zoom of [1,2,3,5.6,12,32]){
    const view=mapCameraView(zoom,16,12,1200,800);
    const elevation=Math.atan2(view.offset[1],Math.hypot(view.offset[0],view.offset[2]))*180/Math.PI;
    expect(elevation).toBeGreaterThanOrEqual(34.99);
    expect(elevation).toBeLessThanOrEqual(60.01);
    expect(view.offset[0]).toBeGreaterThan(0);
    expect(view.offset[2]).toBeGreaterThan(0);
  }
  expect(mapCameraView(7,16,12,1200,800).elevation).toBeCloseTo(35);
});
it('fits all map corners at overview in wide and narrow viewports and keeps focus centred',()=>{
  for(const [width,height] of [[1200,800],[500,900]]){
    const view=mapCameraView(1,16,12,width!,height!);
    const camera=new OrthographicCamera(-width!/2,width!/2,height!/2,-height!/2,.01,160);
    const target=new Vector3(4,.2,-3);
    camera.position.copy(target).add(new Vector3(...view.offset));camera.lookAt(target);
    camera.zoom=view.scale;camera.updateProjectionMatrix();camera.updateMatrixWorld();
    expect(target.clone().project(camera).lengthSq()).toBeLessThan(1);
    const centre=target.clone().project(camera);expect(centre.x).toBeCloseTo(0);expect(centre.y).toBeCloseTo(0);
    for(const x of [-8,8])for(const z of [-6,6]){
      const corner=target.clone().add(new Vector3(x,0,z)).project(camera);
      expect(Math.abs(corner.x)).toBeLessThanOrEqual(.91);expect(Math.abs(corner.y)).toBeLessThanOrEqual(.91);
    }
  }
});
it('changes angle continuously and reversibly across model handoff',()=>{
  for(let zoom=1;zoom<8;zoom+=.01){
    const a=mapCameraView(zoom,16,12,1200,800),b=mapCameraView(zoom+.01,16,12,1200,800);
    expect(Math.abs(a.elevation-b.elevation)).toBeLessThan(.15);
    expect(mapCameraView(zoom,16,12,1200,800)).toEqual(a);
  }
});
