import type {BattleState,CityState,BuildingType} from '../domain/types.js';
import {fiscalEstimate,administrationLoss,developmentCost} from '../domain/economy.js';
import {buildingBudget,buildingCost} from '../domain/construction.js';

export function investmentContext(state:BattleState,owner:string){
  const cities=state.cities.filter(c=>c.owner===owner),budget=fiscalEstimate(cities);
  return {count:cities.length,gross:budget.grossRevenue,maintenance:budget.maintenance,loss:budget.administrationLoss};
}
export function investmentReturn(city:CityState,building:BuildingType|undefined,context:ReturnType<typeof investmentContext>){
  const next={...city,buildings:{...city.buildings}};
  if(building)next.buildings[building]=(next.buildings[building]??0)+1;else next.level++;
  const before=buildingBudget(city),after=buildingBudget(next);
  const grossDelta=(next.level-city.level)*2+after.revenue-before.revenue;
  const maintenanceDelta=next.level-city.level+after.maintenance-before.maintenance;
  const income=grossDelta-(administrationLoss(context.gross+grossDelta,context.count,context.maintenance+maintenanceDelta)-context.loss)-maintenanceDelta;
  return {income,cost:building?buildingCost(city,building):developmentCost(city.level)};
}
export function completedInvestmentValue(state:BattleState,owner:string){
  const cities=state.cities.filter(c=>c.owner===owner);
  const budget=fiscalEstimate(cities);
  let gross=0,maintenance=0;
  for(const city of cities){const b=buildingBudget(city);gross+=b.revenue;maintenance+=b.maintenance;}
  return (gross-budget.administrationLoss+administrationLoss(budget.grossRevenue-gross,cities.length,budget.maintenance-maintenance)-maintenance)*.08;
}
