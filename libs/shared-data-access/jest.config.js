/** @type {import('jest').Config} */
const { createCjsPreset } = require('jest-preset-angular/presets');
const cjsPreset = createCjsPreset();

module.exports = {
  ...cjsPreset,
  setupFilesAfterEnv: ['<rootDir>/setup-jest.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/public-api.ts'
  ],
  moduleNameMapper: {
    ...cjsPreset.moduleNameMapper
  }
};
