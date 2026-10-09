import {expect,it} from 'vitest';
import {simplified,simplifyPresentation} from './simplified';
it('converts historical display text without touching ids, coordinates or the original save',()=>{
  const source={seed:'漢陽',cities:[{id:1,name:'長沙縣',province:'揚州',commandery:'廣漢郡',x:2,owner:'漢陽'}],message:'軍隊進入鄴縣'};
  const view=simplifyPresentation(source);
  expect(view.cities[0]).toEqual({...source.cities[0],name:'长沙县',province:'扬州',commandery:'广汉郡'});
  expect(view.message).toBe('军队进入邺县');
  expect(view.seed).toBe('漢陽');expect(source.cities[0]!.name).toBe('長沙縣');
  expect(simplified('馬場與礦產')).toBe('马场与矿产');
});
