import { useEffect, useState } from 'react';
import { approveBackground, listAdminBackgrounds, rejectBackground, resolveAssetUrl } from '../api';

interface BgRow {
  id: number;
  courtId: number;
  courtName: string;
  userId: number;
  nickname: string;
  url: string;
  status: string;
  rejectReason?: string | null;
  createdAt: string;
}

function assetUrl(url: string) {
  return resolveAssetUrl(url);
}

function formatTime(value?: string | null) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

export default function BackgroundAuditPage() {
  const [status, setStatus] = useState('pending');
  const [list, setList] = useState<BgRow[]>([]);
  const [total, setTotal] = useState(0);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    load();
  }, [status]);

  async function load() {
    setLoading(true);
    setMessage('');
    try {
      const res = await listAdminBackgrounds({ status, page: 1, pageSize: 50 });
      setList(res.data.list as BgRow[]);
      setTotal(res.data.total);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }

  async function onApprove(id: number) {
    try {
      await approveBackground(id);
      setMessage('已通过，小程序详情将展示新实拍');
      load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '操作失败');
    }
  }

  async function onReject(id: number) {
    const reason = window.prompt('驳回原因（可选）', '不符合实拍要求') || undefined;
    try {
      await rejectBackground(id, reason);
      setMessage('已驳回');
      load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '操作失败');
    }
  }

  return (
    <>
      <header className="workspace-header glass-panel">
        <div>
          <span className="eyebrow">MEDIA REVIEW</span>
          <h1>背景审核</h1>
          <p>用户投稿场点实拍，通过后自动回写小程序详情</p>
        </div>
        <button onClick={load} disabled={loading}>{loading ? '同步中' : '刷新'}</button>
      </header>

      <div className="tab-row glass-panel">
        {['pending', 'approved', 'rejected', ''].map((s) => (
          <button key={s || 'all'} className={status === s ? 'nav-active' : ''} onClick={() => setStatus(s)}>
            {s === 'pending' ? '待审' : s === 'approved' ? '已通过' : s === 'rejected' ? '已驳回' : '全部'}
          </button>
        ))}
      </div>

      {message && <div className="message glass-panel">{message}</div>}

      <section className="table-wrap glass-panel">
        <div className="table-meta">共 {total} 条投稿</div>
        <table>
          <thead>
            <tr><th>预览</th><th>场地</th><th>用户</th><th>状态</th><th>时间</th><th>操作</th></tr>
          </thead>
          <tbody>
            {list.map((row) => (
              <tr key={row.id}>
                <td><img className="thumb-md" src={assetUrl(row.url)} alt="" /></td>
                <td><strong>{row.courtName}</strong><span>CID {row.courtId}</span></td>
                <td><strong>{row.nickname}</strong><span>UID {row.userId}</span></td>
                <td>{row.status}{row.rejectReason ? ` · ${row.rejectReason}` : ''}</td>
                <td>{formatTime(row.createdAt)}</td>
                <td className="row-actions">
                  {row.status === 'pending' ? (
                    <>
                      <button type="button" onClick={() => onApprove(row.id)}>通过</button>
                      <button type="button" className="btn-muted" onClick={() => onReject(row.id)}>驳回</button>
                    </>
                  ) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
