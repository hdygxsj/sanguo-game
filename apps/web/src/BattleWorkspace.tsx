import {formatTroops} from '../../api/src/domain/troopScale';
import {KingdomPanel} from './KingdomPanel';
import {kingdomOf,rankName} from '../../api/src/domain/kingdom';
import {factionTrait} from '../../api/src/domain/factionTraits';
import {
  CaretRightOutlined,
  RadarChartOutlined,
  ReloadOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from './api';
import { ArenaScene } from './arena/ArenaScene';
import type { BattleDetail, BattleState, DomainEvent, PlayerOrder } from './types';
import {ArmyCommands,type ArmyIntent} from './ArmyCommands';
import {CityConstruction} from './CityConstruction';
import { DiplomacyPanel } from './DiplomacyPanel';
import { PersonnelPanel } from './PersonnelPanel';
import {personnelNotice} from './personnelNotice';
import {CharacterPortrait} from './CharacterPortrait';
import {simplified} from './simplified';
import {CampaignHud} from './CampaignHud';

const STRATEGY_LABELS = {
  expansion: '扩张型',
  defensive: '守备型',
  economic: '经济型',
  balanced: '均衡型',
};

function scoreForAgent(state: BattleState, agentId: string) {
  const cities = state.cities.filter((city) => city.owner === agentId);
  const fieldTroops=(state.armies??[]).filter(a=>a.owner===agentId).reduce((sum,a)=>sum+a.troops,0);
  return { cities: cities.length, troops: cities.reduce((total, city) => total + city.troops, fieldTroops), resource: state.resources[agentId] ?? 0 };
}

function uniqueEvents(events: DomainEvent[]): DomainEvent[] {
  const seen = new Set<string>();
  return events.filter((event) => {
    const key = `${event.turn}:${event.sequence}:${event.type}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function BattleWorkspace({ battleId, onBack,onRules }: { battleId: string; onBack: () => void;onRules?:()=>void }) {
  const [panel,setPanel]=useState<'agents'|'events'|'replay'|'ruler'|'diplomacy'|'personnel'|'kingdom'|'armies'|'construction'|null>(null);
  const [playerId,setPlayerId]=useState<string|null>(null);
  const [focusedCityId,setFocusedCityId]=useState<number|null>(null);
  const [selectedArmyId,setSelectedArmyId]=useState<string|null>(null);
  const [armyIntent,setArmyIntent]=useState<ArmyIntent>(null);
  const [armyTargetId,setArmyTargetId]=useState<number|null>(null);
  useEffect(()=>{const escape=(e:KeyboardEvent)=>{if(e.key==='Escape'){setPanel(null);setArmyIntent(null);setArmyTargetId(null);}};window.addEventListener('keydown',escape);return()=>window.removeEventListener('keydown',escape);},[]);
  const [battle, setBattle] = useState<BattleDetail | null>(null);
  const [liveState, setLiveState] = useState<BattleState | null>(null);
  const [viewState, setViewState] = useState<BattleState | null>(null);
  const [events, setEvents] = useState<DomainEvent[]>([]);
  const [busy, setBusy] = useState(false);
  const [autoRun, setAutoRun] = useState(false);
  const [replayTurn, setReplayTurn] = useState(0);
  const [connection, setConnection] = useState<'connecting' | 'live' | 'offline'>('connecting');
  const [error, setError] = useState('');
  const logRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const result = await api.getBattle(battleId);
    setBattle(result.battle);
    setLiveState(result.battle.state);
    setPlayerId(result.battle.state.playerAgentId??null);
    setViewState(result.battle.state);
    setReplayTurn(result.battle.state.turn);
  }, [battleId]);

  useEffect(() => {
    load().catch((reason: Error) => setError(reason.message));
  }, [load]);

  useEffect(() => {
    if (!liveState || typeof WebSocket === 'undefined') {
      setConnection('offline');
      return;
    }
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(`${protocol}//${window.location.host}/ws?battleId=${battleId}&after=${events.at(-1)?.sequence ?? 0}`);
    socket.addEventListener('open', () => setConnection('live'));
    socket.addEventListener('close', () => setConnection('offline'));
    socket.addEventListener('message', (message) => {
      try {
        const payload = JSON.parse(String(message.data)) as { type?: string; event?: DomainEvent };
        if (payload.type === 'battle-event' && payload.event) setEvents((current) => uniqueEvents([...current, {...payload.event!,message:simplified(payload.event!.message)}]));
      } catch {
        // Ignore malformed external frames while preserving the active match.
      }
    });
    return () => socket.close();
    // Reconnect only when the battle identity/state availability changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [battleId, Boolean(liveState)]);

  useEffect(() => {
    logRef.current?.scrollTo?.({ top: logRef.current.scrollHeight, behavior: 'smooth' });
  }, [events,panel]);

  const runTurn = useCallback(async (order?:PlayerOrder) => {
    if (!liveState || liveState.status === 'completed' || busy || replayTurn!==liveState.turn) return;
    setBusy(true);
    setError('');
    try {
      const command=order??(playerId&&liveState.agents.some(a=>a.id===playerId&&a.active)?{agentId:playerId,action:{type:'hold' as const}}:undefined);
      const result = await api.executeTurn(battleId, liveState.version,command);
      setLiveState(result.state);
      setPlayerId(result.state.playerAgentId??null);
      setViewState(result.state);
      setReplayTurn(result.state.turn);
      setEvents((current) => uniqueEvents([...current, ...result.events]).slice(-160));
      setArmyIntent(null);setArmyTargetId(null);
      if(order?.action.type==='raise-army')setSelectedArmyId(result.state.armies?.filter(a=>a.owner===order.agentId).at(-1)?.id??null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '回合推进失败');
      if (reason instanceof Error && reason.message.includes('VERSION_CONFLICT')) await load();
    } finally {
      setBusy(false);
    }
  }, [battleId, busy, liveState, load,playerId,replayTurn]);

  useEffect(() => {
    if (!autoRun || playerId || busy || liveState?.status !== 'active') return;
    const timer = window.setTimeout(() => void runTurn(), 1150);
    return () => window.clearTimeout(timer);
  }, [autoRun, playerId, busy, liveState?.turn, liveState?.status, runTurn]);

  const changeReplay = async (turn: number) => {
    if (!liveState) return;
    setReplayTurn(turn);
    if (turn === liveState.turn) {
      setViewState(liveState);
      return;
    }
    try {
      const result = await api.replay(battleId, turn);
      setViewState(result.snapshot);
      setEvents(result.events);
      setAutoRun(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '回放读取失败');
    }
  };

  const ranking = useMemo(() => viewState?.agents.map((agent) => ({ agent, ...scoreForAgent(viewState, agent.id) }))
    .sort((left, right) => right.cities * 100 + right.troops + right.resource - (left.cities * 100 + left.troops + left.resource)) ?? [], [viewState]);

  if (!battle || !viewState || !liveState) {
    return <main className="workspace-loading"><div className="loader-mark"><RadarChartOutlined /></div><span>{error || '正在进入天下…'}</span></main>;
  }
  const player=viewState.agents.find(a=>a.id===playerId);
  const realm=player?kingdomOf(viewState,player.id):undefined;
  const objective=viewState.status==='completed'?`${viewState.agents.find(a=>a.id===viewState.winner)?.name??''}获胜 · ${viewState.victoryReason==='kingdom'?'立国十年':'天下归一'}`:realm?`${realm.name}国 · 守都 ${viewState.turn-realm.foundedTurn}/40 回合`:player?.active?'安定疆土，积望立国':player?'你的势力已覆灭':'旁观群雄，静待天下一统';
  const ruler=viewState.characters?.find(c=>c.owner===playerId&&c.ruler);
  const locked=busy||liveState.status!=='active'||replayTurn!==liveState.turn;
  const selectArmy=(id:string)=>{setSelectedArmyId(id);setArmyIntent(null);setArmyTargetId(null);setPanel('armies');};

  return (
    <main className={`battle-workspace map-first ${panel==='construction'?'construction-commanding':''} ${panel==='armies'?'army-commanding':''} ${panel==='armies'&&armyIntent?'army-targeting':''}`}>
      <CampaignHud state={viewState} playerId={playerId} panel={panel} onPanel={next=>{setPanel(panel===next?null:next);if(next!=='armies')setArmyIntent(null);}} onBack={onBack} onRules={onRules} onTurn={()=>void runTurn()} locked={locked} busy={busy} autoRun={autoRun} onAuto={()=>setAutoRun(value=>!value)}/>
      {connection==='offline'&&<span className="campaign-connection-warning">实时消息暂断</span>}
      <h1 className="campaign-accessible-title">{battle.title}</h1>

      {error && <div className="workspace-error">{error}<button onClick={() => setError('')}>×</button></div>}
      <section className="workspace-grid">
        {panel==='armies'&&<aside className="agent-panel panel-frame workspace-drawer army-drawer" aria-label="军队指挥"><header><span>军队指挥</span><button aria-label="关闭军队指挥" onClick={()=>{setPanel(null);setArmyIntent(null);}}>×</button></header><ArmyCommands state={viewState} playerId={playerId} disabled={locked} selectedArmyId={selectedArmyId} onSelectArmy={selectArmy} onOrder={order=>void runTurn(order)} intent={armyIntent} onIntent={intent=>{setArmyIntent(intent);setArmyTargetId(null);}} targetId={armyTargetId}/></aside>}
        {panel==='construction'&&<aside className="agent-panel panel-frame workspace-drawer construction-drawer" aria-label="城池建设"><header><span>城池建设</span><button aria-label="关闭城池建设" onClick={()=>setPanel(null)}>×</button></header><CityConstruction state={viewState} cityId={focusedCityId} playerId={playerId} disabled={locked} onOrder={order=>void runTurn(order)}/></aside>}
        {panel==='kingdom'&&<aside className="agent-panel panel-frame workspace-drawer" aria-label="国策"><header><span>国策</span><button aria-label="关闭国策" onClick={()=>setPanel(null)}>×</button></header><KingdomPanel state={viewState} playerId={playerId} disabled={locked} onOrder={order=>void runTurn(order)}/></aside>}
        {panel==='personnel'&&<aside className="agent-panel panel-frame workspace-drawer" aria-label="人物与官职">
          <header><span>人物与官职</span><button aria-label="关闭人物与官职" onClick={()=>setPanel(null)}>×</button></header>
          <PersonnelPanel state={viewState} playerId={playerId} disabled={busy||liveState.status!=='active'||replayTurn!==liveState.turn} onOrder={order=>void runTurn(order)} notice={personnelNotice(events,playerId,viewState.turn)} onDiplomacy={()=>setPanel('diplomacy')}/>
        </aside>}
        {panel==='diplomacy'&&<aside className="agent-panel panel-frame workspace-drawer" aria-label="外交事务">
          <header><span>外交事务</span><button aria-label="关闭外交事务" onClick={()=>setPanel(null)}>×</button></header>
          <DiplomacyPanel state={liveState} playerId={playerId} disabled={busy||liveState.status!=='active'||replayTurn!==liveState.turn} onOrder={order=>void runTurn(order)}
            notice={[...events].reverse().find(e=>e.type==='diplomacy'&&e.agentId===playerId)?.message}/>
        </aside>}
        {panel==='ruler'&&<aside className="agent-panel panel-frame workspace-drawer ruler-drawer" aria-label="君主指令">
          <header><span>君主指令</span><button aria-label="关闭君主指令" onClick={()=>setPanel(null)}>×</button></header>
          {ruler&&<div className="ruler-banner"><CharacterPortrait person={ruler}/><div><small>执掌一方</small><h2>{ruler.name}</h2><p>统率 {ruler.command} · 政治 {ruler.politics}</p><small>整军经武，经营你的天下。</small></div></div>}
          {!liveState.playerAgentId?<div className="ruler-choice"><p>选择你要扮演的君主。</p>{viewState.agents.map(a=><button key={a.id} disabled={locked||!a.active} aria-pressed={playerId===a.id} onClick={()=>{setPlayerId(a.id);setAutoRun(false);}}>扮演 {a.name}</button>)}<button disabled={locked||!playerId} onClick={()=>void runTurn({agentId:playerId!,action:{type:'hold'}})}>确认身份并开始执政</button></div>:<div className="ruler-choice"><p>你的身份：{player?.name}。军队在地图上独立行动，城池负责守备和建设。</p><button onClick={()=>setPanel('armies')}>指挥军队</button><button onClick={()=>setPanel('personnel')}>任用人物</button><button onClick={()=>setPanel('kingdom')}>治理国家</button></div>}
        </aside>}
        {panel==='agents'&&<aside className="agent-panel panel-frame workspace-drawer" aria-label="势力详情">
          <header><RadarChartOutlined /><span>势力详情</span><b>{ranking.filter(({ agent }) => agent.active).length} 支</b><button aria-label="关闭势力详情" onClick={()=>setPanel(null)}>×</button></header>
          <p className="faction-intro">群雄割据，各据一方。查看诸侯实力，决定交往与征讨的方向。</p>
          <div className="agent-list faction-roster">
            {ranking.map(({ agent, cities, troops, resource }) => (
              <article className={`agent-row ${agent.active ? '' : 'inactive'}`} key={agent.id}>
                {viewState.characters?.find(c=>c.ruler&&c.owner===agent.id)?<CharacterPortrait person={viewState.characters.find(c=>c.ruler&&c.owner===agent.id)!}/>:<span className="faction-seal" style={{color:agent.color}}>{agent.name[0]}</span>}
                <div><h3>{agent.name}{agent.id===playerId?' · 你':''}</h3><p>{agent.active?`${rankName(viewState,agent.id)} · 名望 ${viewState.polities?.[agent.id]?.prestige??0} · ${STRATEGY_LABELS[agent.strategy]}`:'势力已覆灭'}</p><p>{factionTrait(agent.name).name} · {factionTrait(agent.name).description}</p>{kingdomOf(viewState,agent.id)&&<p>{kingdomOf(viewState,agent.id)!.name}国 · 首都 {viewState.cities[kingdomOf(viewState,agent.id)!.capitalId]?.name} · 存续 {viewState.turn-kingdomOf(viewState,agent.id)!.foundedTurn}/40 回合</p>}<dl><div><dt>城池</dt><dd>{cities}</dd></div><div><dt>兵力</dt><dd>{formatTroops(troops)} 人</dd></div><div><dt>国库</dt><dd>{resource}</dd></div></dl></div>
              </article>
            ))}
          </div>
          <button className="ghost-button" onClick={()=>setPanel('diplomacy')}>前往外交议事</button>
        </aside>}

        <section className="arena-panel panel-frame">
          <div className="arena-canvas"><ArenaScene state={viewState} events={events} selectedArmyId={selectedArmyId} onSelectArmy={selectArmy} targeting={panel==='armies'&&!!armyIntent} onSelectCity={id=>{setFocusedCityId(id);if(panel==='armies'&&armyIntent)setArmyTargetId(id);}} playerId={playerId} commandsDisabled={locked} onCityAction={(kind,id)=>{setFocusedCityId(id);setPanel(kind==='develop'?'construction':kind==='role'?'ruler':'armies');}}/></div>
          {panel==='armies'&&armyIntent&&<div className="army-map-prompt" role="status">{armyIntent==='raise'?'选择己方城池组建兵团':armyIntent==='field'?'点击行军方向的据点，部队将在道路中段扎营':'点击地图目标，为选中的军队规划路线'}<button onClick={()=>{setArmyIntent(null);setArmyTargetId(null);}}>取消</button></div>}
          <div className="campaign-objective"><b>{objective}</b><span>{replayTurn!==liveState.turn?'正在观看历史回合，返回最新回合后可下令。':realm?`首都 ${viewState.cities[realm.capitalId]?.name} · 失守立即亡国。`:player?.active?'军队：选择兵团，再点地图目标；城池：选择城池建设。':player?'可继续观看其他势力的争夺。':'可手动或自动推进；若想亲自经营，打开君主选择势力。'}</span></div>
          {panel==='replay'&&<div className="replay-bar">
            <button className="replay-icon" aria-label="回到最新回合" onClick={() => void changeReplay(liveState.turn)}><ReloadOutlined /></button>
            <span>回放</span>
            <input aria-label="回放回合" type="range" min={0} max={liveState.turn} value={replayTurn} onChange={(event) => void changeReplay(Number(event.target.value))} />
            <b>{replayTurn === liveState.turn ? 'LIVE' : `T-${replayTurn}`}</b>
            <button aria-label="关闭回放" onClick={()=>setPanel(null)}>×</button>
          </div>}
        </section>

        {panel==='events'&&<aside className="event-panel panel-frame workspace-drawer" aria-label="战局事件">
          <header><ThunderboltOutlined /><span>战局事件</span><button aria-label="关闭战局事件" onClick={()=>setPanel(null)}>×</button></header>
          <div className="event-log" ref={logRef}>
            {events.length === 0 ? <div className="event-empty"><CaretRightOutlined /><span>等待首轮指令</span></div> : events.map((event) => (
              <article key={`${event.turn}-${event.sequence}-${event.type}`}>
                <span>T{String(event.turn).padStart(2, '0')}</span>
                <i className={`event-type ${event.type}`} />
                <p>{event.message}</p>
              </article>
            ))}
          </div>
        </aside>}
      </section>
    </main>
  );
}
