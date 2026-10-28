// Learn more: https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// posthog-react-native optionally requires react-native-svg (inside try/catch) for survey icons.
// pnpm auto-installs that optional peer, and its JS imports Node's `buffer`, which breaks the
// bundle. The app uses no SVG and ships no native SVG module, so resolve it to an empty module.
const EMPTY_MODULES = new Set(['react-native-svg']);
const upstreamResolve = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (EMPTY_MODULES.has(moduleName)) return { type: 'empty' };
  return upstreamResolve ? upstreamResolve(context, moduleName, platform) : context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
