import type {CharacterState} from './types.js';

// Cross-era history/literature sandbox, not a same-year historical census.
// Skill values are original game balancing, not historical measurements.
const GROUPS = [
 ['general','male',`夏侯惇 夏侯渊 曹仁 曹洪 曹纯 曹休 曹真 曹彰 曹丕 曹叡 曹爽 夏侯霸 夏侯尚 夏侯威 夏侯惠 夏侯和 于禁 乐进 李典 典韦 庞德 文聘 臧霸 牛金 郝昭 满宠 郭淮 陈泰 王双 王凌 毌丘俭 文钦 文鸯 诸葛诞 邓艾 邓忠 钟会 司马师 司马昭 司马炎 羊祜 杜预 王濬 王浑 胡奋 牵招 田豫 朱灵 路招 张郃 高览 颜良 文丑 淳于琼 韩猛 蒋义渠 麴义 高干 审荣 眭元 何仪 黄邵 刘辟 龚都 管亥 张角 张宝 张梁 华雄 李傕 郭汜 张济 张绣 樊稠 徐荣 胡轸 李肃 高顺 张任 严颜 吴懿 张翼 张嶷 王平 马岱 关平 关兴 张苞 关索 廖化 周仓 赵统 赵广 刘封 孟达 刘禅 姜维 夏侯恩 陈式 傅肜 傅佥 向宠 罗宪 霍峻 霍弋 李恢 马忠 孟获 兀突骨 木鹿大王 沙摩柯 朵思大王 董荼那 阿会喃 朱桓 朱然 韩当 黄盖 祖茂 蒋钦 周泰 陈武 董袭 凌统 凌操 潘璋 徐盛 丁奉 丁封 孙策 孙韶 孙桓 孙翊 孙匡 孙静 孙贲 孙辅 孙瑜 孙皎 孙奂 孙峻 孙綝 全琮 贺齐 甘宁 吕蒙 陆抗 诸葛恪 滕胤 朱异 吕岱 留赞 吕范 潘濬 贺达 步协 陆凯 陆绩 王颀 田畴 公孙度 公孙康 公孙恭 公孙渊 韩遂 程银 侯选 梁兴 成宜 李堪 张横 杨秋 马玩 韩玄 刘度 赵范 金旋 刘璋 刘琦 刘琮 黄祖 王朗 严白虎 许贡 笮融 桥蕤 李丰 雷薄 陈兰`],
 ['scholar','male',`郭嘉 荀攸 贾诩 程昱 刘晔 蒋济 董昭 钟繇 华歆 王司徒 王允 陈群 陈宫 杨修 司马孚 辛毗 辛评 杜袭 赵俨 王粲 陈琳 阮瑀 刘桢 应玚 徐干 刘馥 司马朗 毛玠 崔琰 邢颙 杜畿 高柔 韩浩 何晏 丁谧 桓范 司马望 傅嘏 荀勖 钟毓 华佗 管辂 许劭 祢衡 蔡邕 郑玄 卢植 皇甫嵩 朱儁 何进 何苗 卢毓 陈寔 陈纪 荀谌 许攸 沮授 审配 逢纪 郭图 荀悦 荀爽 杨彪 杨奉 韩馥 韩嵩 蒯越 伊籍 傅巽 刘先 宋忠 蔡瑁 张允 苏飞 庞统 徐庶 法正 张松 糜竺 糜芳 简雍 孙乾 马良 马谡 蒋琬 费祎 董允 董和 李严 刘巴 许靖 秦宓 谯周 杨仪 邓芝 宗预 费诗 王累 黄权 李福 邓方 尹默 杜琼 许慈 胡潜 孟光 来敏 郤正 鲁肃 张昭 张纮 顾雍 步骘 严畯 程秉 薛综 虞翻 骆统 阚泽 诸葛瑾 是仪 韦昭 顾谭 顾承 张温 吾粲 朱据 孙邵 华核 陶璜 士祗 杨阜 杨昂 杨任 杨柏 韩暨 赵岐 韦康 张既 成公英 贾逵 逢习`],
 ['court','female',`张春华 步练师 孙鲁班 孙鲁育 徐夫人 潘淑 王元姬 夏侯徽 辛宪英 杜夫人 尹夫人 邹夫人 何太后 伏寿 董贵人 曹节 曹宪 曹华 刘夫人 袁夫人 祝融 花鬘 鲍三娘 关银屏 吕玲绮 夏侯氏 冯方女 张星彩 滕芳兰 全惠解 郭女王 毛皇后 郭太后 羊徽瑜`],
] as const;

export function rosterHash(text:string){let n=2166136261;for(const c of text)n=Math.imul(n^c.charCodeAt(0),16777619);return n>>>0;}
export function expandedHistoricalCharacters():CharacterState[]{
 // Avoid aliases of characters already in the base roster or elsewhere in this list.
 const aliases=new Set(['王司徒']);
 return GROUPS.flatMap(([archetype,sex,names])=>names.split(' ').filter(name=>!aliases.has(name)).map(name=>{
  const h=rosterHash(name),general=archetype==='general',scholar=archetype==='scholar';
  return {id:`historic-${h.toString(16)}`,name,sex,archetype,origin:'historical' as const,
   politics:scholar?78+h%19:general?42+h%34:65+h%27,
   command:general?76+(h>>>5)%20:scholar?40+(h>>>5)%36:35+(h>>>5)%40,
   owner:null,ruler:false,ageYears:24+h%25,loyalty:55,governorCityId:null};
 }));
}
