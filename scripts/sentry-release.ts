/**
 * Registers a Sentry release for the build that just finished.
 *
 * @sentry/react-native v8 uploads source maps as Debug ID-keyed artifact
 * bundles, which carry no release/dist association — symbolication works, but
 * nothing ever writes a row to Sentry's release registry. Without that row a
 * build is invisible on the Releases page and can't be used to resolve an
 * issue ("resolved in <version>"), so releases only ever appeared for builds
 * that happened to crash and got auto-created on event ingest.
 *
 * This runs as the `eas-build-on-success` hook, after prebuild and the version
 * bump, so the native project holds the real version + build number that the
 * SDK will report at runtime. The release name matches the SDK's own
 * auto-detected format exactly: <bundleId>@<version>+<buildNumber>.
 *
 * Usage: bun run scripts/sentry-release.ts [--dry-run]
 */

import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const BUNDLE_ID = 'coffee.caliburr.app';
const DRY_RUN = process.argv.includes('--dry-run');

function iosVersion(): { version: string; build: string } {
  // The Expo template writes literal values into Info.plist (not the
  // $(MARKETING_VERSION) placeholders bare React Native uses).
  // Pods/ also holds an Info.plist, so pick the one that actually carries the
  // app's version keys.
  const plist = readdirSync('ios', { withFileTypes: true })
    .filter((e) => e.isDirectory() && e.name !== 'Pods')
    .map((e) => {
      try {
        return readFileSync(join('ios', e.name, 'Info.plist'), 'utf8');
      } catch {
        return '';
      }
    })
    .find((c) => c.includes('CFBundleShortVersionString'));
  if (!plist) throw new Error('no app Info.plist found under ios/');
  const read = (key: string) => {
    const m = plist.match(new RegExp(`<key>${key}</key>\\s*<string>([^<]+)</string>`));
    if (!m) throw new Error(`${key} not found in Info.plist`);
    return m[1];
  };
  return { version: read('CFBundleShortVersionString'), build: read('CFBundleVersion') };
}

function androidVersion(): { version: string; build: string } {
  const gradle = readFileSync('android/app/build.gradle', 'utf8');
  const version = gradle.match(/versionName\s+"([^"]+)"/)?.[1];
  const build = gradle.match(/versionCode\s+(\d+)/)?.[1];
  if (!version || !build) throw new Error('versionName/versionCode not found in build.gradle');
  return { version, build };
}

function sentry(...args: string[]) {
  if (DRY_RUN) {
    console.log(`[dry-run] sentry-cli ${args.join(' ')}`);
    return;
  }
  execFileSync('node_modules/.bin/sentry-cli', args, { stdio: 'inherit' });
}

const platform = process.env.EAS_BUILD_PLATFORM ?? process.argv[2];
if (platform !== 'ios' && platform !== 'android') {
  throw new Error(`expected EAS_BUILD_PLATFORM to be ios or android, got ${platform ?? '(unset)'}`);
}

// Local `expo run:*` builds have no token and shouldn't create releases.
if (!DRY_RUN && !process.env.SENTRY_AUTH_TOKEN) {
  console.log('SENTRY_AUTH_TOKEN not set — skipping Sentry release registration.');
  process.exit(0);
}

const { version, build } = platform === 'ios' ? iosVersion() : androidVersion();
const release = `${BUNDLE_ID}@${version}+${build}`;

console.log(`Registering Sentry release ${release} (${platform})`);
sentry('releases', 'new', release);

// Commit association needs a repository integration configured in Sentry; it's
// a nice-to-have, so don't fail the build over it.
try {
  sentry('releases', 'set-commits', release, '--auto', '--ignore-missing');
} catch {
  console.log('Could not associate commits (no repo integration?) — continuing.');
}

sentry('releases', 'finalize', release);
console.log(`Sentry release ${release} registered.`);
