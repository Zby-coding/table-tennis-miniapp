export default {
  pages: [
    'pages/index/index',
    'pages/square/index',
    'pages/profile/index',
    'pages/profile-edit/index',
    'pages/court-detail/index',
    'pages/post-detail/index',
    'pages/favorites/index',
    'pages/records/index',
    'pages/settings/index',
    'pages/social/index',
  ],
  // 按需注入: 仅注入当前页面所需的自定义组件和页面代码
  // 未访问的页面、未声明的自定义组件不会被加载和初始化,降低启动时间和运行时内存
  // 基础库 2.11.1+ 支持, 2.11.1 以下兼容但无优化效果
  lazyCodeLoading: 'requiredComponents',
  window: {
    navigationBarBackgroundColor: '#FF6B35',
    navigationBarTextStyle: 'white',
    navigationBarTitleText: 'TableTennisPro',
    backgroundColor: '#F5F5F5',
  },
  tabBar: {
    color: '#999999',
    selectedColor: '#FF6B35',
    backgroundColor: '#FFFFFF',
    borderStyle: 'white',
    list: [
      {
        pagePath: 'pages/index/index',
        text: '首页',
        iconPath: 'assets/tab-home.png',
        selectedIconPath: 'assets/tab-home-active.png',
      },
      {
        pagePath: 'pages/square/index',
        text: '广场',
        iconPath: 'assets/tab-square.png',
        selectedIconPath: 'assets/tab-square-active.png',
      },
      {
        pagePath: 'pages/social/index',
        text: '社交',
        iconPath: 'assets/tab-social.png',
        selectedIconPath: 'assets/tab-social-active.png',
      },
      {
        pagePath: 'pages/profile/index',
        text: '我的',
        iconPath: 'assets/tab-me.png',
        selectedIconPath: 'assets/tab-me-active.png',
      },
    ],
  },
  permission: {
    'scope.userLocation': {
      desc: '获取您的位置以展示附近乒乓球场地',
    },
  },
  requiredPrivateInfos: ['getLocation'],
  sitemapLocation: 'sitemap.json',
};
