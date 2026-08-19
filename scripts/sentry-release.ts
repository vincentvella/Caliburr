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
 * Nothing in here may fail the build. The artifact is already built and good by
 * the time this runs; release bookkeeping is not worth throwing that away, so
 * every failure is logged and swallowed.
 *
 * Usage: bun run scripts/sentry-release.ts [--dry-run] [ios|android]
 */

import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const BUNDLE_ID = 'coffee.caliburr.app';
const SENTRY_ORG = 'vellapps-s1';
const SENTRY_PROJECT = 'caliburr';
const DRY_RUN = process.argv.includes('--dry-run');

function iosVersion(): { version: string; build: string } {
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
  // sentry.properties lives in ios/ and android/, not the working directory, so
  // the builder can't resolve org/project from it — pass them explicitly.
  const full = [
    args[0],
    args[1],
    '--org',
    SENTRY_ORG,
    '--project',
    SENTRY_PROJECT,
    ...args.slice(2),
  ];
  if (DRY_RUN) {
    console.log(`[dry-run] sentry-cli ${full.join(' ')}`);
    return;
  }
  execFileSync('node_modules/.bin/sentry-cli', full, { stdio: 'inherit' });
}

function main() {
  const platform = process.env.EAS_BUILD_PLATFORM ?? process.argv[2];
  if (platform !== 'ios' && platform !== 'android') {
    console.log(`Not a recognised platform (${platform ?? 'unset'}) — skipping.`);
    return;
  }

  // Only production builds get a remote version applied. `autoIncrement` is set
  // on the production profile alone, so a preview build's native project still
  // carries the template default (build 1) and would register a junk release
  // that matches no runtime event.
  const profile = process.env.EAS_BUILD_PROFILE;
  if (profile && profile !== 'production') {
    console.log(`Build profile is "${profile}", not production — skipping release registration.`);
    return;
  }

  // Local `expo run:*` builds have no token and shouldn't create releases.
  if (!DRY_RUN && !process.env.SENTRY_AUTH_TOKEN) {
    console.log('SENTRY_AUTH_TOKEN not set — skipping Sentry release registration.');
    return;
  }

  const { version, build } = platform === 'ios' ? iosVersion() : androidVersion();
  const release = `${BUNDLE_ID}@${version}+${build}`;

  console.log(`Registering Sentry release ${release} (${platform})`);
  sentry('releases', 'new', release);

  // Commit association needs a repository integration configured in Sentry; it's
  // a nice-to-have, so don't let it stop the release being finalized.
  try {
    sentry('releases', 'set-commits', release, '--auto', '--ignore-missing');
  } catch {
    console.log('Could not associate commits (no repo integration?) — continuing.');
  }

  sentry('releases', 'finalize', release);
  console.log(`Sentry release ${release} registered.`);
}

// The build artifact is already good by the time this hook runs. Never fail it
// over release bookkeeping — log loudly and exit clean.
try {
  main();
} catch (err) {
  console.warn('Sentry release registration failed — continuing so the build still passes.');
  console.warn(err instanceof Error ? err.message : String(err));
}

process.exit(0);
