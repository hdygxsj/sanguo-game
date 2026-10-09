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
import './campaign-ui.css';
import { TrainingPanel } from './TrainingPanel';
import {WorkspaceBoundary} from './WorkspaceBoundary';
import {NewCampaign} from './NewCampaign';

const BattleWorkspace = lazy(() => import('./BattleWorkspace').then((module) => ({ default: module.BattleWorkspace })));

type LoadState = 'loading' | 'guest' | 'ready';

const DEFAULT_BATTLE: CreateBattleInput = {
  title: '汉末山河 · 群雄逐鹿',
  columns: 7,
  rows: 5,
  agentCount: 16,
  maxTurns: 0,
};

function Brand() {
  return (
    <div className="brand-lockup">
      <div className="brand-overline"><span>汉末山河</span><i /><span>群雄逐鹿</span></div>
      <div className="brand-title-row">
        <button className="icon-button" aria-label="返回"><ArrowLeftOutlined /></button>
        <div className="brand-mark"><SafetyCertificateOutlined /><ThunderboltFilled /></div>
        <div>
          <h1>汉末山河</h1>
          <p>执掌一方，问鼎天下</p>
        </div>
      </div>
    </div>
  );
}

function RulesDialog({ onClose }: { onClose: () => void }) {
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <section className="modal-card rules-card" role="dialog" aria-modal="true" aria-label="竞技场规则" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-kicker"><BookOutlined /> 征战指南</div>
        <h2>竞技场规则</h2>
        <p>可扮演一方君主经营天下，也可观看 AI 群雄推演。新剧本包含 16 支汉末势力，领地为游戏化配置。</p>
        <ol className="rule-list">
          <li><b>统一回合结算</b><span>开局选择君主或观战。点击己方城池可征兵、建设或出征，每回合一道指令；确认下令后各方同时行动。战斗自动结算，无需操作士兵。</span></li>
          <li><b>城市与资源</b><span>征募每兵耗资 3，升级耗资为当前等级 × 20。资源县提高税收，驻军与行军兵团都须支付军饷，城池也有维护费；欠饷会导致逃兵。</span></li>
          <li><b>郡县争夺</b><span>没有回合上限，消灭其他势力方可获胜。军队沿道路按距离跨回合行军，途中可能遭遇敌军；野战和攻城自动结算。仍有行军兵团的势力不会因丢失最后一城立刻出局。</span></li>
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
        <div className="eyebrow"><span /> 群雄逐鹿 <span /></div>
        <h2>登录后开启你的战局</h2>
        <p>从一方诸侯起步，整军经武、招贤纳士，在乱世中建立你的霸业。</p>
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
      <h3>乱世已至，静候君临</h3>
      <p>从十六位君主中选择一位，或旁观群雄争霸。</p>
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
        <span>第 <b>{battle.currentTurn}</b> 回合</span>
        <span>{battle.agents.filter(a=>a.active).length} 方势力</span>
      </div>
      <div className="card-action">继续征途 <span>↗</span></div>
    </button>
  );
}

function Lobby({ user, onLogout, onOpenBattle }: { user: User; onLogout: () => void; onOpenBattle: (id: string) => void }) {
  const [battles, setBattles] = useState<BattleSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newGame,setNewGame]=useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.listBattles()
      .then(({ battles: rows }) => setBattles(rows))
      .catch((reason: Error) => setError(reason.message))
      .finally(() => setLoading(false));
  }, []);

  const createBattle = async (playerAgentId?:string) => {
    setCreating(true);
    setError('');
    try {
      const { battle } = await api.createBattle({...DEFAULT_BATTLE,playerAgentId});
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
        <div><div className="eyebrow left">山河待定</div><h2>我的战局</h2><p>继续未竟的霸业，或开启一段新的征途。</p></div>
        <div className="lobby-actions">
          <span className="user-pill">{user.displayName}</span>
          <button className="ghost-button" onClick={onLogout} aria-label="退出登录"><LogoutOutlined /></button>
          <button className="primary-button compact" onClick={()=>setNewGame(true)} disabled={creating} aria-label="创建战局"><PlusOutlined /> 开始游戏</button>
        </div>
      </section>
      {error && <div className="error-banner">{error}</div>}
      {newGame&&<NewCampaign busy={creating} onStart={id=>void createBattle(id)} onClose={()=>setNewGame(false)}/>}
      {loading ? <div className="loading-grid"><i /><i /><i /></div> : battles.length === 0 ? (
        <EmptyLobby onCreate={()=>setNewGame(true)} busy={creating} />
      ) : (
        <section className="battle-grid">
          {battles.map((battle) => <BattleCard key={battle.id} battle={battle} onOpen={() => onOpenBattle(battle.id)} />)}
        </section>
      )}
      <details className="lab-disclosure"><summary>开发与训练工具</summary><TrainingPanel /></details>
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
        <WorkspaceBoundary onReload={()=>window.location.reload()}>
        <Suspense fallback={<main className="workspace-loading"><div className="loader-mark"><ThunderboltFilled /></div><span>正在进入天下…</span></main>}>
          <BattleWorkspace battleId={selectedBattle} onBack={() => setSelectedBattle(null)} onRules={()=>setRulesOpen(true)} />
        </Suspense>
        </WorkspaceBoundary>
      ) : loadState === 'loading' ? (
        <main className="loading-stage"><div className="loader-mark"><ThunderboltFilled /></div><span>正在读取征途…</span></main>
      ) : loadState === 'guest' ? (
        <LoginPanel busy={loginBusy} onDemo={demoLogin} />
      ) : user ? (
        <Lobby user={user} onLogout={logout} onOpenBattle={setSelectedBattle} />
      ) : null}
      <footer className="site-footer"><span>汉末山河</span><i /><span>群雄逐鹿</span></footer>
      {rulesOpen && <RulesDialog onClose={() => setRulesOpen(false)} />}
    </div>
  );
}
