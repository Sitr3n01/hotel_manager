// Test-environment shim for the Next.js `server-only` package.
// In production builds, importing `server-only` from a client component
// throws at build time. In Vitest (jsdom) the package is not resolvable.
// This shim is aliased in vitest.config.ts so server-marked modules can
// be imported by tests without the build-time guard tripping.
export {};
