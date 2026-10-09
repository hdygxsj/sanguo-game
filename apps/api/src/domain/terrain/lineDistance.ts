export function lineDistance(lines:{points:[number,number][]}[]){
  const segments=lines.flatMap(line=>line.points.slice(1).map((b,i)=>{
    const a=line.points[i]!,dx=b[0]-a[0],dz=b[1]-a[1];
    return {x:a[0],z:a[1],dx,dz,length2:dx*dx+dz*dz||1};
  }));
  return (x:number,z:number)=>{
    let best2=10000;
    for(const s of segments){
      const px=x-s.x,pz=z-s.z,t=Math.max(0,Math.min(1,(px*s.dx+pz*s.dz)/s.length2));
      const dx=px-t*s.dx,dz=pz-t*s.dz;
      best2=Math.min(best2,dx*dx+dz*dz);
    }
    return Math.sqrt(best2);
  };
}
