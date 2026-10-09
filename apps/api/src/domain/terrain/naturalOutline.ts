type Point=[number,number];
/** Visual coastline detail after the cartogram warp. Only grows outward;
 * settlement coordinates, ownership and road graph remain unchanged. */
export function naturalOutline(input:Point[]):Point[]{
  let points=input.filter((p,i)=>i===0||Math.hypot(p[0]-input[i-1]![0],p[1]-input[i-1]![1])>1e-8);
  if(points.length>1&&Math.hypot(points[0]![0]-points.at(-1)![0],points[0]![1]-points.at(-1)![1])<1e-8)points=points.slice(0,-1);
  // The projection subdivides straight edges: remove only truly collinear cuts
  // so noise envelopes do not restart every few pixels along the same edge.
  points=points.filter((p,i)=>{const a=points[(i+points.length-1)%points.length]!,b=points[(i+1)%points.length]!;return Math.abs((p[0]-a[0])*(b[1]-p[1])-(p[1]-a[1])*(b[0]-p[0]))>1e-9;});
  if(points.length<3)return input.map(p=>[...p]);
  const area=points.reduce((s,p,i)=>{const n=points[(i+1)%points.length]!;return s+p[0]*n[1]-n[0]*p[1];},0),sign=area>=0?1:-1;
  return points.flatMap((a,i)=>{
    const b=points[(i+1)%points.length]!,dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz),steps=Math.max(1,Math.ceil(length/.1));
    return Array.from({length:steps},(_,j):Point=>{
      const t=j/steps,x=a[0]+dx*t,z=a[1]+dz*t;
      const noise=.52+.28*Math.sin(x*5.3+z*3.7)+.2*Math.sin(x*13.1-z*7.9);
      const taper=Math.min(1,t*length/.25,(1-t)*length/.25);
      const offset=Math.min(.2,length*.12)*noise*taper*taper;
      return [x+sign*dz/length*offset,z-sign*dx/length*offset];
    });
  });
}
