import { FormEvent, useEffect, useMemo, useState } from 'react';
import { getOverview, getUserDetail, listUsers, updateUserNote, updateUserRole, updateUserStatus } from '../api';
import { UserDetail, UserFilters, UserListItem, UserOverview, UserStatus } from '../types';

const defaultFilters: UserFilters = { keyword: '', status: '', level: '', city: '', page: 1, pageSize: 10 };
const levelText: Record<number, string> = { 1: 'L1 萌新', 2: 'L2 进阶', 3: 'L3 高级', 4: 'Pro 大神' };

function formatTime(value?: string | null) {
  if (!value) return '暂无';
  return new Intl.DateTimeFormat('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

function Metric({ label, value, hint }: { label: string; value: string | number; hint: string }) {
  return <div className="metric glass-panel"><span>{label}</span><strong>{value}</strong><em>{hint}</em></div>;
}

function Badge({ tone, children }: { tone: 'green' | 'red' | 'blue' | 'gray'; children: string }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}

export default function UsersPage() {
  const [overview, setOverview] = useState<UserOverview | null>(null);
  const [filters, setFilters] = useState<UserFilters>(defaultFilters);
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<UserDetail | null>(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    refresh();
  }, [filters.page]);

  const activeRate = useMemo(() => {
    if (!overview?.totalUsers) return 0;
    return Math.round((overview.activeUsers / overview.totalUsers) * 100);
  }, [overview]);

  async function refresh(nextFilters = filters) {
    setLoading(true);
    setMessage('');
    try {
      const [overviewRes, listRes] = await Promise.all([getOverview(), listUsers(nextFilters)]);
      setOverview(overviewRes.data);
      setUsers(listRes.data.items);
      setTotalPages(listRes.data.totalPages);
      setTotal(listRes.data.total);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }

  function applyFilters(event: FormEvent) {
    event.preventDefault();
    const next = { ...filters, page: 1 };
    setFilters(next);
    refresh(next);
  }

  async function openDetail(user: UserListItem) {
    setMessage('');
    try {
      const res = await getUserDetail(user.id);
      setSelected(res.data);
      setNoteDraft(res.data.adminNote || '');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '详情加载失败');
    }
  }

  async function mutateSelected(action: () => Promise<{ data: UserDetail }>, toast: string) {
    if (!selected) return;
    setMessage('');
    try {
      const res = await action();
      setSelected(res.data);
      setNoteDraft(res.data.adminNote || '');
      setMessage(toast);
      refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '操作失败');
    }
  }

  return (
    <>
      <header className="workspace-header glass-panel">
        <div>
          <span className="eyebrow">USER OPERATIONS</span>
          <h1>用户管理</h1>
          <p>{formatTime(new Date().toISOString())} · 数据状态实时同步</p>
        </div>
        <button onClick={() => refresh()} disabled={loading}>{loading ? '同步中' : '刷新'}</button>
      </header>

      <section className="metrics">
        <Metric label="用户总数" value={overview?.totalUsers || 0} hint={`${activeRate}% 活跃`} />
        <Metric label="正常用户" value={overview?.activeUsers || 0} hint="可使用小程序" />
        <Metric label="停用用户" value={overview?.disabledUsers || 0} hint="登录会被拦截" />
        <Metric label="管理员" value={overview?.adminUsers || 0} hint="可访问管理端" />
      </section>

      <form className="filters glass-panel" onSubmit={applyFilters}>
        <input value={filters.keyword} onChange={event => setFilters({ ...filters, keyword: event.target.value })} placeholder="搜索昵称或 ID" />
        <input value={filters.city} onChange={event => setFilters({ ...filters, city: event.target.value })} placeholder="城市" />
        <select value={filters.status} onChange={event => setFilters({ ...filters, status: event.target.value as '' | UserStatus })}>
          <option value="">全部状态</option>
          <option value="active">正常</option>
          <option value="disabled">停用</option>
        </select>
        <select value={filters.level} onChange={event => setFilters({ ...filters, level: event.target.value })}>
          <option value="">全部等级</option>
          <option value="1">L1 萌新</option>
          <option value="2">L2 进阶</option>
          <option value="3">L3 高级</option>
          <option value="4">Pro 大神</option>
        </select>
        <button type="submit">查询</button>
      </form>

      {message && <div className="message glass-panel">{message}</div>}

      <section className="table-wrap glass-panel">
        <div className="table-meta">共 {total} 位用户</div>
        <table>
          <thead>
            <tr><th>用户</th><th>等级</th><th>城市</th><th>状态</th><th>角色</th><th>战绩</th><th>最近活跃</th></tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id} onClick={() => openDetail(user)}>
                <td><strong>{user.nickname}</strong><span>ID {user.id}</span></td>
                <td>{levelText[user.level || 1]}</td>
                <td>{user.city || '未设置'}</td>
                <td><Badge tone={user.status === 'active' ? 'green' : 'red'}>{user.status === 'active' ? '正常' : '停用'}</Badge></td>
                <td><Badge tone={user.role === 'admin' ? 'blue' : 'gray'}>{user.role === 'admin' ? '管理员' : '用户'}</Badge></td>
                <td>{user.wins}/{user.totalMatches} · {user.winRate}%</td>
                <td>{formatTime(user.lastActiveAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="pager">
          <button disabled={(filters.page || 1) <= 1} onClick={() => setFilters({ ...filters, page: (filters.page || 1) - 1 })}>上一页</button>
          <span>{filters.page || 1} / {totalPages}</span>
          <button disabled={(filters.page || 1) >= totalPages} onClick={() => setFilters({ ...filters, page: (filters.page || 1) + 1 })}>下一页</button>
        </div>
      </section>

      {selected && (
        <aside className="detail-panel glass-panel">
          <button className="panel-close" onClick={() => setSelected(null)}>×</button>
          <h2>{selected.nickname}</h2>
          <p>ID {selected.id} · {levelText[selected.level || 1]} · {selected.city || '未设置城市'}</p>
          <div className="detail-grid">
            <Metric label="积分" value={selected.points} hint="当前积分" />
            <Metric label="打球时长" value={`${selected.totalHours}h`} hint="累计" />
            <Metric label="打卡" value={selected.checkins} hint="历史记录" />
            <Metric label="约球" value={selected.joinedPosts} hint="参与记录" />
          </div>
          <div className="panel-actions">
            <button onClick={() => {
              const nextStatus = selected.status === 'active' ? 'disabled' : 'active';
              const label = nextStatus === 'disabled' ? '停用' : '恢复';
              if (!window.confirm(`确认${label}账号「${selected.nickname}」？`)) return;
              mutateSelected(() => updateUserStatus(selected.id, nextStatus), '状态已更新');
            }}>
              {selected.status === 'active' ? '停用账号' : '恢复账号'}
            </button>
            <button onClick={() => {
              const nextRole = selected.role === 'admin' ? 'user' : 'admin';
              const label = nextRole === 'admin' ? '设为管理员' : '取消管理员';
              if (!window.confirm(`确认对「${selected.nickname}」执行：${label}？`)) return;
              mutateSelected(() => updateUserRole(selected.id, nextRole), '角色已更新');
            }}>
              {selected.role === 'admin' ? '取消管理员' : '设为管理员'}
            </button>
          </div>
          <label className="note-box">
            <span>管理备注</span>
            <textarea value={noteDraft} onChange={event => setNoteDraft(event.target.value)} maxLength={1000} />
          </label>
          <button className="save-note" onClick={() => mutateSelected(() => updateUserNote(selected.id, noteDraft), '备注已保存')}>保存备注</button>
        </aside>
      )}
    </>
  );
}
