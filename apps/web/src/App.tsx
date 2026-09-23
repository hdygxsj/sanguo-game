import {
  ArrowLeftOutlined,
  BookOutlined,
  BulbOutlined,
  ExperimentOutlined,
  LogoutOutlined,
  PlusOutlined,
  SafetyCertificateOutlined,
  ThunderboltFilled,
  TrophyOutlined,
} from '@ant-design/icons';
import { lazy, Suspense, useEffect, useState } from 'react';
import { api, ApiError } from './api';
import type { BattleSummary, CreateBattleInput, User } from './types';
import './styles.css';

const BattleWorkspace = lazy(() => import('./BattleWorkspace').then((module) => ({ default: module.BattleWorkspace })));

type LoadState = 'loading' | 'guest' | 'ready';

const DEFAULT_BATTLE: CreateBattleInput = {
  title: '群雄逐鹿',
  columns: 7,
  rows: 5,
  agentCount: 4,
  maxTurns: 30,
};

function Brand() {
  return (
    <div className="brand-lockup">
      <div className="brand-overline"><span>MODEL DATA PLUS</span><i /><span>EXPERIMENTS</span></div>
      <div className="brand-title-row">
        <button className="icon-button" aria-label="返回"><ArrowLeftOutlined /></button>
        <div className="brand-mark"><SafetyCertificateOutlined /><ThunderboltFilled /></div>
        <div>
          <h1>Agent 竞技场</h1>
          <p>多智能体策略对抗实验场</p>
        </div>
      </div>
    </div>
  );
}

function RulesDialog({ onClose }: { onClose: () => void }) {
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <section className="modal-card rules-card" role="dialog" aria-modal="true" aria-label="竞技场规则" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-kicker"><BookOutlined /> RULEBOOK 01</div>
        <h2>竞技场规则</h2>
        <p>每一位 Agent 都拥有独立策略与资源判断，并在同一张动态沙盘上争夺城池。</p>
        <ol className="rule-list">
          <li><b>统一回合结算</b><span>所有 Agent 同时提交行动，服务端按固定序列确定移动、建设与战斗结果。</span></li>
          <li><b>城市与资源</b><span>农田提高补给，矿脉强化建设；等级更高的城池拥有更坚固的防线。</span></li>
          <li><b>占领帝都</b><span>控制地图中心的帝都，或在最大回合数到达时拥有最高综合势力，即可获胜。</span></li>
        </ol>
        <button className="primary-button wide" onClick={onClose}>明白了</button>
      </section>
    </div>
  );
}

function LoginPanel({ busy, onDemo }: { busy: boolean; onDemo: () => void }) {
  return (
    <main className="guest-stage">
      <div className="guest-orbit orbit-one" />
      <div className="guest-orbit orbit-two" />
      <section className="guest-card">
        <div className="guest-emblem"><SafetyCertificateOutlined /><ThunderboltFilled /></div>
        <div className="eyebrow"><span /> AGENT ARENA <span /></div>
        <h2>登录后开启你的战局</h2>
        <p>部署不同策略的智能体，在实时 3D 沙盘上观察扩张、交锋与联盟瓦解。</p>
        <button className="primary-button" onClick={onDemo} disabled={busy} aria-label="体验完整战局">
          <ExperimentOutlined /> {busy ? '正在部署…' : '体验完整战局'}
        </button>
        <div className="guest-note"><BulbOutlined /> 本地体验账号，无需真实手机号</div>
      </section>
    </main>
  );
}

function EmptyLobby({ onCreate, busy }: { onCreate: () => void; busy: boolean }) {
  return (
    <section className="empty-lobby">
      <div className="empty-icon"><TrophyOutlined /></div>
      <h3>第一场对决，等待开局</h3>
      <p>创建战局后，四位策略 Agent 将在随机生成的山河城池间自主博弈。</p>
      <button className="primary-button" onClick={onCreate} disabled={busy} aria-label="创建战局"><PlusOutlined /> 创建战局</button>
    </section>
  );
}

function BattleCard({ battle, onOpen }: { battle: BattleSummary; onOpen: () => void }) {
  return (
    <button className="battle-card" onClick={onOpen}>
      <div className="battle-card-top">
        <span className={`status-dot ${battle.status}`} />
        <span>{battle.status === 'active' ? '进行中' : '已结束'}</span>
        <time>{new Date(battle.updatedAt).toLocaleDateString('zh-CN')}</time>
      </div>
      <h3>{battle.title}</h3>
      <div className="agent-stack">
        {battle.agents.map((agent) => <i key={agent.id} style={{ background: agent.color }} title={agent.name} />)}
      </div>
      <div className="battle-stats">
        <span><b>{battle.currentTurn}</b> / {battle.maxTurns} 回合</span>
        <span>{battle.columns} × {battle.rows} 城域</span>
      </div>
      <div className="card-action">进入沙盘 <span>↗</span></div>
    </button>
  );
}

function Lobby({ user, onLogout, onOpenBattle }: { user: User; onLogout: () => void; onOpenBattle: (id: string) => void }) {
  const [battles, setBattles] = useState<BattleSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.listBattles()
      .then(({ battles: rows }) => setBattles(rows))
      .catch((reason: Error) => setError(reason.message))
      .finally(() => setLoading(false));
  }, []);

  const createBattle = async () => {
    setCreating(true);
    setError('');
    try {
      const { battle } = await api.createBattle(DEFAULT_BATTLE);
      onOpenBattle(battle.id);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '创建失败');
    } finally {
      setCreating(false);
    }
  };

  return (
    <main className="lobby-shell">
      <section className="lobby-heading">
        <div><div className="eyebrow left">COMMAND CENTER</div><h2>我的战局</h2><p>选择一局继续推演，或开启一场新的 Agent 对抗实验。</p></div>
        <div className="lobby-actions">
          <span className="user-pill">{user.displayName}</span>
          <button className="ghost-button" onClick={onLogout} aria-label="退出登录"><LogoutOutlined /></button>
          <button className="primary-button compact" onClick={createBattle} disabled={creating} aria-label="创建战局"><PlusOutlined /> 创建战局</button>
        </div>
      </section>
      {error && <div className="error-banner">{error}</div>}
      {loading ? <div className="loading-grid"><i /><i /><i /></div> : battles.length === 0 ? (
        <EmptyLobby onCreate={createBattle} busy={creating} />
      ) : (
        <section className="battle-grid">
          {battles.map((battle) => <BattleCard key={battle.id} battle={battle} onOpen={() => onOpenBattle(battle.id)} />)}
        </section>
      )}
    </main>
  );
}

export function App() {
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [user, setUser] = useState<User | null>(null);
  const [loginBusy, setLoginBusy] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [selectedBattle, setSelectedBattle] = useState<string | null>(null);

  useEffect(() => {
    api.me()
      .then(({ user: current }) => { setUser(current); setLoadState('ready'); })
      .catch((reason) => setLoadState(reason instanceof ApiError && reason.status === 401 ? 'guest' : 'guest'));
  }, []);

  const demoLogin = async () => {
    setLoginBusy(true);
    try {
      const result = await api.demoLogin();
      setUser(result.user);
      setLoadState('ready');
    } finally {
      setLoginBusy(false);
    }
  };

  const logout = async () => {
    await api.logout();
    setUser(null);
    setLoadState('guest');
  };

  return (
    <div className={`app-shell ${selectedBattle ? 'workspace-active' : ''}`}>
      <header className="site-header">
        <Brand />
        <button className="rule-button" onClick={() => setRulesOpen(true)} aria-label="查看规则"><BookOutlined /> 竞技规则</button>
      </header>
      {selectedBattle ? (
        <Suspense fallback={<main className="workspace-loading"><div className="loader-mark"><ThunderboltFilled /></div><span>装载 3D 沙盘…</span></main>}>
          <BattleWorkspace battleId={selectedBattle} onBack={() => setSelectedBattle(null)} />
        </Suspense>
      ) : loadState === 'loading' ? (
        <main className="loading-stage"><div className="loader-mark"><ThunderboltFilled /></div><span>LOADING ARENA</span></main>
      ) : loadState === 'guest' ? (
        <LoginPanel busy={loginBusy} onDemo={demoLogin} />
      ) : user ? (
        <Lobby user={user} onLogout={logout} onOpenBattle={setSelectedBattle} />
      ) : null}
      <footer className="site-footer"><span>MDP LABS / 2026</span><i /><span>SIMULATION ONLINE</span></footer>
      {rulesOpen && <RulesDialog onClose={() => setRulesOpen(false)} />}
    </div>
  );
}
