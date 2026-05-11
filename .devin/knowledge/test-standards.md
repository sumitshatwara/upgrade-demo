# BofA Testing Standards

**Version:** 2.0.0
**Effective Date:** 2024-03-01
**Applies To:** All Angular applications and libraries in BofA Digital Banking.

---

## 1. Test Framework — Jest (REQUIRED)

**Karma/Jasmine is deprecated across all BofA Angular applications.**

All new and migrated tests MUST use **Jest** as the test runner and assertion library.

### Migration Steps (Phase 6)

1. Remove `karma.conf.js` and `src/test.ts`.
2. Install Jest dependencies:
   ```bash
   npm uninstall karma karma-chrome-launcher karma-jasmine karma-jasmine-html-reporter karma-coverage
   npm install --save-dev jest jest-environment-jsdom @jest/globals \
     jest-preset-angular @types/jest ts-jest
   ```
3. Add `jest.config.ts`:
   ```typescript
   import type { Config } from 'jest';
   export default {
     preset: 'jest-preset-angular',
     setupFilesAfterFramework: ['<rootDir>/setup-jest.ts'],
     testEnvironment: 'jsdom',
     coverageThreshold: {
       global: { branches: 80, functions: 80, lines: 80, statements: 80 }
     },
     collectCoverageFrom: [
       'src/**/*.ts',
       '!src/**/*.module.ts',
       '!src/main.ts',
       '!src/environments/**'
     ]
   } satisfies Config;
   ```
4. Update `tsconfig.spec.json` to use Jest types instead of Jasmine.
5. Replace all `describe/it/expect` Jasmine matchers with Jest equivalents.

---

## 2. Minimum Coverage Requirements

| Code Path | Minimum Coverage |
|---|---|
| `auth/` — SSO, guards, interceptors | **80%** |
| `transactions/` — list, model, filter | **80%** |
| PII-handling code paths | **80%** |
| `shared-data-access/api/` | **80%** |
| `fraud-detection.service.ts` | **80%** |
| All other paths | 60% |

Coverage is enforced via `check-coverage.sh` (see `.devin/skills/`).
Any service below threshold triggers an automated Devin session (see `test-coverage.md` playbook).

---

## 3. Compliance-Critical Path Testing

All compliance-critical paths require **edge case tests** for:

- **Null input**: Pass `null` to every public method parameter.
- **Empty input**: Pass `''`, `[]`, `{}` as appropriate.
- **Malformed input**: Pass values of the wrong type, truncated strings, negative numbers.

Example (Jest):

```typescript
describe('BankingApiService.getAccountSummarySnapshot', () => {
  it('should return undefined when observable completes with no emissions', async () => {
    const result = await service.getAccountSummarySnapshot();
    expect(result).toBeDefined();
  });

  it('should handle null accountId gracefully', () => {
    expect(() => service.getTransactions({ accountId: null as any }))
      .not.toThrow();
  });

  it('should handle malformed transaction filter dates', () => {
    const filter = { startDate: 'not-a-date', endDate: '' };
    expect(() => service.getTransactions(filter)).not.toThrow();
  });
});
```

---

## 4. Test File Naming

| File type | Convention |
|---|---|
| Unit tests | `*.spec.ts` |
| Integration tests | `*.integration.spec.ts` |
| E2E (Playwright) | `*.e2e.ts` |

All test files co-located with the source file they test.
