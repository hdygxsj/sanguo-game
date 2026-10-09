import type {CharacterState} from './types.js';
import {rosterHash} from './historicalRoster.js';
const SURNAMES='赵 钱 孙 李 周 吴 郑 王 冯 陈 褚 卫 蒋 沈 韩 杨 朱 秦 尤 许 何 吕 施 张 孔 曹 严 华 魏 陶 姜 戚 谢 邹 喻 柏 窦 章 苏 潘 葛 范 彭 鲁 韦 马 苗 方 任 袁 鲍 史 唐 费 廉 岑 薛 雷 贺 倪 汤 滕 殷 罗 毕 郝 邬 安 常 傅 卞 康 伍 余 顾 孟 平 黄 和 穆 萧 尹 姚 邵 湛 汪 祁 毛 狄 米 贝 明 臧'.split(' ');
const GIVEN='承 怀 仲 伯 子 文 武 昭 景 元 绍 弘 孝 志 德 信 远 宁 修 敬 守 义 勇 宏 宽 仁 定 玄 佑 衡 毅 谦 肃 昱 朗 岳 维 达 靖 庆 尧 钧 霖 卓 彦 雄 康 安'.split(' ');
export function createRandomOfficers(seed:string,excluded:readonly string[],count=48):CharacterState[]{
 let n=rosterHash(`${seed}:officers-v1`);const next=()=>{n=(n+0x6d2b79f5)>>>0;let t=Math.imul(n^(n>>>15),n|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};
 const pick=(list:string[])=>list[Math.floor(next()*list.length)]!;
 const used=new Set(excluded),people:CharacterState[]=[];
 for(let attempt=0;people.length<Math.min(48,Math.max(0,count))&&attempt<10000;attempt++){
  const name=pick(SURNAMES)+pick(GIVEN)+pick(GIVEN);if(used.has(name))continue;used.add(name);
  people.push({id:`random-v1-${people.length+1}`,name,sex:'male',origin:'generated',archetype:'general',portraitSeed:Math.floor(next()*0xffffffff),
   politics:30+Math.floor(next()*46),command:50+Math.floor(next()*39),ageYears:18+Math.floor(next()*33),owner:null,ruler:false,loyalty:55,governorCityId:null});
 }
 return people;
}
