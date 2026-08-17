module.exports = function (api) {
  api.cache(true);
  return {
    // babel-preset-expo(SDK 54)가 react-native-worklets 플러그인을 자동으로 추가한다.
    presets: ['babel-preset-expo'],
  };
};
