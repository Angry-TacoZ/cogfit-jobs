import { createRequire } from 'node:module';
import { describe, expect, it, vi } from 'vitest';

const require = createRequire(import.meta.url);
const { createFirestore, firestoreSettings } = require('../../functions/firestoreClient.js');

describe('server Firestore client', () => {
  it('uses REST transport for callable writes', () => {
    const app = {};
    const firestore = {};
    const initialize = vi.fn(() => firestore);

    expect(createFirestore(app, initialize)).toBe(firestore);
    expect(initialize).toHaveBeenCalledWith(app, firestoreSettings);
    expect(firestoreSettings).toEqual({ preferRest: true });
  });
});
