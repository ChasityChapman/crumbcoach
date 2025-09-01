export default {
  preset: "ts-jest/presets/default-esm",
  testEnvironment: "node",
  roots: ["<rootDir>/tests"],
  testMatch: [
    "**/__tests__/**/*.+(ts|tsx|js)",
    "**/*.(test|spec).+(ts|tsx|js)"
  ],
  transform: {
    "^.+\\.(ts|tsx)$": ["ts-jest", {
      useESM: true
    }]
  },
  collectCoverageFrom: [
    "server/**/*.{ts,js}",
    "shared/**/*.{ts,js}",
    "!**/*.d.ts"
  ],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov", "html"],
  setupFilesAfterEnv: ["<rootDir>/tests/setup.ts"],
  testTimeout: 30000,
  extensionsToTreatAsEsm: [".ts"],
  moduleNameMapper: {
    "^@shared/(.*)$": "<rootDir>/shared/$1",
    "^@/(.*)$": "<rootDir>/client/src/$1"
  },
  transformIgnorePatterns: [
    "node_modules/(?!(.*\\.mjs$))"
  ]
};