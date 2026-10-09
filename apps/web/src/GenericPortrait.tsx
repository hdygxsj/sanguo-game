import {useId} from 'react';
import type {CharacterState} from '../../api/src/domain/types';
import {rosterHash} from '../../api/src/domain/historicalRoster';

/** Lightweight layered shared art: stable face, dress and headwear, no remote image requests. */
export function GenericPortrait({person}:{person:CharacterState}){
 const uid=useId().replace(/:/g,''),seed=person.portraitSeed??rosterHash(person.id+person.name);
 const female=person.sex==='female',scholar=person.archetype==='scholar',hat=(seed>>>3)%3;
 const robe=['#384f50','#60483c','#4a4739','#434858','#583d40','#4e5341'][seed%6]!;
 const skin=['#c5a180','#d6b294','#b48b6b','#d9ba9d'][(seed>>>5)%4]!;
 const face=27+(seed>>>7)%8,eyes=16+(seed>>>9)%5,beard=!female&&!scholar&&(seed>>>11)%3!==0;
 return <svg role="img" aria-label={`${person.name}大众脸`} viewBox="0 0 240 320" width="240" height="320" style={{display:'block',width:'100%',height:'auto'}} data-portrait-seed={seed}>
  <defs>
   <linearGradient id={`${uid}-bg`} x2="1" y2="1"><stop stopColor="#5b6053"/><stop offset="1" stopColor="#252e2b"/></linearGradient>
   <linearGradient id={`${uid}-skin`}><stop stopColor="#967359"/><stop offset=".38" stopColor={skin}/><stop offset="1" stopColor="#ac8466"/></linearGradient>
   <linearGradient id={`${uid}-robe`} x2=".85" y2="1"><stop stopColor={robe}/><stop offset="1" stopColor="#242b2b"/></linearGradient>
  </defs>
  <rect width="240" height="320" fill={`url(#${uid}-bg)`}/>
  <circle cx="120" cy="114" r="88" fill="#c2b789" opacity=".09"/>
  <path d="M0 181 27 138 50 161 77 107 105 167 132 120 171 170 199 130 240 184V320H0Z" fill="#94997c" opacity=".12"/>
  <path d="M12 320 25 239Q35 211 90 201L150 201Q202 213 214 245L231 320Z" fill={`url(#${uid}-robe)`} stroke="#8d8567" strokeWidth="1.5"/>
  <path d="M94 172 94 208 120 236 146 208 146 172" fill={`url(#${uid}-skin)`}/>
  {female&&<path d="M79 119Q65 205 80 236L105 211 146 214 164 235Q178 192 160 113" fill="#262928"/>}
  <ellipse cx={120-face} cy="134" rx="7" ry="13" fill={skin}/><ellipse cx={120+face} cy="134" rx="7" ry="13" fill="#ae886d"/>
  <path d={`M${120-face} 105Q120 73 ${120+face} 105L${119+face} 153Q147 184 120 191Q94 184 ${121-face} 153Z`} fill={`url(#${uid}-skin)`} stroke="#7e6654" strokeWidth=".8"/>
  <path d={`M${120-eyes-10} 126q10 -5 18 -1M${120+eyes-8} 125q10 -4 18 2`} fill="none" stroke="#393732" strokeWidth={female?2:3.7}/>
  <path d={`M${120-eyes-8} 134q8 -5 16 0M${120+eyes-8} 134q8 -5 16 0`} fill="none" stroke="#4a4037" strokeWidth="1.5"/>
  <ellipse cx={120-eyes} cy="133" rx="2.5" ry="2" fill="#292c29"/><ellipse cx={120+eyes} cy="133" rx="2.5" ry="2" fill="#292c29"/>
  <path d="m119 135 -4 19q5 4 11 0" fill="none" stroke="#916e53" strokeWidth="1.5"/>
  <path d="M110 168q10 4 20 -1q-10 7 -20 1" fill={female?'#8b5050':'#835e4e'}/>
  {beard&&<><path d="M119 158q-8 2 -17 9 11 0 18 -4 7 4 17 3-8-6-17-8" fill="#3c3930"/><path d="M97 174Q120 191 143 174L132 199 119 213 108 195Z" fill="#3a3831"/><path d="m112 188 7 18 8-18" fill="none" stroke="#8d7c61" opacity=".5"/></>}
  {female?<><path d="M82 115Q65 71 99 67Q119 40 145 68Q177 75 158 119L145 89Q113 108 92 89Z" fill="#2a2c2a"/><path d="M94 74q27-11 53 1" fill="none" stroke="#af9870" strokeWidth="3"/><circle cx="151" cy="78" r="6" fill="#ac885a"/><path d="m146 69 26-9M87 140v25m67-25v25" stroke="#bd9f67" strokeWidth="2"/><circle cx="87" cy="167" r="3" fill="#9ca88a"/><circle cx="154" cy="167" r="3" fill="#9ca88a"/></>:
   scholar||hat===0?<><path d="M84 110 87 77 103 71 102 45 136 45 138 71 154 78 157 111Q120 97 84 110" fill="#303b38" stroke="#95825e" strokeWidth="2"/><path d="M87 91h68M119 49v45" stroke="#6b7060" strokeWidth="2"/></>:
   hat===1?<><path d="M78 120Q75 59 120 56Q166 63 162 121L149 111 148 91Q120 106 93 91L91 111Z" fill="#565d56" stroke="#9a9274" strokeWidth="2"/><path d="M120 56v40M87 83q34 18 69 0" stroke="#a99c75" strokeWidth="3"/><path d="M119 55q-12-21 6-32l4 31" fill="#6c453b"/></>:
   <><path d="M83 113Q75 77 103 72L102 57 133 57 138 74Q164 77 158 113L146 99 97 99Z" fill="#303633"/><path d="M84 95q36-14 72 0" fill="none" stroke={robe} strokeWidth="12"/><path d="m150 96 26 42-20-6" fill={robe}/></>}
  <path d="M87 202 122 240 158 203 148 229 104 265 77 225Z" fill="#c2b695"/><path d="M82 203 111 239 102 253 72 221M156 204 125 241 144 257 170 222" fill={robe} stroke="#827b61" strokeWidth="1.5"/>
  {!female&&!scholar&&<>{[0,1,2,3].map(row=><path key={row} d={`M35 ${253+row*15}h51m70 0h49`} stroke="#8b8974" strokeWidth="7" opacity=".4"/>)}<path d="M31 239 72 228 90 251 85 311H24M162 251l13-23 35 13 20 70h-67" fill="none" stroke="#a59a79" strokeWidth="2"/></>}
  <path d="M63 258 48 316M185 259l14 57M119 265v55M140 268l-5 52" stroke="#172320" opacity=".45" strokeWidth="3"/>
  <rect x="7" y="7" width="226" height="306" rx="2" fill="none" stroke="#baaa7e" opacity=".4"/>
 </svg>;
}
