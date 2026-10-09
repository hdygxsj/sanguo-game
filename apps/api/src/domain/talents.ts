import type {CharacterState} from './types.js';

// Cross-era sandbox roster. Attributes and adult ages are gameplay settings,
// not claims about a single historical year or authenticated biographies.
const TALENTS:[string,'male'|'female',number,number][]=[
  ['张飞','male',48,96],['诸葛亮','male',98,91],['周瑜','male',88,97],
  ['司马懿','male',94,94],['孙权','male',91,82],['黄忠','male',58,93],
  ['魏延','male',57,90],['陆逊','male',92,95],['徐晃','male',66,91],
  ['许褚','male',42,92],['张辽','male',75,95],['黄月英','female',94,71],
  ['孙尚香','female',72,88],['大乔','female',85,60],['小乔','female',83,62],
  ['蔡琰','female',95,45],
];
export function createTalents():CharacterState[]{
  return TALENTS.map(([name,sex,politics,command],index)=>({id:`talent-${index+1}`,name,sex,politics,command,
    owner:null,ruler:false,ageYears:30,loyalty:55,governorCityId:null}));
}
export const talentCost=(person:CharacterState)=>40+Math.ceil(Math.max(person.politics,person.command)/2);
