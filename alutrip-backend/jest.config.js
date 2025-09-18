/** @type {import('jest').Config} */
module.exports = {
  // Test environment
  preset: 'ts-jest',
  testEnvironment: 'node',

  // Root directory for tests
  rootDir: '.',

  // Test match patterns
  testMatch: [
    '<rootDir>/tests/**/*.test.ts',
    '<rootDir>/tests/**/*.spec.ts'
  ],

  // Coverage configuration
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/app.ts',
    '!src/types/**',
    '!src/constants/**',
    '!src/config/**',
    '!dist/**',
    '!node_modules/**'
  ],

  // Coverage reporters
  coverageReporters: [
    'text',
    'lcov',
    'html'
  ],

  // Coverage directory
  coverageDirectory: 'coverage',

  // Coverage thresholds (adjusted for unit tests with heavy mocking)
  coverageThreshold: {
    global: {
      branches: 30,
      functions: 40,
      lines: 30,
      statements: 30
    }
  },

  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/tests/setup.ts'
  ],

  // Module name mapping for absolute imports
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },

  // Transform configuration
  transform: {
    '^.+\\.ts$': 'ts-jest'
  },

  // Module file extensions
  moduleFileExtensions: [
    'ts',
    'tsx',
    'js',
    'jsx',
    'json'
  ],

  // Clear mocks between tests
  clearMocks: true,
  
  // Reset mocks between tests
  resetMocks: true,

  // Restore mocks after each test
  restoreMocks: true,

  // Verbose output
  verbose: true,

  // Test timeout (30 seconds for integration tests)
  testTimeout: 30000
};
