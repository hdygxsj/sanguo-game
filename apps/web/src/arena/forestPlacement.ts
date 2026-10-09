type Field={bounds:{x:number;z:number;width:number;height:number};height:(x:number,z:number)=>number;contains:(x:number,z:number)=>boolean};
type Clearing={x:number;z:number;radius:number};
type Corridor={a:[number,number];b:[number,number];width:number};
export function forestPositions(field:Field,clearings:Clearing[],corridors:Corridor[]):{x:number;y:number;z:number}[]{
  const bins=new Map<string,((x:number,z:number)=>boolean)[]>(),bin=.25;
  const insert=(left:number,top:number,right:number,bottom:number,blocked:(x:number,z:number)=>boolean)=>{
    for(let j=Math.floor(top/bin);j<=Math.floor(bottom/bin);j++)for(let i=Math.floor(left/bin);i<=Math.floor(right/bin);i++){
      const key=`${i},${j}`,list=bins.get(key)??[];list.push(blocked);bins.set(key,list);
    }
  };
  for(const c of clearings)insert(c.x-c.radius,c.z-c.radius,c.x+c.radius,c.z+c.radius,(x,z)=>(x-c.x)**2+(z-c.z)**2<=c.radius*c.radius);
  for(const {a,b,width} of corridors){
    const dx=b[0]-a[0],dz=b[1]-a[1],length2=dx*dx+dz*dz;
    insert(Math.min(a[0],b[0])-width,Math.min(a[1],b[1])-width,Math.max(a[0],b[0])+width,Math.max(a[1],b[1])+width,(x,z)=>{
      const t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(length2||1)));
      return (x-a[0]-dx*t)**2+(z-a[1]-dz*t)**2<=width*width;
    });
  }
  const hash=(x:number,z:number)=>{const n=Math.sin(x*127.1+z*311.7)*43758.5453;return n-Math.floor(n);};
  const result:{x:number;y:number;z:number}[]=[],b=field.bounds;
  // A jittered world grid prevents clumps of coincident crowns. Cap candidates,
  // not survivors, so maps with many exclusions never create unbounded work.
  const spacing=Math.max(.047,Math.sqrt(b.width*b.height/80000));
  for(let j=0;j<b.height/spacing;j++)for(let i=0;i<b.width/spacing;i++){
    const x=b.x+(i+.18+.64*hash(i,j))*spacing,z=b.z+(j+.18+.64*hash(i+71,j+23))*spacing;
    const grove=.5+.25*Math.sin(x*12+Math.sin(z*5))+.25*Math.cos(z*10-x*3);
    if(hash(i+17,j+51)>.12+grove*.67||!field.contains(x,z))continue;
    if((bins.get(`${Math.floor(x/bin)},${Math.floor(z/bin)}`)??[]).some(blocked=>blocked(x,z)))continue;
    const y=field.height(x,z),e=.004;
    const slope=Math.hypot((field.height(x+e,z)-field.height(x-e,z))/(2*e),(field.height(x,z+e)-field.height(x,z-e))/(2*e));
    if(slope>1.35||y>.72)continue;
    result.push({x,y,z});
  }
  return result;
}
