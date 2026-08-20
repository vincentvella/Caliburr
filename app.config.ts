import type { ExpoConfig } from 'expo/config';

// `app.config.ts` is evaluated at build/run time, which lets us pull secrets
// out of source. Currently `GOOGLE_SERVICES_FILE` is the only env-driven path:
// locally it's set in .env.local; on EAS it's materialized from a file env var
// uploaded via `eas env:create --type file`.

const config: ExpoConfig = {
  name: 'Caliburr',
  slug: 'caliburr',
  version: '1.2.0',
  orientation: 'default',
  icon: './assets/images/icon.png',
  scheme: 'caliburr',
  userInterfaceStyle: 'automatic',
  // OTA updates. `fingerprint` hashes the native inputs and only serves an
  // update to builds whose native layer matches, so a JS bundle can never land
  // on a binary it wasn't built against — the failure mode that makes OTA
  // dangerous. The same hash backs the build-skipping in .eas/workflows.
  //
  // Only builds that ship expo-updates can receive updates, so this takes
  // effect from 1.1.0 onward; earlier installs still need a store release.
  runtimeVersion: {
    policy: 'fingerprint',
  },
  updates: {
    url: 'https://u.expo.dev/60b72a75-9e30-4e7f-bd89-ba85a6fcf7db',
    // Both pinned rather than left to defaults, so the non-blocking launch
    // behaviour is visible in review. fallbackToCacheTimeout: 0 means the app
    // never waits on the network at startup — it launches from the embedded
    // bundle and fetches any update in the background for the next launch.
    // A nonzero value would block startup on a request, which reads as a hang
    // to an App Review device on a throttled connection, and would make the app
    // appear to require a download to function (App Store guideline 2.5.2).
    // Every build embeds a bundle, so the app is fully functional offline.
    fallbackToCacheTimeout: 0,
    checkAutomatically: 'ON_LOAD',
  },
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
    'expo-status-bar',
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
        photosPermission: 'Choose a photo of your equipment to help other users identify it.',
      },
    ],
    [
      'expo-notifications',
      {
        color: '#ff9d37',
        defaultChannel: 'default',
      },
    ],
    // AppCheckCore 11.3.1 (pulled in transitively by google-signin via
    // GoogleSignIn ~> 9.0) is a Swift pod that depends on GoogleUtilities and
    // RecaptchaInterop, neither of which defines a module — so CocoaPods can no
    // longer integrate it as a static library. Pod versions float and
    // Podfile.lock isn't committed under CNG, so this broke iOS builds with no
    // change on our side. Opting those two into module maps is the fix
    // CocoaPods itself recommends. See VEL-93.
    [
      'expo-build-properties',
      {
        ios: {
          extraPods: [
            { name: 'GoogleUtilities', modular_headers: true },
            { name: 'RecaptchaInterop', modular_headers: true },
          ],
        },
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
        iosUrlScheme: 'com.googleusercontent.apps.694968860911-dveckbiuj3cnc9h61ec46dckrj2plvr4',
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
