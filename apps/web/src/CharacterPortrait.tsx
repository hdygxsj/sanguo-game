import {useState} from 'react';
import type {CharacterState} from '../../api/src/domain/types';
import {isMinor} from '../../api/src/domain/lifecycle';
import {GenericPortrait} from './GenericPortrait';

export const PORTRAITS:Record<string,string>={
  '黄忠':'huang-zhong-v1',
  '魏延':'wei-yan-v1',
  '陆逊':'lu-xun-v1',
  '大乔':'da-qiao-v1',
  '小乔':'xiao-qiao-v1',
  '蔡琰':'cai-yan-v1',
  '司马懿':'sima-yi-v1',
  '徐晃':'xu-huang-v1',
  '许褚':'xu-chu-v1',
  '张辽':'zhang-liao-v1',
  '周瑜':'zhou-yu-v1',
  '孙权':'sun-quan-v1',
  '孙尚香':'sun-shangxiang-v1',
  '张飞':'zhang-fei-v1',
  '诸葛亮':'zhuge-liang-v1',
  '黄月英':'huang-yueying-v1',
  '士燮':'shi-xie-v1',
  '士壹':'shi-yi-v1',
  '士徽':'shi-hui-v1',
  '曹操':'cao-cao-v1',
  '荀彧':'xun-yu-v1',
  '卞夫人':'lady-bian-v1',
  '刘备':'liu-bei-v1',
  '关羽':'guan-yu-v1',
  '甘夫人':'lady-gan-v1',
  '孙坚':'sun-jian-v1',
  '程普':'cheng-pu-v1',
  '吴夫人':'lady-wu-v1',
  '董卓':'dong-zhuo-v1',
  '吕布':'lu-bu-v1',
  '貂蝉':'diao-chan-v1',
  '袁绍':'yuan-shao-v1',
  '田丰':'tian-feng-v1',
  '甄宓':'zhen-mi-v1',
  '刘表':'liu-biao-v1',
  '蒯良':'kuai-liang-v1',
  '蔡夫人':'lady-cai-v1',
  '袁术':'yuan-shu-v1',
  '纪灵':'ji-ling-v1',
  '阎象':'yan-xiang-v1',
  '马腾':'ma-teng-v1',
  '马超':'ma-chao-v1',
  '马云禄':'ma-yunlu-v1',
  '刘焉':'liu-yan-v1',
  '吴苋':'wu-xian-v1',
  '赵韪':'zhao-wei-v1',
  '赵云':'zhao-yun-v1',
  '公孙瓒':'gongsun-zan-v1',
  '田楷':'tian-kai-v1',
  '孔融':'kong-rong-v1',
  '王修':'wang-xiu-v1',
  '太史慈':'taishi-ci-v1',
  '陶谦':'tao-qian-v1',
  '陈登':'chen-deng-v1',
  '糜贞':'mi-zhen-v1',
  '张鲁':'zhang-lu-v1',
  '阎圃':'yan-pu-v1',
  '张琪瑛':'zhang-qiying-v1',
  '刘繇':'liu-yao-v1',
  '张英':'zhang-ying-v1',
  '樊能':'fan-neng-v1',
  '张燕':'zhang-yan-v1',
  '于毒':'yu-du-v1',
  '白绕':'bai-rao-v1',
};

export function CharacterPortrait({person}:{person:CharacterState}){
  const [failed,setFailed]=useState('');
  const minor=isMinor(person),file=minor||person.origin==='generated'?undefined:PORTRAITS[person.name];
  const src=file?`/images/portraits/${file}.jpg`:undefined;
  const generic=!minor&&!src&&!!person.origin;
  return <figure className="character-portrait">
    {generic?<GenericPortrait person={person}/>:src&&failed!==src?<img src={src} alt={`${person.name}原创立绘`} width={1024} height={1536}
      loading="lazy" decoding="async" onError={()=>setFailed(src)}/>:<div className="portrait-fallback">
      <span aria-hidden="true">{person.name.slice(0,1)}</span>
      <small>{minor?'幼年人物':src?'立绘暂不可用':'立绘待补'}</small>
    </div>}
    {src&&failed!==src&&<figcaption>原创演绎</figcaption>}
    {generic&&<figcaption>{person.origin==='generated'?'随机武将 · 大众脸':'共用肖像'}</figcaption>}
  </figure>;
}
