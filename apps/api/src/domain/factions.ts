import type { Strategy } from './types.js';

// An original Han-era sandbox scenario, not exact borders for a single date.
export const HISTORICAL_FACTIONS: {name:string;commandery:string;color:string;strategy:Strategy}[] = [
  {name:'曹操',commandery:'东郡',color:'#817194',strategy:'balanced'},
  {name:'刘备',commandery:'平原郡',color:'#648b80',strategy:'balanced'},
  {name:'孙坚',commandery:'長沙郡',color:'#a16a60',strategy:'expansion'},
  {name:'袁绍',commandery:'渤海郡',color:'#b5a06a',strategy:'expansion'},
  {name:'袁术',commandery:'南陽郡',color:'#9b8060',strategy:'economic'},
  {name:'董卓',commandery:'河南尹',color:'#735757',strategy:'expansion'},
  {name:'刘表',commandery:'南郡',color:'#67839d',strategy:'defensive'},
  {name:'刘焉',commandery:'廣漢郡',color:'#62816a',strategy:'economic'},
  {name:'马腾',commandery:'武威郡',color:'#a18c79',strategy:'expansion'},
  {name:'公孙瓒',commandery:'右北平郡',color:'#829995',strategy:'balanced'},
  {name:'孔融',commandery:'北海國',color:'#897eaa',strategy:'economic'},
  {name:'张燕',commandery:'常山國',color:'#596b66',strategy:'expansion'},
  {name:'陶谦',commandery:'下邳國',color:'#b68f76',strategy:'defensive'},
  {name:'刘繇',commandery:'丹陽郡',color:'#7a8f52',strategy:'defensive'},
  {name:'张鲁',commandery:'漢中郡',color:'#a888a3',strategy:'balanced'},
  {name:'士燮',commandery:'交趾郡',color:'#548a94',strategy:'economic'},
];
