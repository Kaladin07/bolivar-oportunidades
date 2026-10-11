import { describe, expect, it } from 'vitest';
import {
  normalizeFreeCodeCampCertification,
  parseFreeCodeCampCertifications,
} from './freecodecamp-import.js';

const markdown = `
### Certifications

freeCodeCamp offers free developer certifications:

- [Certificate One](https://www.freecodecamp.org/learn/certificate-one/)
- [Certificate Two](https://www.freecodecamp.org/learn/certificate-two/)
- [Certificate Three](https://www.freecodecamp.org/learn/certificate-three/)
- [Certificate Four](https://www.freecodecamp.org/learn/certificate-four/)
- [Certificate Five](https://www.freecodecamp.org/learn/certificate-five/)
- [Unsafe](https://example.com/learn/unsafe/)

### The Learning Platform
`;

describe('freeCodeCamp certification import', () => {
  it('discovers current certifications from the official README', () => {
    const courses = parseFreeCodeCampCertifications(markdown);
    expect(courses).toHaveLength(5);
    expect(courses[0]).toEqual({
      externalId: 'certificate-one',
      title: 'Certificate One',
      description: 'freeCodeCamp offers free developer certifications:',
      sourceUrl: 'https://www.freecodecamp.org/learn/certificate-one/',
    });
  });

  it('rejects an incomplete snapshot before deactivating existing records', () => {
    expect(() =>
      parseFreeCodeCampCertifications(`
### Certifications
- [Only one](https://www.freecodecamp.org/learn/only-one/)
### The Learning Platform
`),
    ).toThrow('snapshot is incomplete');
  });

  it('normalizes externally supplied descriptions with no local course record', () => {
    const entry = parseFreeCodeCampCertifications(markdown)[0];
    const now = new Date('2026-10-11T12:00:00Z');
    expect(normalizeFreeCodeCampCertification(entry, now)).toMatchObject({
      externalKey: 'freecodecamp:certificate-one',
      title: 'Certificate One',
      description: 'freeCodeCamp offers free developer certifications:',
      sourceActive: true,
      lastSyncedAt: now,
      categoryNames: ['Curso gratuito', 'Certificación gratuita'],
    });
  });
});
