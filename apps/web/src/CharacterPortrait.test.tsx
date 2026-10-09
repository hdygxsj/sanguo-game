import {render,screen} from '@testing-library/react';
import {expect,it} from 'vitest';
import {CharacterPortrait} from './CharacterPortrait';
import type {CharacterState} from '../../api/src/domain/types';

const person=(name:string):CharacterState=>({id:'test-person',name,ageYears:30,sex:'male',owner:'agent-1',ruler:false,politics:70,command:70,loyalty:70,governorCityId:null});
it.each([
  ['黄忠','huang-zhong'],['魏延','wei-yan'],['陆逊','lu-xun'],
  ['大乔','da-qiao'],['小乔','xiao-qiao'],['蔡琰','cai-yan'],
  ['司马懿','sima-yi'],['徐晃','xu-huang'],['许褚','xu-chu'],['张辽','zhang-liao'],
  ['周瑜','zhou-yu'],['孙权','sun-quan'],['孙尚香','sun-shangxiang'],
  ['张飞','zhang-fei'],['诸葛亮','zhuge-liang'],['黄月英','huang-yueying'],
  ['曹操','cao-cao'],['荀彧','xun-yu'],['卞夫人','lady-bian'],
  ['士燮','shi-xie'],['士壹','shi-yi'],['士徽','shi-hui'],
  ['刘备','liu-bei'],['关羽','guan-yu'],['甘夫人','lady-gan'],
  ['孙坚','sun-jian'],['程普','cheng-pu'],['吴夫人','lady-wu'],
  ['董卓','dong-zhuo'],['吕布','lu-bu'],['貂蝉','diao-chan'],
  ['袁绍','yuan-shao'],['田丰','tian-feng'],['甄宓','zhen-mi'],
  ['刘表','liu-biao'],['蒯良','kuai-liang'],['蔡夫人','lady-cai'],
  ['袁术','yuan-shu'],['纪灵','ji-ling'],['阎象','yan-xiang'],
  ['马腾','ma-teng'],['马超','ma-chao'],['马云禄','ma-yunlu'],
  ['刘焉','liu-yan'],
  ['吴苋','wu-xian'],
  ['赵韪','zhao-wei'],
  ['赵云','zhao-yun'],
  ['公孙瓒','gongsun-zan'],['田楷','tian-kai'],
  ['孔融','kong-rong'],['王修','wang-xiu'],['太史慈','taishi-ci'],
  ['陶谦','tao-qian'],['陈登','chen-deng'],['糜贞','mi-zhen'],
  ['张鲁','zhang-lu'],['阎圃','yan-pu'],['张琪瑛','zhang-qiying'],
  ['刘繇','liu-yao'],['张英','zhang-ying'],['樊能','fan-neng'],
  ['张燕','zhang-yan'],['于毒','yu-du'],['白绕','bai-rao'],
])('maps %s to its own original artwork', (name,file)=>{
  const view=render(<CharacterPortrait person={{...person(name),owner:null}}/>);
  expect(screen.getByRole('img',{name:`${name}原创立绘`})).toHaveAttribute('src',`/images/portraits/${file}-v1.jpg`);
  view.rerender(<CharacterPortrait person={person(name)}/>);
  expect(screen.getByRole('img',{name:`${name}原创立绘`})).toHaveAttribute('src',`/images/portraits/${file}-v1.jpg`);
});
it('does not substitute another historical figure for a character without artwork',()=>{
  render(<CharacterPortrait person={person('未收录人物')}/>);
  expect(screen.queryByRole('img')).not.toBeInTheDocument();
  expect(screen.getByText('立绘待补')).toBeInTheDocument();
});
it('gives generated officers stable generic faces rather than a named painting',()=>{
 const p={...person('曹操'),origin:'generated' as const,portraitSeed:12345};
 const view=render(<CharacterPortrait person={p}/>);
 const before=screen.getByRole('img',{name:'曹操大众脸'}).outerHTML;
 expect(screen.getByText('随机武将 · 大众脸')).toBeInTheDocument();
 expect(screen.queryByAltText('曹操原创立绘')).not.toBeInTheDocument();
 view.rerender(<CharacterPortrait person={{...p,owner:'agent-2',loyalty:99}}/>);
 expect(screen.getByRole('img',{name:'曹操大众脸'}).outerHTML).toBe(before);
 view.rerender(<CharacterPortrait person={{...p,portraitSeed:9999}}/>);
 expect(screen.getByRole('img',{name:'曹操大众脸'}).outerHTML).not.toBe(before);
});
it('labels generic art for newly included named characters honestly',()=>{
 render(<CharacterPortrait person={{...person('张春华'),sex:'female',origin:'historical'}}/>);
 expect(screen.getByRole('img',{name:'张春华大众脸'})).toBeInTheDocument();
 expect(screen.getByText('共用肖像')).toBeInTheDocument();
});
