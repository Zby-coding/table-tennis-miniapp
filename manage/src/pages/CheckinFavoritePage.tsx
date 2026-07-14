import { FormEvent, useEffect, useState } from 'react';
import { listAdminCheckins, listAdminFavorites } from '../api';

interface Row {
  id: number;
  userId: number;
  nickname: string;
  courtId: number;
  courtName: string;
  createdAt?: string;
  startTime?: string;
  status?: number;
  courtAddress?: string;
}

function formatTime(value?: string | null) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

export default function CheckinFavoritePage() {
  const [tab, setTab] = useState<'checkins' | 'favorites'>('checkins');
  const [userId, setUserId] = useState('');
  const [courtId, setCourtId] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [list, setList] = useState<Row[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    load();
  }, [tab, page]);

  async function load(nextPage = page) {
    setLoading(true);
    setMessage('');
    try {
      const query = {
        page: nextPage,
        pageSize: 20,
        userId: userId ? Number(userId) : undefined,
        courtId: courtId ? Number(courtId) : undefined,
      };
      const res = tab === 'checkins'
        ? await listAdminCheckins(query)
        : await listAdminFavorites(query);
      setList(res.data.list as Row[]);
      setTotal(res.data.total);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }

  function onSearch(event: FormEvent) {
    event.preventDefault();
    setPage(1);
    load(1);
  }

  const totalPages = Math.max(1, Math.ceil(total / 20));

  return (
    <>
      <header className="workspace-header glass-panel">
        <div>
          <span className="eyebrow">ENGAGEMENT</span>
          <h1>收藏与签到</h1>
          <p>跨用户查看收藏场点与签到记录，同步运营数据</p>
        </div>
        <button onClick={() => load()} disabled={loading}>{loading ? '同步中' : '刷新'}</button>
      </header>

      <div className="tab-row glass-panel">
        <button className={tab === 'checkins' ? 'nav-active' : ''} onClick={() => { setTab('checkins'); setPage(1); }}>签到记录</button>
        <button className={tab === 'favorites' ? 'nav-active' : ''} onClick={() => { setTab('favorites'); setPage(1); }}>收藏列表</button>
      </div>

      <form className="filters glass-panel filters-compact" onSubmit={onSearch}>
        <input value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="用户 ID" />
        <input value={courtId} onChange={(e) => setCourtId(e.target.value)} placeholder="场地 ID" />
        <button type="submit">查询</button>
      </form>

      {message && <div className="message glass-panel">{message}</div>}

      <section className="table-wrap glass-panel">
        <div className="table-meta">共 {total} 条</div>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>用户</th>
              <th>场地</th>
              <th>{tab === 'checkins' ? '签到时间' : '收藏时间'}</th>
              {tab === 'checkins' ? <th>状态</th> : <th>地址</th>}
            </tr>
          </thead>
          <tbody>
            {list.map((row) => (
              <tr key={`${tab}-${row.id}`}>
                <td>{row.id}</td>
                <td><strong>{row.nickname || '—'}</strong><span>UID {row.userId}</span></td>
                <td><strong>{row.courtName || '—'}</strong><span>CID {row.courtId}</span></td>
                <td>{formatTime(row.startTime || row.createdAt)}</td>
                <td>
                  {tab === 'checkins'
                    ? (row.status === 1 ? '进行中' : row.status === 2 ? '已结束' : String(row.status || '—'))
                    : (row.courtAddress || '—')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="pager">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>上一页</button>
          <span>{page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>下一页</button>
        </div>
      </section>
    </>
  );
}
