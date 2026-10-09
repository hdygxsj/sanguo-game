import { CanvasTexture, SRGBColorSpace } from 'three';
import type { BattleState } from '../types';
import type { TerrainField } from './terrainField';
import { buildTerritories, countyFill, mapResource, type Point } from './territories';

export function createMapAtlas(state:BattleState,field:TerrainField,territories:ReturnType<typeof buildTerritories>,political:boolean){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=2048;
  const ctx=canvas.getContext('2d')!;const {bounds}=field;
  const px=(x:number)=>(x-bounds.x)/bounds.width*canvas.width;
  const pz=(z:number)=>(z-bounds.z)/bounds.height*canvas.height;
  const path=(points:Point[],close=true)=>{ctx.beginPath();points.forEach(([x,z],i)=>i?ctx.lineTo(px(x),pz(z)):ctx.moveTo(px(x),pz(z)));if(close)ctx.closePath();};
  path(state.map!.outline);ctx.clip();
  if(political){
    const colors=new Map(state.agents.map(a=>[a.id,a.color]));const cities=new Map(state.cities.map(c=>[c.id,c]));
    for(const cell of territories.cells){path(cell.points);ctx.fillStyle=countyFill(cities.get(cell.id)!,colors);ctx.fill();ctx.strokeStyle='rgba(68,57,42,.14)';ctx.lineWidth=.65;ctx.stroke();}
    // Broad, translucent ridge contours remain geographic references in the atlas.
    for(const range of state.map!.ranges){path(range.points,false);ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle='rgba(89,97,73,.07)';ctx.lineWidth=22;ctx.stroke();ctx.strokeStyle='rgba(89,97,73,.12)';ctx.lineWidth=5;ctx.stroke();}
  }else{
    // Geographic surface colours are independent of political ownership.
    for(let z=0;z<2048;z+=4)for(let x=0;x<2048;x+=4){
      const wx=bounds.x+x/2048*bounds.width,wz=bounds.z+z/2048*bounds.height,h=field.height(wx,wz);
      const n=Math.sin(wx*9)*Math.cos(wz*7);
      const rock=Math.min(1,Math.max(0,(h-.2)*2.8));
      ctx.fillStyle=`rgb(${Math.round(115+rock*32+n*5)},${Math.round(127+rock*15+n*5)},${Math.round(92+rock*43+n*5)})`;ctx.fillRect(x,z,4,4);
    }
    for(const city of state.cities){
      const kind=mapResource(city);if(kind!=='farm'&&kind!=='horse')continue;
      const x=px(city.x),z=pz(city.z),w=kind==='farm'?13:19;
      ctx.fillStyle=kind==='farm'?'#a29d69':'#7e956e';ctx.fillRect(x-w*.7,z+5,w,w*.65);
      if(kind==='farm'){ctx.strokeStyle='#737c51';ctx.lineWidth=1;for(let j=0;j<5;j++){ctx.beginPath();ctx.moveTo(x-w*.7,z+6+j*2);ctx.lineTo(x+w*.3,z+6+j*2);ctx.stroke();}}
    }
    ctx.strokeStyle='rgba(54,50,40,.065)';ctx.lineWidth=.65;
    for(const cell of territories.cells){path(cell.points);ctx.stroke();}
  }
  ctx.strokeStyle=political?'rgba(59,50,38,.42)':'rgba(62,53,37,.19)';ctx.lineWidth=political?1.5:1;
  for(const edge of territories.commanderyBorders){path(edge,false);ctx.stroke();}
  for(const river of state.map!.rivers){
    path(river.points,false);ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle=political?'#a6b8b0':'#b5b397';ctx.lineWidth=political?4:8;ctx.stroke();ctx.strokeStyle=political?'#7e9b9c':'#6e9396';ctx.lineWidth=political?2:4;ctx.stroke();
  }
  // Restrained shoreline, clipped inward: no luminous outline or opaque fog.
  path(state.map!.outline);ctx.lineJoin='round';ctx.strokeStyle=political?'rgba(167,167,134,.3)':'rgba(176,171,133,.4)';ctx.lineWidth=9;ctx.stroke();
  ctx.strokeStyle='rgba(110,135,131,.35)';ctx.lineWidth=3;ctx.stroke();
  const texture=new CanvasTexture(canvas);texture.colorSpace=SRGBColorSpace;texture.anisotropy=8;
  return texture;
}
