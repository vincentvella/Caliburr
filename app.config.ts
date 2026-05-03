import type { ExpoConfig } from 'expo/config';

// `app.config.ts` is evaluated at build/run time, which lets us pull secrets
// out of source. Currently `GOOGLE_SERVICES_FILE` is the only env-driven path:
// locally it's set in .env.local; on EAS it's materialized from a file env var
// uploaded via `eas env:create --type file`.

const config: ExpoConfig = {
  name: 'Caliburr',
  slug: 'caliburr',
  version: '1.0.4',
  orientation: 'default',
  icon: './assets/images/icon.png',
  scheme: 'caliburr',
  userInterfaceStyle: 'automatic',
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'coffee.caliburr.app',
    associatedDomains: ['applinks:caliburr.coffee'],
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      NSPhotoLibraryUsageDescription:
        'Choose a photo of your equipment to help other users identify it.',
    },
    entitlements: {
      'aps-environment': 'production',
    },
  },
  android: {
    package: 'coffee.caliburr.app',
    googleServicesFile: process.env.GOOGLE_SERVICES_FILE,
    adaptiveIcon: {
      foregroundImage: './assets/images/adaptive-icon.png',
      backgroundColor: '#0f0300',
    },
    intentFilters: [
      {
        action: 'VIEW',
        autoVerify: true,
        data: [
          {
            scheme: 'https',
            host: 'caliburr.coffee',
          },
        ],
        category: ['BROWSABLE', 'DEFAULT'],
      },
    ],
  },
  web: {
    bundler: 'metro',
    output: 'static',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    'expo-screen-orientation',
    'expo-font',
    'expo-web-browser',
    'expo-system-ui',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#0f0300',
        // iOS handles full-bleed designed splashes natively via storyboard,
        // so use the full lockup (Caliburr + bean + tagline).
        ios: {
          image: './assets/images/splash.png',
          enableFullScreenImage_legacy: true,
          resizeMode: 'cover',
          backgroundColor: '#0f0300',
        },
        // Android 12+'s Splash Screen API expects a centered icon on a solid
        // background — full lockups don't render well. Match the platform
        // convention; brand text appears on the first app screen.
        android: {
          image: './assets/images/splash-icon.png',
          imageWidth: 240,
          resizeMode: 'contain',
          backgroundColor: '#0f0300',
        },
      },
    ],
    '@react-native-community/datetimepicker',
    [
      'expo-image-picker',
      {
        photosPermission:
          'Choose a photo of your equipment to help other users identify it.',
      },
    ],
    [
      'expo-notifications',
      {
        color: '#ff9d37',
        defaultChannel: 'default',
      },
    ],
    [
      '@sentry/react-native/expo',
      {
        url: 'https://sentry.io/',
        project: 'caliburr',
        organization: 'vellapps-s1',
      },
    ],
    'expo-apple-authentication',
    [
      '@react-native-google-signin/google-signin',
      {
        iosUrlScheme:
          'com.googleusercontent.apps.694968860911-dveckbiuj3cnc9h61ec46dckrj2plvr4',
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    router: {},
    eas: {
      projectId: '60b72a75-9e30-4e7f-bd89-ba85a6fcf7db',
    },
  },
  owner: 'vincentvella',
};

export default config;
