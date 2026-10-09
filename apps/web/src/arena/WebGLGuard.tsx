import {useEffect,useRef,useState,type ReactNode} from 'react';
export function WebGLGuard({children,fallback}:{children:ReactNode;fallback:ReactNode}){
  const [mode,setMode]=useState<'checking'|'ready'|'failed'>('checking');
  const host=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    const failed=()=>setMode('failed');
    const rejected=(event:PromiseRejectionEvent)=>{
      if(/(?:creating|create).*WebGL context/i.test(String(event.reason?.message??event.reason))){event.preventDefault();failed();}
    };
    const element=host.current;
    element?.addEventListener('webglcontextlost',failed,true);
    element?.addEventListener('webglcontextcreationerror',failed,true);
    window.addEventListener('unhandledrejection',rejected);
    try{
      const probe=document.createElement('canvas').getContext('webgl2');
      if(probe){probe.getExtension('WEBGL_lose_context')?.loseContext();setMode('ready');}
      else failed();
    }catch{failed();}
    return()=>{
      element?.removeEventListener('webglcontextlost',failed,true);
      element?.removeEventListener('webglcontextcreationerror',failed,true);
      window.removeEventListener('unhandledrejection',rejected);
    };
  },[]);
  return <div ref={host} style={{position:'absolute',inset:0}}>{mode==='failed'?fallback:mode==='ready'?children:<span role="status">检查地图渲染环境…</span>}</div>;
}
