/** Saves and simulation store whole hundred-person companies, not individuals. */
export const SOLDIERS_PER_COMPANY=100;
export const peopleFromCompanies=(companies:number)=>companies*SOLDIERS_PER_COMPANY;
export const formatTroops=(companies:number)=>peopleFromCompanies(companies).toLocaleString('zh-CN');
export const companiesFromPeople=(people:number)=>Number.isSafeInteger(people)&&people>0&&people%SOLDIERS_PER_COMPANY===0?people/SOLDIERS_PER_COMPANY:null;
