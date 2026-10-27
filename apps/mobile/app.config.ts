import type { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Yuvomeet',
  slug: 'yuvomeet',
  version: '0.1.0',
  scheme: 'yuvomeet',
  orientation: 'portrait',
  userInterfaceStyle: 'dark',
  newArchEnabled: true,
  runtimeVersion: {
    policy: 'fingerprint',
  },
  android: {
    package: 'app.yuvomeet',
    minSdkVersion: 26, // Android 8.0+ per PRD §6 NFR
    adaptiveIcon: {
      backgroundColor: '#0D0E13',
    },
    permissions: [
      'android.permission.CAMERA',
      'android.permission.ACCESS_COARSE_LOCATION',
      'android.permission.ACCESS_FINE_LOCATION',
      'android.permission.VIBRATE',
    ],
    blockedPermissions: [
      'android.permission.ACCESS_BACKGROUND_LOCATION',
      'android.permission.READ_CONTACTS',
      'android.permission.WRITE_CONTACTS',
      'android.permission.READ_CALL_LOG',
      'android.permission.READ_SMS',
    ],
    config: {
      googleMaps: {
        apiKey: process.env.GOOGLE_MAPS_ANDROID_API_KEY ?? '',
      },
    },
  },
  plugins: [
    'expo-router',
    'expo-localization',
    'expo-secure-store',
    [
      'expo-location',
      {
        locationWhenInUsePermission:
          'Yuvomeet uses one-time location only when you check in at a venue (within 150m) or press SOS.',
        isAndroidBackgroundLocationEnabled: false,
      },
    ],
  ],
  extra: {
    appEnv: process.env.EXPO_PUBLIC_APP_ENV ?? 'development',
  },
});
