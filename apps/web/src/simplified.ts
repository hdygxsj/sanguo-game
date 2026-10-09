import {Converter} from 'opencc-js/t2cn';
const convert=Converter({from:'t',to:'cn'});
const cache=new Map<string,string>();
export function simplified(text:string){
  let result=cache.get(text);
  if(result===undefined){result=convert(text);if(cache.size>10000)cache.clear();cache.set(text,result);}
  return result;
}
const displayKeys=new Set(['name','title','province','commandery','note','message','description']);
// Work on response copies only: save keys, ids, coordinates and simulation are untouched.
export function simplifyPresentation<T>(value:T):T{
  if(Array.isArray(value))return value.map(v=>simplifyPresentation(v)) as T;
  if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([key,v])=>[key,typeof v==='string'&&displayKeys.has(key)?simplified(v):simplifyPresentation(v)])) as T;
  return value;
}
