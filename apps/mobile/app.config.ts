import type { ConfigContext, ExpoConfig } from 'expo/config';

const INTER = './node_modules/@expo-google-fonts/inter';
const ICON_FONT = './node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/MaterialIcons.ttf';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Yuvomeet',
  slug: 'yuvomeet',
  version: '0.1.0',
  scheme: 'yuvomeet',
  orientation: 'portrait',
  userInterfaceStyle: 'dark',
  backgroundColor: '#121318',
  icon: './assets/icon.png',
  runtimeVersion: { policy: 'fingerprint' },
  experiments: { typedRoutes: true },
  android: {
    package: 'app.yuvomeet',
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      monochromeImage: './assets/adaptive-icon-mono.png',
      backgroundColor: '#121318',
    },
    // Camera on photo upload; one-time foreground location for check-in and SOS (privacy §7).
    permissions: ['android.permission.CAMERA', 'android.permission.ACCESS_COARSE_LOCATION', 'android.permission.ACCESS_FINE_LOCATION'],
    blockedPermissions: [
      'android.permission.ACCESS_BACKGROUND_LOCATION',
      'android.permission.READ_CONTACTS',
      'android.permission.WRITE_CONTACTS',
      'android.permission.READ_CALL_LOG',
      'android.permission.READ_SMS',
      'android.permission.RECORD_AUDIO',
    ],
    config: {
      googleMaps: { apiKey: process.env.GOOGLE_MAPS_ANDROID_API_KEY ?? '' },
    },
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    'expo-web-browser',
    [
      'expo-splash-screen',
      { image: './assets/splash-icon.png', imageWidth: 160, backgroundColor: '#121318' },
    ],
    [
      'expo-font',
      {
        fonts: [
          `${INTER}/400Regular/Inter_400Regular.ttf`,
          `${INTER}/500Medium/Inter_500Medium.ttf`,
          `${INTER}/600SemiBold/Inter_600SemiBold.ttf`,
          `${INTER}/700Bold/Inter_700Bold.ttf`,
          `${INTER}/800ExtraBold/Inter_800ExtraBold.ttf`,
          ICON_FONT,
        ],
      },
    ],
    [
      'expo-location',
      {
        locationWhenInUsePermission:
          'Yuvomeet uses your location once when you check in at a venue or press SOS. It is never tracked.',
        isAndroidBackgroundLocationEnabled: false,
      },
    ],
    [
      'expo-image-picker',
      {
        photosPermission: 'Pick profile and chat photos.',
        cameraPermission: 'Take a profile or chat photo.',
        microphonePermission: false,
      },
    ],
    ['expo-notifications', { icon: './assets/notification-icon.png', color: '#EAB308' }],
    ['@sentry/react-native/expo', { organization: process.env.SENTRY_ORG, project: process.env.SENTRY_PROJECT }],
  ],
  extra: {
    eas: { projectId: process.env.EAS_PROJECT_ID },
  },
});
