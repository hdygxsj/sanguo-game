/** Keep rendering through transitions, then release the GPU until the next input. */
export function mapNeedsFrame(view:{zoom:number;desired:number;focusDistance:number;modelOpacity:number;modelTarget:number;lodFading:boolean}){
 return Math.abs(view.zoom-view.desired)>.0001||view.focusDistance>.00001||Math.abs(view.modelOpacity-view.modelTarget)>.0001||view.lodFading;
}
