import type { CityState } from './types.js';
import {troopUpkeep,type TroopBody} from './troops.js';
import {buildingBudget} from './construction.js';

// Shared by command validation, settlement and AI; money is never created by rounding debt.
export const ECONOMY = { recruitment: 3, development: 20, soldierUpkeep: 0.15 } as const;
export const developmentCost = (level: number) => level * ECONOMY.development;
// Local infrastructure is paid first. Applying loss to gross tax made a large
// civilian realm insolvent even with zero troops and fully developed counties.
export const administrationLoss=(gross:number,count:number,maintenance:number)=>Math.floor(Math.max(0,gross-maintenance)*.75*Math.max(0,count-16)/(count+24));
export function fiscalEstimate(cities: CityState[], fieldTroops=0,armies?:TroopBody[]) {
  const grossRevenue = cities.reduce((sum, c) => sum + c.level * 2 + (c.siteKind&&c.siteKind!=='city'?6:c.resourceTrait?2:0)+buildingBudget(c).revenue, cities.length ? 3 : 0);
  const maintenance = cities.reduce((sum, c) => sum + c.level+buildingBudget(c).maintenance, 0);
  const loss=administrationLoss(grossRevenue,cities.length,maintenance);
  const revenue=grossRevenue-loss;
  const wages = Math.ceil(cities.reduce((sum,c)=>sum+troopUpkeep(c),armies?armies.reduce((sum,a)=>sum+troopUpkeep(a),0):fieldTroops*ECONOMY.soldierUpkeep)-1e-9);
  return { grossRevenue, administrationLoss:loss, revenue, maintenance, wages, net: revenue - maintenance - wages };
}
