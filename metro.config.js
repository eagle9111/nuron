const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);
const isProduction = process.env.NODE_ENV === 'production' || process.env.EXPO_PRODUCTION === 'true';

config.resolver.unstable_enablePackageExports = false;
config.resolver.sourceExts.push('jsx', 'js', 'ts', 'tsx', 'json');
config.transformer.assetPlugins = ['expo-asset/tools/hashAssetFiles'];

config.transformer.minifierConfig = {
  keep_classnames: !isProduction,
  keep_fnames: !isProduction,
  mangle: {
    keep_classnames: !isProduction,
    keep_fnames: !isProduction,
  },
  ...(isProduction && {
    ecma: 2018,
    compress: {
      drop_console: false,
      drop_debugger: true,
      pure_getters: true,
      unsafe: true,
      unsafe_comps: true,
      warnings: false,
    },
    output: {
      comments: false,
    },
  }),
};

config.resolver.platforms = ['native', 'web', 'ios', 'android'];

if (isProduction) {
  config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];
}

config.transformer.getTransformOptions = async () => ({
  transform: {
    experimentalImportSupport: false,
    inlineRequires: isProduction,
  },
});

module.exports = config;