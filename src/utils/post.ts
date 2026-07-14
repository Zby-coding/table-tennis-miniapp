import { MatchPost } from '@/types';

export const parsePostId = (id: string): number | null => {
  const numId = parseInt(id.replace('post_', ''), 10);
  return Number.isNaN(numId) ? null : numId;
};

export const getStatusColor = (post: MatchPost): string => {
  if (post.status === '已满员') return '#999';
  if (post.status === '最后1席') return '#F59E0B';
  if (post.status === '已取消' || post.status === '已结束') return '#bbb';
  return '#0F9D58';
};

export const formatFee = (post: Pick<MatchPost, 'feeType' | 'feeValue'>): string => {
  if (post.feeType === '免费') return '免费';
  if (post.feeType === 'AA制') return post.feeValue > 0 ? `AA制 ¥${post.feeValue}/人` : 'AA制';
  return post.feeValue > 0 ? `付费 ¥${post.feeValue}` : '付费';
};

export const toIsoStartTime = (date: string, time: string): string => {
  return new Date(`${date}T${time}:00`).toISOString();
};

export const splitStartTime = (startTime?: string): { date: string; time: string } => {
  if (!startTime) return { date: '', time: '' };
  const d = new Date(startTime);
  if (Number.isNaN(d.getTime())) return { date: '', time: '' };
  const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  return { date, time };
};

export const isPostEnded = (post: MatchPost): boolean =>
  post.status === '已结束' || post.status === '已取消';

export const isPostFull = (post: MatchPost): boolean =>
  post.joinedCount >= post.totalCapacity || post.status === '已满员';
