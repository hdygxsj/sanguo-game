import { BufferGeometry, Float32BufferAttribute, Color } from 'three';
import type { BattleState } from '../types';
import type { TerrainField } from './terrainField';
import { mapResource } from './territories';
import {settlementWidths} from './settlementGrading';

// World-space colour detail never magnifies the overview atlas's texels.
export const LAND_DETAIL_GLSL=`
varying vec3 landPosition;
varying vec3 landSurfaceNormal;
uniform float detailWeight;
float landHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}
float landNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(landHash(i),landHash(i+vec2(1,0)),f.x),mix(landHash(i+vec2(0,1)),landHash(i+vec2(1,1)),f.x),f.y);}
float landSlope(){
 return 1.0-abs(normalize(landSurfaceNormal).y);
}
float landMicroHeight(vec2 p){
 float small=1.0-smoothstep(.25,1.1,length(fwidth(p*140.0)));
 return .0011*landNoise(p*35.0)+.0004*landNoise(p*140.0)*small;
}
vec3 landDetailNormal(vec3 n,vec3 viewPosition){
 vec3 sx=dFdx(viewPosition),sy=dFdy(viewPosition);
 vec3 rx=cross(sy,n),ry=cross(n,sx);
 float determinant=dot(sx,rx);
 float height=detailWeight * landMicroHeight(landPosition.xz);
 vec3 gradient=dFdx(height)*rx+dFdy(height)*ry;
 return normalize(max(abs(determinant),.000000001)*n-sign(determinant)*gradient);
}
vec3 groundColour(){
 vec2 p=landPosition.xz;
 float broad=landNoise(p*7.0),soilPatch=landNoise(p*23.0),fine=landNoise(p*70.0);
 float fineWeight=1.0-smoothstep(.2,1.2,length(fwidth(p*70.0)));
 float stone=max(smoothstep(.10,.40,landSlope()),smoothstep(.36,.72,landPosition.y)*.7);
 vec3 grass=mix(vec3(.085,.132,.068),vec3(.16,.205,.11),smoothstep(.05,.95,broad));
 vec3 soil=vec3(.225,.195,.13);
 vec3 earth=mix(grass,soil,smoothstep(.45,.95,soilPatch)*.3);
 earth=mix(earth,mix(vec3(.16,.18,.16),vec3(.285,.29,.25),soilPatch),stone);
 return earth*(.94+.12*landNoise(p*19.0)+.06*(fine-.5)*fineWeight);
}`;
export function injectLandDetail(shader:{vertexShader:string;fragmentShader:string}){
  shader.vertexShader='varying vec3 landPosition;\nvarying vec3 landSurfaceNormal;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nlandPosition=position; landSurfaceNormal=normal;');
  shader.fragmentShader=LAND_DETAIL_GLSL+'\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.rgb=mix(diffuseColor.rgb,groundColour(),detailWeight);');
  shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>','#include <normal_fragment_maps>\nnormal = landDetailNormal(normal, -vViewPosition);');
}

export function farmPoint(city:{id:number;x:number;z:number},u:number,v:number):[number,number]{
  const seed=((Math.imul(city.id+1,2654435761)>>>0)%1009)/1009;
  const angle=(seed-.5)*1.1,c=Math.cos(angle),s=Math.sin(angle);
  const x=(u-.5)*.095*(.88+.12*Math.sin(Math.PI*v))+.003*Math.sin(v*Math.PI*2+seed*6);
  const z=(v-.5)*.07+.004*Math.sin(u*Math.PI)*(1+.2*seed);
  return [city.x+.0075+x*c-z*s,city.z+.08+x*s+z*c];
}

export function chooseFarmAnchor(city:{id:number;x:number;z:number},field:Pick<TerrainField,'height'|'contains'>,water:(x:number,z:number)=>boolean,towns:{x:number;z:number;width:number}[]){
  const phase=(city.id%12)*Math.PI/6;
  for(const radius of [.12,.18,.24])for(let direction=0;direction<12;direction++){
    const angle=phase+direction*Math.PI/6,cx=city.x+Math.cos(angle)*radius,cz=city.z+Math.sin(angle)*radius;
    if(towns.some(t=>Math.hypot(cx-t.x,cz-t.z)<t.width*.71+.06))continue;
    // farmPoint includes its original local offset; move only the visual plot,
    // never the county or its resource/production data.
    const anchor={...city,x:cx-.0075,z:cz-.08};
    let valid=true;
    for(let i=0;i<=4&&valid;i++)for(let j=0;j<=4;j++){
      const [x,z]=farmPoint(anchor,i/4,j/4),e=.004;
      const slope=Math.hypot((field.height(x+e,z)-field.height(x-e,z))/(2*e),(field.height(x,z+e)-field.height(x,z-e))/(2*e));
      if(!field.contains(x,z)||slope>.45||water(x,z)){valid=false;break;}
    }
    if(valid)return anchor;
  }
  // A steep mountain county still retains its resource icon and production;
  // do not paint a vertical cultivated field when there is no suitable land.
  return null;
}

type RiverPoint=[number,number];
export function riverSections(points:RiverPoint[]){
  const sampled:RiverPoint[]=[];
  for(let j=1;j<points.length;j++){
    const a=points[j-1]!,b=points[j]!,length=Math.hypot(b[0]-a[0],b[1]-a[1]);
    if(length<1e-9)continue;
    if(!sampled.length)sampled.push([...a]);
    const steps=Math.ceil(length/.018);
    for(let i=1;i<=steps;i++)sampled.push(i===steps?[...b]:[a[0]+(b[0]-a[0])*i/steps,a[1]+(b[1]-a[1])*i/steps]);
  }
  const direction=(a:RiverPoint,b:RiverPoint):RiverPoint=>{
    const length=Math.hypot(b[0]-a[0],b[1]-a[1]);return [-(b[1]-a[1])/length,(b[0]-a[0])/length];
  };
  return sampled.map((point,i)=>{
    const before=direction(sampled[Math.max(0,i-1)]!,sampled[Math.max(1,i)]!);
    const after=direction(sampled[Math.min(sampled.length-2,i)]!,sampled[Math.min(sampled.length-1,i+1)]!);
    const x=before[0]+after[0],z=before[1]+after[1],length=Math.hypot(x,z);
    const normal:RiverPoint=length<1e-6?before:[x/length,z/length];
    return {point,normal};
  });
}

export function createTerrainDetails(state:Pick<BattleState,'cities'|'map'>,field:TerrainField){
  const positions:number[]=[],colours:number[]=[];
  const vertex=(x:number,z:number,color:Color,lift=.008)=>{positions.push(x,field.height(x,z)+lift,z);colours.push(color.r,color.g,color.b);};
  const quad=(a:[number,number],b:[number,number],c:[number,number],d:[number,number],color:Color,lift=.008)=>{for(const p of [a,c,b,a,d,c])vertex(p[0],p[1],color,lift);};
  // Sample along the same river centreline used to carve the height field.
  // Multiple narrow bands provide clean banks without stretching raster pixels.
  for(const river of state.map!.rivers){
    const sections=riverSections(river.points);
    for(let i=1;i<sections.length;i++){
      const a=sections[i-1]!,b=sections[i]!,[x,z]=a.point,[xx,zz]=b.point;
      if(!field.contains(x,z)||!field.contains(xx,zz))continue;
      const offsets=[-.032,-.021,-.015,.015,.021,.032],colors=['#858e6b','#8e9b82','#668b92','#668b92','#8e9b82','#858e6b'].map(c=>new Color(c));
      const bank=(x:number,z:number)=>1+.12*Math.sin(x*19+z*13)+.05*Math.sin(x*61-z*47),start=bank(x,z),end=bank(xx,zz);
      for(let k=0;k<5;k++){
        const edge=(s:typeof a,width:number,offset:number):RiverPoint=>[s.point[0]+s.normal[0]*offset*width,s.point[1]+s.normal[1]*offset*width];
        const corners=[edge(a,start,offsets[k]!),edge(b,end,offsets[k]!),edge(b,end,offsets[k+1]!),edge(a,start,offsets[k+1]!)];
        for(const n of [0,2,1,0,3,2]){const p=corners[n]!;vertex(p[0],p[1],colors[k+(n>=2?1:0)]!,.009);}
      }
    }
  }
  const widths=settlementWidths(state.cities),towns=state.cities.map(c=>({x:c.x,z:c.z,width:widths.get(c.id)!}));
  const segments=state.map!.rivers.flatMap(r=>r.points.slice(1).map((b,i)=>({a:r.points[i]!,b})));
  const water=(x:number,z:number)=>segments.some(({a,b})=>{
    const dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz||1)));
    return Math.hypot(x-a[0]-t*dx,z-a[1]-t*dz)<.04;
  });
  for(const city of state.cities){
    if(mapResource(city)!=='farm')continue;
    const anchor=chooseFarmAnchor(city,field,water,towns);
    if(!anchor)continue;
    // Curved contour rows, varied orientation and a narrow cross-plot footpath.
    // Keep the existing county anchor and terrain sampling; no texture pixels.
    for(let row=0;row<14;row++)for(let col=0;col<6;col++){
      const u0=col/6+(col===3?.013:0),u1=(col+1)/6-(col===2?.013:0);
      const a=farmPoint(anchor,u0,row/14),b=farmPoint(anchor,u1,row/14),c=farmPoint(anchor,u1,(row+1)/14),d=farmPoint(anchor,u0,(row+1)/14);
      if(![a,b,c,d].every(p=>field.contains(p[0],p[1])))continue;
      quad(a,b,c,d,new Color(row%2?'#92956c':'#82895e'),.011);
    }
  }
  const geometry=new BufferGeometry();geometry.setAttribute('position',new Float32BufferAttribute(positions,3));geometry.setAttribute('color',new Float32BufferAttribute(colours,3));geometry.computeVertexNormals();geometry.computeBoundingSphere();return geometry;
}
