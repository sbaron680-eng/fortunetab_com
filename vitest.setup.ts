import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// RTL auto-cleanup (Vitest는 jest와 달리 자동 연결 없음)
afterEach(() => {
  cleanup();
});
