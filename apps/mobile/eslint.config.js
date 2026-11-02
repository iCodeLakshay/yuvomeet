// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*", ".expo/*", "android/*", "ios/*"],
  },
  {
    // Debug output must not ship: use telemetry (reportError) instead of console.
    rules: { "no-console": ["error", { allow: ["warn", "error"] }] },
  },
  {
    // jest.mock factories are hoisted above imports, so they must use require().
    files: ["jest.setup.ts", "src/**/__tests__/**"],
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
]);
