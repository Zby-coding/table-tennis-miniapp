import { FormEvent, useEffect, useState } from 'react';
import {
  createAchievement,
  listAdminAchievements,
  resolveAssetUrl,
  setAchievementEnabled,
  updateAchievement,
  uploadAdminFile,
} from '../api';
import { AchievementDef } from '../types';

export default function AchievementsPage() {
  const [list, setList] = useState<AchievementDef[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    key: '',
    name: '',
    desc: '',
    icon: '🏅',
    points: 10,
    ruleType: 'checkin_count',
    ruleValue: 1,
  });

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    setMessage('');
    try {
      const res = await listAdminAchievements();
      setList(res.data);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    try {
      await createAchievement({
        ...form,
        points: Number(form.points),
        ruleValue: Number(form.ruleValue),
        enabled: true,
      });
      setMessage('勋章已创建');
      setForm({ key: '', name: '', desc: '', icon: '🏅', points: 10, ruleType: 'checkin_count', ruleValue: 1 });
      load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '创建失败');
    }
  }

  async function toggle(item: AchievementDef) {
    try {
      await setAchievementEnabled(item.id, !item.enabled);
      setMessage(item.enabled ? '已关闭' : '已启用');
      load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '操作失败');
    }
  }

  async function onUploadIcon(item: AchievementDef, file?: File | null) {
    if (!file) return;
    try {
      const uploaded = await uploadAdminFile(file);
      await updateAchievement(item.id, { iconUrl: uploaded.url });
      setMessage('图标已更新');
      load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '上传失败');
    }
  }

  return (
    <>
      <header className="workspace-header glass-panel">
        <div>
          <span className="eyebrow">MEDALS</span>
          <h1>勋章管理</h1>
          <p>按累计签到次数点亮；可上传 icon 与开关启用</p>
        </div>
        <button onClick={load} disabled={loading}>{loading ? '同步中' : '刷新'}</button>
      </header>

      {message && <div className="message glass-panel">{message}</div>}

      <form className="filters glass-panel filters-wide" onSubmit={onCreate}>
        <input required value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value })} placeholder="key 如 checkin_20" />
        <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="名称" />
        <input value={form.desc} onChange={(e) => setForm({ ...form, desc: e.target.value })} placeholder="描述" />
        <input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} placeholder="emoji" />
        <input type="number" value={form.points} onChange={(e) => setForm({ ...form, points: Number(e.target.value) })} placeholder="积分" />
        <select value={form.ruleType} onChange={(e) => setForm({ ...form, ruleType: e.target.value })}>
          <option value="checkin_count">累计签到次数</option>
          <option value="manual">手动/其他</option>
        </select>
        <input type="number" value={form.ruleValue} onChange={(e) => setForm({ ...form, ruleValue: Number(e.target.value) })} placeholder="阈值" />
        <button type="submit">新增勋章</button>
      </form>

      <section className="table-wrap glass-panel">
        <div className="table-meta">共 {list.length} 枚勋章定义</div>
        <table>
          <thead>
            <tr><th>勋章</th><th>规则</th><th>积分</th><th>状态</th><th>图标</th><th>操作</th></tr>
          </thead>
          <tbody>
            {list.map((item) => (
              <tr key={item.id}>
                <td>
                  <strong>{item.icon} {item.name}</strong>
                  <span>{item.key} · {item.desc}</span>
                </td>
                <td>{item.ruleType} ≥ {item.ruleValue}</td>
                <td>{item.points}</td>
                <td>{item.enabled ? '启用' : '关闭'}</td>
                <td>
                  {item.iconUrl ? <img src={resolveAssetUrl(item.iconUrl)} alt="" className="thumb-sm" /> : '—'}
                </td>
                <td className="row-actions">
                  <button type="button" onClick={() => toggle(item)}>{item.enabled ? '关闭' : '启用'}</button>
                  <label className="file-btn">
                    上传
                    <input type="file" accept="image/*" hidden onChange={(e) => onUploadIcon(item, e.target.files?.[0])} />
                  </label>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
