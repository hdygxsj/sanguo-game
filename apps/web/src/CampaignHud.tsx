import {ArrowLeftOutlined,FlagOutlined,TeamOutlined,CrownOutlined,BankOutlined,UserOutlined,GlobalOutlined,BellOutlined,HistoryOutlined,QuestionCircleOutlined,PlayCircleOutlined,PauseOutlined,ForwardOutlined,GoldOutlined} from '@ant-design/icons';
import type {BattleState} from './types';
import {CharacterPortrait} from './CharacterPortrait';
import {rankName} from '../../api/src/domain/kingdom';
import './campaign-hud.css';
export type CampaignPanel='armies'|'agents'|'ruler'|'kingdom'|'personnel'|'diplomacy'|'events'|'replay'|'construction';
const tools=[['armies','军队',FlagOutlined],['agents','势力',TeamOutlined],['ruler','君主',CrownOutlined],['kingdom','国策',BankOutlined],['personnel','人物',UserOutlined],['diplomacy','外交',GlobalOutlined],['events','事件',BellOutlined],['replay','回放',HistoryOutlined]] as const;
export function CampaignHud({state,playerId,panel,onPanel,onBack,onRules,onTurn,busy,locked,autoRun,onAuto}:{state:BattleState;playerId:string|null;panel:CampaignPanel|null;onPanel:(p:CampaignPanel)=>void;onBack:()=>void;onRules?:()=>void;onTurn:()=>void;busy:boolean;locked:boolean;autoRun:boolean;onAuto:()=>void}){
 const player=state.agents.find(a=>a.id===playerId),ruler=state.characters?.find(c=>c.owner===playerId&&c.ruler);
 return <>
  <header className="campaign-hud" aria-label="战役总览">
   <section className="faction-hud" aria-label="势力概况">
    <button className="hud-back" aria-label="返回战局" title="返回战局" onClick={onBack}><ArrowLeftOutlined/></button>
    <button className="hud-ruler" aria-label="查看君主" onClick={()=>onPanel('ruler')}>{ruler?<CharacterPortrait person={ruler}/>:<CrownOutlined/>}</button>
    <div><small>第 {Math.floor(state.turn/4)+1} 年 · {['春','夏','秋','冬'][state.turn%4]}</small><h2>{player?.name??'天下观战'} <span>{player?rankName(state,player.id):'群雄逐鹿'}</span></h2>
     <div className="hud-resources">{player?<><span title="国库"><GoldOutlined/> {Math.round(state.resources[player.id]??0)}</span><span title="控制据点"><BankOutlined/> {state.cities.filter(c=>c.owner===player.id).length}</span><span title="名望"><CrownOutlined/> {state.polities?.[player.id]?.prestige??0}</span></>:<span>第 {state.turn} 回合 · {state.agents.filter(a=>a.active).length} 方势力</span>}</div>
    </div>
   </section>
   <nav className="campaign-command-ring" aria-label="战局工具">{tools.map(([key,label,Icon])=><button key={key} aria-label={label} title={label} aria-expanded={panel===key} onClick={()=>onPanel(key)}><Icon/><span>{label}</span>{key==='diplomacy'&&state.diplomaticOffers?.some(o=>o.to===playerId)&&<i className="hud-notification"/>}</button>)}{onRules&&<button aria-label="规则" title="规则" onClick={onRules}><QuestionCircleOutlined/><span>规则</span></button>}</nav>
  </header>
  <section className="campaign-turn-dock" aria-label="回合控制"><small>第 {state.turn} 回合</small><button className="turn-orbit" aria-label="推进一回合" disabled={locked} onClick={onTurn}><ForwardOutlined/><span>{busy?'推演中':state.status==='completed'?'战局结束':'结束回合'}</span></button><button className="hud-auto" aria-label={autoRun?'暂停自动推演':'开启自动推演'} disabled={!!playerId||locked} onClick={onAuto}>{autoRun?<PauseOutlined/>:<PlayCircleOutlined/>}<span>{autoRun?'暂停':'自动推演'}</span></button></section>
 </>;
}
