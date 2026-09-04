import { describe, expect, it } from 'vitest';
import { protectedApiError } from './firebaseClient';

describe('protected callable errors', () => {
  it('identifies cloud profile storage instead of mislabeling it as report generation', () => {
    const error = protectedApiError({ code: 'functions/internal', message: 'internal' }, 'cloud profile save');

    expect(error.message).toContain('cloud profile save');
    expect(error.message).not.toContain('generating the report');
  });
});
