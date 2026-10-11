import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  CS50_SOURCE,
  OPENLEARN_SOURCE,
  normalizeDiscoveredCourse,
  parseCourseDetail,
  parseCs50Catalog,
  parseOpenLearnCatalogPage,
} from './external-learning-import.js';

function hash(path: string) {
  return createHash('sha256').update(path).digest('hex');
}

describe('external learning imports', () => {
  it('discovers CS50 courses from the external edX catalog', () => {
    const urls = Array.from(
      { length: 5 },
      (_, index) =>
        `https://www.edx.org/learn/computer-science/harvard-university-cs50-s-course-${index + 1}`,
    );
    const courses = parseCs50Catalog(
      `<script type="application/ld+json">${JSON.stringify({ itemListElement: urls.map((url) => ({ url })) })}</script>`,
    );
    expect(courses).toHaveLength(5);
    expect(courses[0].sourceUrl).toBe(urls[0]);
  });

  it('extracts title and description from a course detail page', () => {
    expect(
      parseCourseDetail(`
        <html><head>
          <meta content="External description &amp; details" name="description">
          <meta content="CS50&#x27;s course | edX" property="og:title">
        </head><body></body></html>
      `),
    ).toEqual({
      title: "CS50's course",
      description: 'External description & details',
    });
  });

  it('discovers OpenLearn cards and safe pagination', () => {
    const parsed = parseOpenLearnCatalogPage(
      `<main>
        <article><h3><a href="/openlearn/digital-computing/sample/content-section-overview">Sample course</a></h3><p>Externally supplied course description with enough detail.</p></article>
        <a rel="next" href="/openlearn/badged-courses?page=1">Next</a>
      </main>`,
      'https://www.open.edu/openlearn/badged-courses',
    );
    expect(parsed.courses).toHaveLength(1);
    expect(parsed.courses[0]).toMatchObject({
      title: 'Sample course',
      description: 'Externally supplied course description with enough detail.',
      sourceUrl:
        'https://www.open.edu/openlearn/digital-computing/sample/content-section-overview',
    });
    expect(parsed.nextUrl).toBe(
      'https://www.open.edu/openlearn/badged-courses?page=1',
    );
  });

  it('rejects bot challenges instead of treating them as an empty snapshot', () => {
    expect(() =>
      parseOpenLearnCatalogPage(
        '<script src="/cdn-cgi/challenge-platform/orchestrate"></script>',
        'https://www.open.edu/openlearn/badged-courses',
      ),
    ).toThrow('bot challenge');
  });

  it('normalizes externally discovered data without local course records', () => {
    const path = '/openlearn/digital-computing/sample/content-section-overview';
    const result = normalizeDiscoveredCourse(
      {
        externalId: hash(path),
        title: 'Sample course',
        description: 'Description supplied by OpenLearn.',
        sourceUrl: `https://www.open.edu${path}`,
        categories: ['Curso gratuito', 'Insignia digital gratuita'],
      },
      OPENLEARN_SOURCE,
      new Date('2026-10-11T12:00:00Z'),
    );
    expect(result).toMatchObject({
      organizationName: 'The Open University',
      sourceName: 'OpenLearn',
      sourceActive: true,
      type: 'COURSE',
    });
    expect(CS50_SOURCE.organizationName).toBe('Harvard University');
  });
});
