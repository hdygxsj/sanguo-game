import { HAN_REGISTER } from './hanRegister.js';
import { CHINA_MAP, project, onLand } from './chinaMap.js';
import type { CityState } from './types.js';
import {campaignSelection,resourceCounty} from './campaignSelection.js';

// Approximate commandery centres in register order. County-level positions below
// are explicitly schematic, not archaeological/geocoded county-seat claims.
const CENTRES: [number, number][] = [
  [112.5,34.7],[113,35.2],[111,35.1],[110.9,34.5],[108.9,34.3],[109.1,34.8],[107.8,34.4],
  [113.5,34.1],[114.4,33],[115.6,34.5],[116.7,33.7],[114.9,33.7],[117,35.6],
  [114.6,36.3],[115.1,37.2],[114.5,38.2],[115,38.8],[115.6,38.1],[116.1,38.5],[115.8,37.1],[114.5,36.8],[117,38.3],
  [114.4,34.8],[115.2,35.8],[116.3,35.9],[116.6,35.4],[117.1,36.2],[116.5,36.5],[116,35.3],[115.5,35.1],
  [118.3,34.8],[118.5,35.6],[117.2,34.3],[119.4,32.5],[118,33.9],
  [117.1,36.8],[116.4,37.2],[118.1,37.1],[119.1,36.7],[120.4,37.2],[118.3,36.7],
  [112.5,33],[112.2,30.3],[114.4,30.7],[111.6,26.3],[113,25.8],[111.6,29],[113,28.2],
  [116.8,32.6],[118.9,31.7],[117.1,31.1],[120.6,30],[120.6,31.3],[115.9,28.7],
  [107,33.1],[106.5,29.6],[104.8,31],[104.1,30.7],[103.8,29.3],[106.8,26.5],[102.3,27.9],[102.8,25],[99.2,25.1],[104.4,32.7],[102.5,30.3],[103.5,28.1],
  [104.6,35],[105.7,34.6],[104.9,33.4],[103.8,36.1],[106.2,35.6],[107.8,36],[102.6,37.9],[100.5,38.9],[98.5,39.7],[94.7,40.1],[100,40],[101.1,41.9],
  [113.1,36.2],[112.5,37.9],[109.7,37.5],[110.8,38],[108.2,40.6],[111.2,40.3],[112.4,40.2],[112.9,39.1],[107.2,40.9],
  [115.9,39.5],[116.4,39.9],[114.6,39.4],[115.5,40.4],[117.1,40.1],[118.4,40],[119.8,40.6],[123.2,41.3],[124.1,41.8],[125.7,39],[121.2,41.3],
  [113.3,23.1],[111.3,23.5],[110.1,23.1],[109.2,21.7],[105.9,21.3],[105.8,19.8],[107,16.8],
];
if (CENTRES.length !== HAN_REGISTER.length) throw new Error('HAN_CENTRE_REGISTER_MISMATCH');

export function historicGeography(random: () => number,mode:'full'|'campaign'='full') {
  const cities: CityState[] = [];
  const selection=mode==='campaign'?campaignSelection():null;
  const commanderies = HAN_REGISTER.map((record, index) => {
    const [lon, lat] = CENTRES[index]!;
    const seatId = cities.length;
    const ids: number[] = [];
    const ordered = [...(selection?.[index]??record.counties)].sort((a, b) => Number(b === record.seat) - Number(a === record.seat));
    ordered.forEach((name, countyIndex) => {
      const angle = countyIndex * 2.399963 + index * 0.73;
      const radius = countyIndex === 0 ? 0 : .15 + .65 * Math.sqrt(countyIndex / ordered.length);
      let [x, z] = project(lon + Math.cos(angle) * radius, lat + Math.sin(angle) * radius * .7);
      const centre = project(lon,lat);
      for (let attempt=0; attempt<12 && !onLand(x,z); attempt++) {
        x=(x+centre[0])/2; z=(z+centre[1])/2;
      }
      if (!onLand(x,z)) throw new Error(`COMMANDERY_OUTSIDE_MAP:${record.name}`);
      const id = cities.length;
      ids.push(id);
      const terrain = random() < .3 ? 'farmland' : random() < .18 ? 'mine' : 'plain';
      cities.push({ id, name, x, z, adjacent: [], province: record.province,
        commandery: record.name, commanderyId: index, seat: countyIndex === 0,
        coordinateQuality: 'schematic', terrain, weather: 'clear',
        resourceTrait: terrain === 'farmland' ? 'granary' : terrain === 'mine' ? 'ore-vein' : null,
        owner: null, troops: 4 + Math.floor(random() * 5), level: countyIndex === 0 ? 2 : 1,
        defenseMultiplier: countyIndex === 0 ? 1.24 : 1.12, imperial: name === '雒陽縣',
      });
      if(selection){
        const city=cities.at(-1)!;
        city.siteKind='city';city.terrain='plain';city.resourceTrait=null;
        // Each commandery's last secondary site is an independently held estate.
        if(countyIndex>0&&name===resourceCounty(ordered)){
          const kind=index%3===0?'farm':index%3===1?'mine':'horse';
          city.siteKind=kind;city.name=`${name.replace(/[縣國邑]$/,'')}${kind==='farm'?'农庄':kind==='mine'?'矿场':'马场'}`;
          city.terrain=kind==='farm'?'farmland':kind==='mine'?'mine':'plain';
          city.resourceTrait=kind==='farm'?'granary':kind==='mine'?'ore-vein':'horse-pasture';
          city.defenseMultiplier=1.04;
        }
      }
    });
    return { id: index, name: record.name, province: record.province, seatId, countyIds: ids, point: project(lon, lat) };
  });
  const connect = (a: number, b: number) => {
    if (a === b) return;
    if (!cities[a]!.adjacent.includes(b)) cities[a]!.adjacent.push(b);
    if (!cities[b]!.adjacent.includes(a)) cities[b]!.adjacent.push(a);
  };
  const distance = (a: number, b: number) => Math.hypot(cities[a]!.x - cities[b]!.x, cities[a]!.z - cities[b]!.z);
  // Every county has two nearest neighbours plus a spanning connection to an
  // earlier county. Each commandery is connected; no unreachable decorative nodes.
  for (const group of commanderies) {
    group.countyIds.forEach((id, i) => {
      const nearest = group.countyIds.filter(n => n !== id).sort((a, b) => distance(id,a) - distance(id,b));
      nearest.slice(0,2).forEach(n => connect(id,n));
      if (i > 0) connect(id, [...group.countyIds.slice(0,i)].sort((a,b) => distance(id,a)-distance(id,b))[0]!);
    });
  }
  const seats = commanderies.map(g => g.seatId);
  seats.forEach(id => seats.filter(n => n !== id).sort((a,b) => distance(id,a)-distance(id,b)).slice(0,3).forEach(n => connect(id,n)));
  // Prim spanning tree across seats guarantees one connected national graph.
  const connected = new Set([seats[0]!]);
  while (connected.size < seats.length) {
    let best: [number,number,number] = [0,0,Infinity];
    for (const a of connected) for (const b of seats) if (!connected.has(b) && distance(a,b) < best[2]) best = [a,b,distance(a,b)];
    connect(best[0],best[1]); connected.add(best[1]);
  }
  return { cities, map: { ...CHINA_MAP,id:selection?`${CHINA_MAP.id}-campaign-300`:CHINA_MAP.id, commanderies, countyCount: cities.length,
    note: selection?'300处战略据点：保留郡治与重要县城，农庄、矿场和马场需分别占领。位置、道路与资源配置为游戏示意。':'东汉郡县名录全量收录；非公元190年逐年考订。郡治位置为近似值，县级点位与道路为游戏示意。' } };
}
