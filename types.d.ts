// Mirrors the reference in Expo's generated expo-env.d.ts, which is gitignored
// by Expo's own instruction ("should be in your git ignore") and has no
// supported regeneration command. CI therefore never has it, so `tsc` there
// could not resolve the `*.css` side-effect import in app/_layout.tsx.
//
// TypeScript 5.9 tolerated the missing reference; 6.0 does not, which is why
// this only surfaced with the SDK 57 upgrade.
/// <reference types="expo/types" />
