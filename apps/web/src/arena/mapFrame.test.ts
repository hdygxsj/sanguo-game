import {expect,it} from 'vitest';
import {mapNeedsFrame} from './mapFrame';
const settled={zoom:7,desired:7,focusDistance:0,modelOpacity:1,modelTarget:1,lodFading:false};
it('stops a settled scene but keeps camera, model and county transitions running',()=>{
 expect(mapNeedsFrame(settled)).toBe(false);
 for(const patch of [{desired:8},{focusDistance:.01},{modelOpacity:.5},{lodFading:true}])expect(mapNeedsFrame({...settled,...patch})).toBe(true);
 expect(mapNeedsFrame({...settled,zoom:7.000001,focusDistance:1e-7,modelOpacity:.999999})).toBe(false);
 expect(mapNeedsFrame({...settled,modelOpacity:.5,modelTarget:0})).toBe(true);
});
