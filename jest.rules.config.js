module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/unit/security/**/*.test.js'],
  testTimeout: 30000,
  maxWorkers: 1,
  bail: false,
  cache: false,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true
};
