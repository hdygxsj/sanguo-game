import { describe,it,expect } from 'vitest';
import { searchKey } from './countySearch';
describe('county search across source spellings',()=>{
  it('matches common simplified names to the preserved register spelling',()=>{
    for(const [source,query] of [['荊州長沙郡','长沙'],['司隸雒陽縣','洛阳县'],['益州漢中郡','汉中']]) {
      expect(searchKey(source!).includes(searchKey(query!))).toBe(true);
    }
  });
});
