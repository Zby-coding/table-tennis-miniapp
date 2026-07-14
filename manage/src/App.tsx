import { FormEvent, useState } from 'react';
import { clearToken, login } from './api';
import { LoginUser } from './types';
import UsersPage from './pages/UsersPage';
import CheckinFavoritePage from './pages/CheckinFavoritePage';
import AchievementsPage from './pages/AchievementsPage';
import BackgroundAuditPage from './pages/BackgroundAuditPage';

type NavKey = 'users' | 'engagement' | 'medals' | 'backgrounds';

const NAV: Array<{ key: NavKey; label: string }> = [
  { key: 'users', label: '用户管理' },
  { key: 'engagement', label: '收藏与签到' },
  { key: 'medals', label: '勋章管理' },
  { key: 'backgrounds', label: '背景审核' },
];

export default function App() {
  const [currentUser, setCurrentUser] = useState<LoginUser | null>(null);
  const [loginCode, setLoginCode] = useState('');
  const [loginError, setLoginError] = useState('');
  const [nav, setNav] = useState<NavKey>('users');

  const isAdmin = currentUser?.role === 'admin' && currentUser.status === 'active';

  async function handleLogin(event: FormEvent) {
    event.preventDefault();
    setLoginError('');
    try {
      const user = await login(loginCode.trim());
      if (user.role !== 'admin' || user.status !== 'active') {
        clearToken();
        setCurrentUser(null);
        setLoginError('当前账号没有管理权限');
        return;
      }
      setCurrentUser(user);
    } catch (error) {
      clearToken();
      setCurrentUser(null);
      setLoginError(error instanceof Error ? error.message : '登录失败');
    }
  }

  if (!isAdmin) {
    return (
      <main className="login-screen">
        <VisualAtmosphere />
        <section className="login-composite-card glass-panel">
          <section className="login-panel">
            <div className="brand-lockup">
              <div className="brand-mark">乒</div>
              <div>
                <span className="eyebrow">CONTROL DECK</span>
                <h1>小程序管理系统</h1>
              </div>
            </div>
            <div className="login-signal">
              <span>Admin Gate</span>
              <i />
              <span>Secure Session</span>
            </div>
            <form onSubmit={handleLogin}>
              <label htmlFor="code">登录 Code</label>
              <input id="code" value={loginCode} onChange={event => setLoginCode(event.target.value)} placeholder="开发环境 code" />
              <button type="submit">登录管理端</button>
            </form>
            {loginError && <div className="error-text">{loginError}</div>}
          </section>
          <section className="login-stage">
            <PingPongAnimation />
          </section>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <VisualAtmosphere />
      <aside className="sidebar glass-panel">
        <div className="sidebar-brand"><span>乒</span><strong>TableTennis Admin</strong></div>
        <nav>
          {NAV.map((item) => (
            <button
              key={item.key}
              type="button"
              className={nav === item.key ? 'nav-active' : ''}
              onClick={() => setNav(item.key)}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <button className="logout" onClick={() => { clearToken(); setCurrentUser(null); }}>退出</button>
      </aside>

      <section className="workspace workspace-flex">
        {nav === 'users' && <UsersPage />}
        {nav === 'engagement' && <CheckinFavoritePage />}
        {nav === 'medals' && <AchievementsPage />}
        {nav === 'backgrounds' && <BackgroundAuditPage />}
      </section>
    </main>
  );
}

function VisualAtmosphere() {
  return (
    <div className="visual-atmosphere" aria-hidden="true">
      <div className="mesh-field" />
      <div className="kinetic-grid" />
      <div className="particle-field" />
      <div className="speed-lines" />
      <div className="ambient-ball" />
    </div>
  );
}

function PingPongAnimation() {
  return (
    <div className="pingpong-stage" aria-hidden="true">
      <div className="table-line" />
      <div className="net" />
      <div className="player player-left">
        <span className="head" />
        <span className="body" />
        <span className="arm" />
        <span className="paddle" />
      </div>
      <div className="player player-right">
        <span className="head" />
        <span className="body" />
        <span className="arm" />
        <span className="paddle" />
      </div>
      <div className="ball-arc" />
      <div className="pong-ball" />
      <div className="impact impact-left" />
      <div className="impact impact-right" />
    </div>
  );
}
