import { describe, expect, it } from 'vitest';
import { mergeEvaluations } from './storage';

describe('mergeEvaluations', () => {
  it('deduplicates saved reports and keeps the newest evaluations first', () => {
    const older = {
      id: 'eval-older',
      jobTitle: 'Older role',
      company: 'Example Co',
      createdAt: '2026-01-01T00:00:00.000Z'
    };
    const newer = {
      id: 'eval-newer',
      jobTitle: 'Newer role',
      company: 'Example Co',
      createdAt: '2026-01-02T00:00:00.000Z'
    };
    const duplicateNewer = {
      ...newer,
      jobTitle: 'Newer role from cloud'
    };

    expect(mergeEvaluations([older, newer], [duplicateNewer])).toEqual([newer, older]);
  });
});
