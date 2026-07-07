module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['taro', {
        framework: 'react',
        ts: true,
      }],
    ],
  };
};
