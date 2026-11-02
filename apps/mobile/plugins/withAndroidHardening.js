// Release hardening for the generated Android project (android/ is not committed; this
// plugin re-applies the settings on every prebuild).
//  - No cleartext HTTP. The debug manifest overrides this back to true for Metro.
//  - R8 code shrinking/obfuscation and resource shrinking for release builds.
const { withAndroidManifest, withGradleProperties } = require('expo/config-plugins');

const GRADLE = {
  'android.enableMinifyInReleaseBuilds': 'true',
  'android.enableShrinkResourcesInReleaseBuilds': 'true',
};

module.exports = function withAndroidHardening(config) {
  config = withAndroidManifest(config, (c) => {
    const app = c.modResults.manifest.application?.[0];
    if (app) app.$['android:usesCleartextTraffic'] = 'false';
    return c;
  });

  return withGradleProperties(config, (c) => {
    for (const [key, value] of Object.entries(GRADLE)) {
      c.modResults = c.modResults.filter((item) => !(item.type === 'property' && item.key === key));
      c.modResults.push({ type: 'property', key, value });
    }
    return c;
  });
};
