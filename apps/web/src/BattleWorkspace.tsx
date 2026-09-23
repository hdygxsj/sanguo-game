import {
  ArrowLeftOutlined,
  CaretRightOutlined,
  CloudOutlined,
  PauseOutlined,
  PlayCircleOutlined,
  RadarChartOutlined,
  ReloadOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from './api';
import { ArenaScene } from './arena/ArenaScene';
import type { BattleDetail, BattleState, DomainEvent } from './types';

const STRATEGY_LABELS = {
  expansion: '扩张型',
  defensive: '守备型',
  economic: '经济型',
  balanced: '均衡型',
};

function scoreForAgent(state: BattleState, agentId: string) {
  const cities = state.cities.filter((city) => city.owner === agentId);
  return { cities: cities.length, troops: cities.reduce((total, city) => total + city.troops, 0), resource: state.resources[agentId] ?? 0 };
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

export function BattleWorkspace({ battleId, onBack }: { battleId: string; onBack: () => void }) {
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
        if (payload.type === 'battle-event' && payload.event) setEvents((current) => uniqueEvents([...current, payload.event!]));
      } catch {
        // Ignore malformed external frames while preserving the active match.
      }
    });
    return () => socket.close();
    // Reconnect only when the battle identity/state availability changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [battleId, Boolean(liveState)]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' });
  }, [events]);

  const runTurn = useCallback(async () => {
    if (!liveState || liveState.status === 'completed' || busy) return;
    setBusy(true);
    setError('');
    try {
      const result = await api.executeTurn(battleId, liveState.version);
      setLiveState(result.state);
      setViewState(result.state);
      setReplayTurn(result.state.turn);
      setEvents((current) => uniqueEvents([...current, ...result.events]).slice(-160));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '回合推进失败');
      if (reason instanceof Error && reason.message.includes('VERSION_CONFLICT')) await load();
    } finally {
      setBusy(false);
    }
  }, [battleId, busy, liveState, load]);

  useEffect(() => {
    if (!autoRun || busy || liveState?.status !== 'active') return;
    const timer = window.setTimeout(() => void runTurn(), 1150);
    return () => window.clearTimeout(timer);
  }, [autoRun, busy, liveState?.turn, liveState?.status, runTurn]);

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
    return <main className="workspace-loading"><div className="loader-mark"><RadarChartOutlined /></div><span>{error || '构建 3D 沙盘中…'}</span></main>;
  }

  return (
    <main className="battle-workspace">
      <section className="workspace-toolbar">
        <button className="ghost-button" onClick={onBack}><ArrowLeftOutlined /> 返回战局</button>
        <div className="workspace-title">
          <div className="eyebrow left">BATTLE / {battle.seed.slice(-6).toUpperCase()}</div>
          <h2>{battle.title}</h2>
        </div>
        <div className="turn-indicator"><small>当前回合</small><b>{String(viewState.turn).padStart(2, '0')}</b><span>/ {viewState.maxTurns}</span></div>
        <div className={`live-indicator ${connection}`}><i />{connection === 'live' ? '实时连接' : connection === 'connecting' ? '连接中' : '本地模式'}</div>
      </section>

      {error && <div className="workspace-error">{error}<button onClick={() => setError('')}>×</button></div>}
      <section className="workspace-grid">
        <aside className="agent-panel panel-frame">
          <header><RadarChartOutlined /><span>参战智能体</span><b>{ranking.filter(({ agent }) => agent.active).length} ONLINE</b></header>
          <div className="agent-list">
            {ranking.map(({ agent, cities, troops, resource }, index) => (
              <article className={`agent-row ${agent.active ? '' : 'inactive'}`} key={agent.id}>
                <span className="rank">0{index + 1}</span>
                <i className="agent-swatch" style={{ background: agent.color, boxShadow: `0 0 13px ${agent.color}` }} />
                <div><h3>{agent.name}</h3><p>{STRATEGY_LABELS[agent.strategy]}</p></div>
                <dl><div><dt>城</dt><dd>{cities}</dd></div><div><dt>兵</dt><dd>{troops}</dd></div><div><dt>资</dt><dd>{resource}</dd></div></dl>
              </article>
            ))}
          </div>
          <div className="terrain-legend">
            <span><i className="plain" />平原</span><span><i className="farm" />农田</span><span><i className="mine" />矿脉</span><span><i className="blocked" />山地</span>
          </div>
        </aside>

        <section className="arena-panel panel-frame">
          <div className="canvas-toolbar"><span><CloudOutlined /> 动态天气已启用</span><span>拖动旋转 · 滚轮缩放 · 点击城池</span></div>
          <div className="arena-canvas"><ArenaScene state={viewState} events={events} /></div>
          <div className="replay-bar">
            <button className="replay-icon" aria-label="回到最新回合" onClick={() => void changeReplay(liveState.turn)}><ReloadOutlined /></button>
            <span>回放</span>
            <input aria-label="回放回合" type="range" min={0} max={liveState.turn} value={replayTurn} onChange={(event) => void changeReplay(Number(event.target.value))} />
            <b>{replayTurn === liveState.turn ? 'LIVE' : `T-${replayTurn}`}</b>
          </div>
        </section>

        <aside className="event-panel panel-frame">
          <header><ThunderboltOutlined /><span>战局事件</span></header>
          <div className="event-log" ref={logRef}>
            {events.length === 0 ? <div className="event-empty"><CaretRightOutlined /><span>等待首轮指令</span></div> : events.map((event) => (
              <article key={`${event.turn}-${event.sequence}-${event.type}`}>
                <span>T{String(event.turn).padStart(2, '0')}</span>
                <i className={`event-type ${event.type}`} />
                <p>{event.message}</p>
              </article>
            ))}
          </div>
          <div className="turn-controls">
            <button className="auto-button" aria-label={autoRun ? '暂停自动推演' : '开启自动推演'} onClick={() => setAutoRun((value) => !value)}>{autoRun ? <PauseOutlined /> : <PlayCircleOutlined />} {autoRun ? '暂停' : '自动推演'}</button>
            <button className="primary-button turn-button" aria-label="推进一回合" onClick={() => void runTurn()} disabled={busy || liveState.status === 'completed'}>{busy ? '推演中…' : liveState.status === 'completed' ? '战局结束' : '推进一回合'}</button>
          </div>
        </aside>
      </section>
    </main>
  );
}
