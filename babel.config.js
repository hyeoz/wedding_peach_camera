module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // react-native-reanimated/plugin is included in babel-preset-expo (SDK 50+),
    // so it does not need to be listed here.
  };
};
