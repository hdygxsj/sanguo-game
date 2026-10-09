import {expect,it} from 'vitest';
import {formatTroops,companiesFromPeople,peopleFromCompanies} from './troopScale.js';
it('converts a hundred-person formation without changing stored troop quantities',()=>{
  expect(formatTroops(36)).toBe('3,600');expect(peopleFromCompanies(6)).toBe(600);
  expect(companiesFromPeople(500)).toBe(5);
  expect(companiesFromPeople(501)).toBeNull();expect(companiesFromPeople(0)).toBeNull();expect(companiesFromPeople(NaN)).toBeNull();
});
