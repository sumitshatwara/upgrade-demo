/** @type {import('jest').Config} */
const { createCjsPreset } = require('jest-preset-angular/presets');
const cjsPreset = createCjsPreset();

module.exports = {
  ...cjsPreset,
  setupFilesAfterEnv: ['<rootDir>/setup-jest.ts'],
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
