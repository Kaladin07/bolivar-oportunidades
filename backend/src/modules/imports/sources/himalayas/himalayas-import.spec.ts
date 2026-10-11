import { describe, expect, it } from 'vitest';
import { normalizeHimalayasJob } from './himalayas-import.js';

const now = new Date('2026-10-10T12:00:00Z');
const listing = {
  guid: 'https://himalayas.app/companies/example/jobs/junior-designer',
  title: 'Junior Designer',
  excerpt: 'Design accessible products.',
  description: '<h3>What you will do</h3><p>Design accessible products.</p><ul><li>Build prototypes</li></ul>',
  companyName: 'Example Company',
  applicationLink: 'https://himalayas.app/companies/example/jobs/junior-designer',
  pubDate: 1791547200,
  expiryDate: 1794225600,
  employmentType: 'Full Time',
  seniority: ['Entry-level'],
  minSalary: 2000,
  maxSalary: 3000,
  currency: 'USD',
  salaryPeriod: 'monthly',
  locationRestrictions: ['Colombia'],
};

describe('normalizeHimalayasJob', () => {
  it('maps a valid external listing to a stable local record', () => {
    const result = normalizeHimalayasJob(listing, now);
    expect(result).toMatchObject({
      title: 'Junior Designer',
      organizationName: 'Example Company',
      sourceName: 'Himalayas',
      modality: 'REMOTE',
      type: 'EMPLOYMENT',
      summary: 'Design accessible products.',
      salaryMin: 2000,
      salaryCurrency: 'USD',
      eligibleLocations: ['Colombia'],
    });
    expect(result?.description).toContain('Build prototypes');
    expect(result?.description).not.toContain('<h3>');
    expect(result?.externalKey).toBe(normalizeHimalayasJob(listing, now)?.externalKey);
    expect(result?.closingDate?.getTime()).toBe(1794225600 * 1000);
  });

  it('rejects expired records and unsafe application links', () => {
    expect(normalizeHimalayasJob({ ...listing, expiryDate: 1 }, now)).toBeNull();
    expect(normalizeHimalayasJob({ ...listing, applicationLink: 'javascript:alert(1)' }, now)).toBeNull();
    expect(normalizeHimalayasJob({ ...listing, applicationLink: 'https://example.com/apply' }, now)).toBeNull();
  });
});
