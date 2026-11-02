// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*", ".expo/*", "android/*", "ios/*"],
  },
  {
    // Debug output must not ship: use telemetry (reportError) instead of console.
    rules: { "no-console": ["error", { allow: ["warn", "error"] }] },
  },
]);
