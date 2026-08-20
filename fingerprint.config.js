/**
 * Narrows what counts as a native input for EAS build reuse and for the
 * `fingerprint` runtimeVersion policy.
 *
 * Both the preview workflow's build-skip and `runtimeVersion` in app.config.ts
 * key off this hash. When it moves, EAS cannot reuse the existing native build
 * and queues a fresh iOS + Android pair, and any OTA update published
 * afterwards stops matching the builds already installed. So a source that
 * cannot actually change the native layer is not free — it costs two builds and
 * splits the update audience.
 *
 * Two such sources were invalidating the cache in practice:
 *
 *   GitIgnore            .gitignore is hashed so that changes to what counts as
 *                        project content are noticed. This project is pure CNG —
 *                        ios/ and android/ are generated at build time and never
 *                        committed, and the generated ios/ tree is hashed
 *                        separately as `bareNativeDir`. Adding editor-tooling
 *                        ignores (.cursor/, .zed/, .mcp.json) queued two native
 *                        builds and bumped runtimeVersion for nothing.
 *
 *   PackageJsonScriptsAll  The `scripts` block is hashed, so adding a `validate`
 *                        script did the same. Scripts run on CI and on a
 *                        developer's machine, not in the native build.
 *
 * Deliberately NOT skipped, because each can genuinely change native output:
 *   - ExpoConfigVersions       version/versionCode/buildNumber land in Info.plist
 *   - ExpoConfigAssets         icon and splash are compiled in
 *   - ExpoConfigAll            would hide new config plugins
 *   - dependencies             autolinking is driven by them
 *
 * Caveat on PackageJsonScriptsAll: a script that mutates native code as a side
 * effect — a `postinstall` applying patches, say — would no longer invalidate
 * the fingerprint, and EAS would reuse a stale build. There is no such script
 * today. If one is added, drop this skip.
 */
module.exports = {
  sourceSkips: ['GitIgnore', 'PackageJsonScriptsAll'],
};
