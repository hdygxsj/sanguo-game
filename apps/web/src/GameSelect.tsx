import {Children,isValidElement,useEffect,useId,useRef,useState,type ReactNode,type KeyboardEvent} from 'react';
import {createPortal} from 'react-dom';
type Props={children:ReactNode;value?:string|number;disabled?:boolean;'aria-label'?:string;onChange?:(event:{target:{value:string}})=>void};
type Option={value:string;label:string;disabled:boolean};
function text(node:ReactNode):string{return Children.toArray(node).map(n=>isValidElement<{children?:ReactNode}>(n)?text(n.props.children):String(n)).join('');}
export function GameSelect({children,value,disabled,onChange,'aria-label':label}:Props){
  const options=Children.toArray(children).filter(isValidElement).map(node=>{
    const p=node.props as {value?:string|number;children?:ReactNode;disabled?:boolean};
    return {value:String(p.value??text(p.children)),label:text(p.children),disabled:!!p.disabled};
  });
  const selected=options.find(o=>o.value===String(value??''));
  const [open,setOpen]=useState(false),[query,setQuery]=useState(''),[active,setActive]=useState(0);
  const [position,setPosition]=useState({left:0,top:0,width:0,maxHeight:300});
  const trigger=useRef<HTMLButtonElement>(null),popup=useRef<HTMLDivElement>(null),search=useRef<HTMLInputElement>(null),id=useId();
  const filtered=options.filter(o=>o.label.toLocaleLowerCase().includes(query.toLocaleLowerCase()));
  const unavailable=()=>!!disabled||!!trigger.current?.matches(':disabled');
  const close=(focus=false)=>{setOpen(false);if(focus)trigger.current?.focus();};
  const choose=(o:Option)=>{if(o.disabled||unavailable())return;onChange?.({target:{value:o.value}});close(true);};
  const show=()=>{if(unavailable())return;setQuery('');setActive(Math.max(0,options.findIndex(o=>o.value===String(value))));setOpen(true);};
  useEffect(()=>{
    if(!open)return;
    const place=()=>{const r=trigger.current!.getBoundingClientRect(),width=Math.min(Math.max(r.width,240),window.innerWidth-24),height=Math.min(340,window.innerHeight-24);const below=window.innerHeight-r.bottom-12;setPosition({left:Math.max(12,Math.min(r.left,window.innerWidth-width-12)),top:below>=Math.min(height,220)?r.bottom+6:Math.max(12,r.top-height-6),width,maxHeight:below>=Math.min(height,220)?Math.min(height,below):Math.min(height,r.top-18)});};
    const outside=(e:PointerEvent)=>{if(!popup.current?.contains(e.target as Node)&&!trigger.current?.contains(e.target as Node))close();};
    place();search.current?.focus();document.addEventListener('pointerdown',outside);window.addEventListener('resize',place);window.addEventListener('scroll',place,true);
    return ()=>{document.removeEventListener('pointerdown',outside);window.removeEventListener('resize',place);window.removeEventListener('scroll',place,true);};
  },[open]);
  useEffect(()=>{if(disabled)setOpen(false);},[disabled]);
  useEffect(()=>{popup.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView?.({block:'nearest'});},[active]);
  const keyboard=(e:KeyboardEvent)=>{
    if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close(true);}
    else if(e.key==='Tab')close();
    else if(e.key==='ArrowDown'||e.key==='ArrowUp'){
      e.preventDefault();if(!open){show();return;}
      const step=e.key==='ArrowDown'?1:-1;let next=active;
      for(let i=0;i<filtered.length;i++){next=(next+step+filtered.length)%filtered.length;if(!filtered[next]?.disabled)break;}setActive(next);
    }else if(e.key==='Enter'&&open){e.preventDefault();const option=filtered[active];if(option)choose(option);}
  };
  return <><button type="button" className="game-select-trigger" ref={trigger} role="combobox" aria-label={label} aria-expanded={open} aria-controls={open?id:undefined} aria-haspopup="listbox" value={value??''} disabled={disabled} onKeyDown={keyboard} onClick={()=>open?close():show()}><span>{selected?.label||'请选择'}</span><span aria-hidden="true">⌄</span></button>
    {open&&createPortal(<div className="game-select-popup" ref={popup} style={{position:'fixed',...position}} onKeyDown={keyboard} onPointerDown={e=>e.stopPropagation()} onWheel={e=>e.stopPropagation()}>
      <input ref={search} type="search" role="searchbox" aria-label={`搜索${label??'选项'}`} placeholder="输入名称筛选…" value={query} onChange={e=>{setQuery(e.target.value);setActive(0);}} aria-controls={id} aria-activedescendant={filtered[active]?`${id}-${active}`:undefined}/>
      <div role="listbox" id={id} aria-label={`${label??''}选项`}>{filtered.map((o,i)=><button type="button" role="option" id={`${id}-${i}`} data-index={i} data-value={o.value} tabIndex={-1} aria-selected={o.value===String(value)} disabled={o.disabled} className={i===active?'active':''} key={o.value} onPointerMove={()=>setActive(i)} onClick={()=>choose(o)}>{o.label}<span aria-hidden="true">{o.value===String(value)?'✓':''}</span></button>)}{!filtered.length&&<p>没有匹配的选项</p>}</div>
    </div>,document.body)}
  </>;
}
