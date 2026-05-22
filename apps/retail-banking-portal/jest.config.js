/** @type {import('jest').Config} */
const path = require('path');
const { createCjsPreset } = require('jest-preset-angular/presets');
const cjsPreset = createCjsPreset();

module.exports = {
  ...cjsPreset,
  resolver: '<rootDir>/jest-resolver.js',
  setupFilesAfterEnv: ['<rootDir>/setup-jest.ts'],
  roots: ['<rootDir>/src', '<rootDir>/../../libs/shared-data-access/src'],
  coverageThreshold: {
    global: { branches: 80, functions: 80, lines: 80, statements: 80 }
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.module.ts',
    '!src/main.ts',
    '!src/environments/**'
  ],
  moduleNameMapper: {
    ...cjsPreset.moduleNameMapper,
    '@bofa/shared-data-access': '<rootDir>/../../libs/shared-data-access/src/public-api.ts',
    '@bofa/shared-ui': '<rootDir>/../../libs/shared-ui/src/public-api.ts'
  }
};
