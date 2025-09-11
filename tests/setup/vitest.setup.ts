import '@testing-library/jest-dom';
import 'whatwg-fetch';
import { vi } from 'vitest';

// next/router & next/navigation mocks if needed:
vi.mock('next/navigation', () => {
  const push = vi.fn();
  const replace = vi.fn();
  return { useRouter: () => ({ push, replace, prefetch: vi.fn() }), usePathname: () => '/' };
});

// optional: suppress noisy console in tests
const ERROR = console.error;
beforeAll(() => {
  console.error = (...args: any) => {
    if (/Warning:/.test(args[0])) return;
    ERROR(...args);
  };
});
afterAll(() => {
  console.error = ERROR;
});
