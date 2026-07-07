import React, { PropsWithChildren } from 'react';
import { useLaunch } from '@tarojs/taro';
import { login, setToken, getToken } from '@/services/api';
import './app.scss';

function App({ children }: PropsWithChildren<{}>) {
  useLaunch(async () => {
    console.log('🏓 TableTennisPro 小程序启动');

    // 尝试自动登录
    const existingToken = getToken();
    if (existingToken) {
      console.log('已有 token，跳过登录');
      return;
    }

    try {
      const res = await login('miniapp_auto', '球友');
      if (res.code === 0 && res.data?.token) {
        setToken(res.data.token);
        console.log('游客登录成功');
      }
    } catch (err) {
      console.warn('自动登录失败:', err);
    }
  });

  return <>{children}</>;
}

export default App;
