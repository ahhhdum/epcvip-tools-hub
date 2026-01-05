/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/../wordle/utils'],
  testMatch: ['**/*.test.ts', '**/*.test.js'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.test.ts', '!src/index.ts'],
  coverageDirectory: 'coverage',
  verbose: true,
  transform: {
    // Use ts-jest for TypeScript files in CommonJS mode
    '^.+\\.ts$': ['ts-jest', { useESM: false }],
  },
  transformIgnorePatterns: [],
};
