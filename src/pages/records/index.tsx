/**
 * 战绩记录 — 对应 table-tennis-pro 的 MatchRecordsView
 */
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import { useDidShow } from '@tarojs/taro';
import { GameRecord } from '@/types';
import { getMatchRecords } from '@/services/api';
import { INITIAL_GAME_RECORDS } from '@/data';
import './index.scss';

const DEFAULT_RECORDS: GameRecord[] = INITIAL_GAME_RECORDS;

export default function RecordsPage() {
  const [records, setRecords] = useState(DEFAULT_RECORDS);
  const [stats, setStats] = useState({ total: 156, winRate: 68.5 });

  useDidShow(() => {
    loadRecords();
  });

  const loadRecords = async () => {
    try {
      const res = await getMatchRecords(1);
      if (res.code === 0 && res.data?.items) {
        setRecords(res.data.items);
        setStats({ total: res.data.total, winRate: 0 });
      }
    } catch {}
  };

  return (
    <ScrollView className="rec-page" scrollY>
      {/* 排名卡 */}
      <View className="rec-rank-card">
        <View className="rec-rank-bg" />
        <View className="rec-rank-content">
          <Text className="rec-rank-title">大师级 L3</Text>
          <Text className="rec-rank-sub">胜点: 2,450 | 全市排名: #128</Text>
        </View>
        <Text className="rec-rank-icon">🏆</Text>
      </View>

      {/* 统计 */}
      <View className="rec-stats">
        <View className="rec-stat"><Text className="rec-stat-val">{stats.total}场</Text><Text className="rec-stat-label">总场次</Text></View>
        <View className="rec-stat"><Text className="rec-stat-val">{stats.winRate}%</Text><Text className="rec-stat-label">胜率</Text></View>
      </View>

      {/* 对局列表 */}
      <View className="rec-section-title"><Text>历史对局</Text></View>
      {records.map(r => (
        <View key={r.id} className="rec-card">
          <View className={`rec-card-strip ${r.isWin ? 'win' : 'lose'}`} />
          <View className="rec-card-body">
            <View className="rec-card-top">
              <View>
                <Text className="rec-opp-name">{r.opponentName} ({r.opponentLevel})</Text>
                <Text className="rec-time">{r.matchTime}</Text>
              </View>
              <View className="rec-score">
                <Text className={`rec-score-val ${r.isWin ? 'win' : 'lose'}`}>{r.myScore} : {r.opponentScore}</Text>
                <Text className={`rec-score-badge ${r.isWin ? 'win' : 'lose'}`}>{r.isWin ? 'VICTORY' : 'DEFEAT'}</Text>
              </View>
            </View>
            <View className="rec-loc">
              <Text className="rec-loc-text">📍 {r.locationName}</Text>
            </View>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}
