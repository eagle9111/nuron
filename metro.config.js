const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

config.resolver.unstable_enablePackageExports = false;

config.resolver.assetExts.push(
  'glb',
  'gltf', 
  'obj',
  'mtl',
  'fbx',
  '3ds',
  'dae',
  'bin',
  'texture',
  'hdr',
  'exr',
  'ktx',
  'basis'
);

config.resolver.sourceExts.push('jsx', 'js', 'ts', 'tsx', 'json');

config.transformer.assetPlugins = ['expo-asset/tools/hashAssetFiles'];

config.transformer.minifierConfig = {
  keep_classnames: true,
  keep_fnames: true,
  mangle: {
    keep_classnames: true,
    keep_fnames: true,
  },
};

config.resolver.platforms = ['native', 'web', 'ios', 'android'];

module.exports = config;