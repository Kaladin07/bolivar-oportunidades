import { describe, expect, it } from 'vitest';
import { FREECODECAMP_CATALOG } from './freecodecamp-catalog.js';
import {
  normalizeFreeCodeCampCertification,
  parseCertificationSlugs,
} from './freecodecamp-import.js';

describe('freeCodeCamp certification import', () => {
  it('normalizes a reviewed certification with a stable official link', () => {
    const entry = FREECODECAMP_CATALOG[0];
    const now = new Date('2026-10-11T12:00:00Z');
    const result = normalizeFreeCodeCampCertification(
      entry,
      new Set([entry.slug]),
      now,
    );
    expect(result).toMatchObject({
      externalKey: `freecodecamp:${entry.slug}`,
      slug: `freecodecamp-${entry.slug}`,
      type: 'COURSE',
      modality: 'REMOTE',
      organizationName: 'freeCodeCamp',
      sourceName: 'freeCodeCamp',
      sourceUrl: `https://www.freecodecamp.org/learn/${entry.slug}`,
      closingDate: null,
      lastSyncedAt: now,
    });
    expect(result?.categoryNames).toContain('Certificación gratuita');
    expect(result?.categoryNames).toContain('Curso gratuito');
    expect(result?.categoryNames).toContain('Inglés');
  });

  it('skips a reviewed entry that is no longer in the official curriculum', () => {
    expect(
      normalizeFreeCodeCampCertification(
        FREECODECAMP_CATALOG[0],
        new Set(['another-certification']),
      ),
    ).toBeNull();
  });

  it('rejects empty or malformed official curriculum responses', () => {
    expect(() => parseCertificationSlugs({})).toThrow(
      'no certifications array',
    );
    expect(() => parseCertificationSlugs({ certifications: [] })).toThrow(
      'no valid certifications',
    );
    expect(() =>
      parseCertificationSlugs({ certifications: [null, '../unsafe'] }),
    ).toThrow('no valid certifications');
  });
});
