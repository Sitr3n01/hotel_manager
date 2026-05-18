// Quality Gate configuration
//
// Adapted from the canonical template for the Hotel Fazenda system
// (Next.js + TypeScript + Supabase + Prisma).
//
// Modes:
//   - report:   collect + write JSON/MD, always exit 0
//   - check:    collect + compare against baseline.json, exit 1 if blocking regression
//   - baseline: collect current metrics and overwrite quality/baseline.json
//
// Default posture: ratchet-first, legacy-friendly. The project is new and
// coverage will start near zero — we only block regressions, not absolute
// floors. Strict mode (severity: "blocking" on minimums) is opt-in once the
// project has real coverage.

module.exports = {
  projectType: "auto",

  coverage: {
    enabled: true,
    mode: "ratchet",
    allowDecrease: false,
    metrics: ["lines", "statements", "functions", "branches"],
    minimums: {
      enabled: false,
      severity: "warning",
      lines: 80,
      statements: 80,
      functions: 80,
      branches: 70,
    },
    minimumDeltaToReport: 0.01,
    blockOnMissingCoverageFile: false,
    coverageSummaryPaths: [
      "coverage/coverage-summary.json",
      "coverage/coverage-final.json",
    ],
  },

  audit: {
    enabled: true,
    npmAuditJsonPath: "reports/audit/npm-audit.json",
    blockLevels: ["critical"],
    warnLevels: ["high", "moderate"],
    infoLevels: ["low"],
    blockOnMissingReport: false,
  },

  lint: {
    enabled: true,
    mode: "ratchet",
    allowNewErrors: false,
    allowNewWarnings: false,
    warningIncreaseSeverity: "warning",
    eslintJsonPath: "reports/eslint/eslint.json",
    blockOnMissingReport: false,
  },

  duplication: {
    enabled: true,
    mode: "ratchet",
    allowIncrease: false,
    maximum: {
      enabled: true,
      severity: "warning",
      percentage: 3.0,
    },
    jscpdJsonPaths: [
      "reports/duplication/jscpd-report.json",
      "reports/duplication/jscpd.json",
    ],
    blockOnMissingReport: false,
  },

  files: {
    enabled: true,
    include: [
      "app/**/*.ts",
      "app/**/*.tsx",
      "components/**/*.ts",
      "components/**/*.tsx",
      "lib/**/*.ts",
      "lib/**/*.tsx",
      "prisma/**/*.ts",
      "tests/**/*.ts",
      "tests/**/*.tsx",
      "proxy.ts",
    ],
    exclude: [
      "node_modules/**",
      ".next/**",
      "dist/**",
      "build/**",
      "coverage/**",
      "reports/**",
      ".git/**",
      "components/ui/**",
      ".claude/**",
      ".agents/**",
      "scripts/quality/**",
      "**/*.d.ts",
    ],
    warnLines: 500,
    maxLinesNewFile: 800,
    maxLinesExistingFile: 1200,
    blockIfOversizedFileGrows: true,
  },

  complexity: {
    enabled: true,
    eslintJsonPath: "reports/complexity/eslint-complexity.json",
    maxDepth: 4,
    maxCyclomaticComplexity: 10,
    maxFunctionLines: 80,
    blockOnRegression: true,
    heuristicFallback: true,
  },

  pullRequest: {
    maxChangedFilesWarning: 30,
    maxChangedLinesWarning: 800,
    maxChangedLinesBlock: 1500,
  },

  aiReview: {
    enabled: true,
    aiIsNeverAuthoritative: true,
    blockOnlyDeterministicFindings: true,
  },
};
