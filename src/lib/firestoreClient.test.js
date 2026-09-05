import { createRequire } from 'node:module';
import { describe, expect, it, vi } from 'vitest';

const require = createRequire(import.meta.url);
const { createFirestore, firestoreSettings } = require('../../functions/firestoreClient.js');

describe('server Firestore client', () => {
  it('uses REST transport for callable writes', () => {
    const app = {};
    const firestore = {};
    const initialize = vi.fn(() => firestore);
    const env = { K_SERVICE: 'saveprofile' };

    expect(createFirestore(app, initialize, env)).toBe(firestore);
    expect(initialize).toHaveBeenCalledWith(app, firestoreSettings);
    expect(firestoreSettings).toEqual({ preferRest: true });
    expect(env.GCE_METADATA_HOST).toBe('metadata.google.internal.');
  });
});
