import { describe, expect, it } from 'vitest';
import { CS50_SOURCE, OPENLEARN_SOURCE } from './curated-learning-catalog.js';
import { normalizeCuratedCourse } from './curated-learning-import.js';

describe('curated learning imports', () => {
  it('normalizes a CS50 course with Harvard attribution', () => {
    const entry = CS50_SOURCE.catalog[0];
    const now = new Date('2026-10-11T12:00:00Z');
    expect(normalizeCuratedCourse(entry, CS50_SOURCE, now)).toMatchObject({
      externalKey: `cs50:${entry.externalId}`,
      slug: `cs50-${entry.externalId}`,
      type: 'COURSE',
      modality: 'REMOTE',
      organizationName: 'Harvard University',
      sourceName: 'CS50',
      sourceUrl: 'https://cs50.harvard.edu/x/',
      closingDate: null,
      lastSyncedAt: now,
      categoryNames: expect.arrayContaining([
        'Curso gratuito',
        'Certificación gratuita',
        'Inglés',
      ]),
    });
  });

  it('labels OpenLearn recognition without claiming an accredited certificate', () => {
    const result = normalizeCuratedCourse(
      OPENLEARN_SOURCE.catalog[0],
      OPENLEARN_SOURCE,
    );
    expect(result).toMatchObject({
      organizationName: 'The Open University',
      sourceName: 'OpenLearn',
      type: 'COURSE',
    });
    expect(result?.categoryNames).toContain('Insignia digital gratuita');
    expect(result?.categoryNames).toContain('Constancia de participación');
    expect(result?.categoryNames).not.toContain('Certificación gratuita');
  });

  it('rejects unsafe identifiers and URLs outside the official source', () => {
    const entry = CS50_SOURCE.catalog[0];
    expect(
      normalizeCuratedCourse(
        { ...entry, externalId: '../unsafe' },
        CS50_SOURCE,
      ),
    ).toBeNull();
    expect(
      normalizeCuratedCourse(
        { ...entry, sourceUrl: 'https://example.com/course' },
        CS50_SOURCE,
      ),
    ).toBeNull();
    expect(
      normalizeCuratedCourse(
        {
          ...OPENLEARN_SOURCE.catalog[0],
          sourceUrl: 'https://www.open.edu/another-product/course',
        },
        OPENLEARN_SOURCE,
      ),
    ).toBeNull();
  });

  it('keeps stable, unique external identifiers in both reviewed catalogs', () => {
    for (const source of [CS50_SOURCE, OPENLEARN_SOURCE]) {
      const ids = source.catalog.map((entry) => entry.externalId);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });
});
