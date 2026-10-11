import { createHash, randomUUID } from 'node:crypto';
import { Injectable, Logger, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { Modality, OpportunityType, UserRole } from '@prisma/client';
import { convert } from 'html-to-text';
import { PrismaService } from '../../../../infrastructure/database/prisma.service.js';
import { CacheService } from '../../../../infrastructure/cache/cache.service.js';

type HimalayasJob = {
  guid?: unknown;
  title?: unknown;
  excerpt?: unknown;
  companyName?: unknown;
  pubDate?: unknown;
  expiryDate?: unknown;
  applicationLink?: unknown;
  employmentType?: unknown;
  description?: unknown;
  seniority?: unknown;
  minSalary?: unknown;
  maxSalary?: unknown;
  currency?: unknown;
  salaryPeriod?: unknown;
  locationRestrictions?: unknown;
};

type HimalayasResponse = { jobs?: unknown };

export function normalizeHimalayasJob(job: HimalayasJob, now = new Date()) {
  if (typeof job.guid !== 'string' || typeof job.title !== 'string' || typeof job.excerpt !== 'string' ||
      typeof job.companyName !== 'string' || typeof job.applicationLink !== 'string') return null;
  if (!job.guid.trim() || !job.title.trim() || !job.excerpt.trim() || !job.companyName.trim()) return null;

  let sourceUrl: string;
  try {
    const url = new URL(job.applicationLink);
    if (url.protocol !== 'https:' || url.hostname !== 'himalayas.app') return null;
    sourceUrl = url.toString();
  } catch { return null; }

  const expirySeconds = typeof job.expiryDate === 'number' ? job.expiryDate : Number(job.expiryDate);
  const closingDate = Number.isFinite(expirySeconds) && expirySeconds > 0
    ? new Date(expirySeconds * (expirySeconds > 1e12 ? 1 : 1000)) : null;
  if (closingDate && (Number.isNaN(closingDate.getTime()) || closingDate <= now)) return null;

  const publishedSeconds = typeof job.pubDate === 'number' ? job.pubDate : Number(job.pubDate);
  const publishedAt = Number.isFinite(publishedSeconds) && publishedSeconds > 0
    ? new Date(publishedSeconds * (publishedSeconds > 1e12 ? 1 : 1000)) : now;
  const externalKey = `himalayas:${createHash('sha256').update(job.guid).digest('hex')}`;
  const fullDescription = typeof job.description === 'string' && job.description.trim()
    ? convert(job.description, { wordwrap: false }).trim() : '';
  const eligibleLocations = Array.isArray(job.locationRestrictions)
    ? job.locationRestrictions.map((location) => typeof location === 'string' ? location : location?.name)
      .filter((location): location is string => typeof location === 'string' && Boolean(location.trim())).slice(0, 100)
    : [];
  const salaryMin = typeof job.minSalary === 'number' && Number.isSafeInteger(job.minSalary) && job.minSalary >= 0 ? job.minSalary : null;
  const salaryMax = typeof job.maxSalary === 'number' && Number.isSafeInteger(job.maxSalary) && job.maxSalary >= 0 ? job.maxSalary : null;
  return {
    externalKey,
    slug: `himalayas-${externalKey.slice(-20)}`,
    title: job.title.trim().slice(0, 160),
    description: (fullDescription || job.excerpt).slice(0, 30000),
    summary: job.excerpt.replace(/\s+/g, ' ').trim().slice(0, 700),
    organizationName: job.companyName.trim().slice(0, 160),
    sourceName: 'Himalayas',
    sourceUrl,
    type: job.employmentType === 'Intern' ? OpportunityType.INTERNSHIP : OpportunityType.EMPLOYMENT,
    modality: Modality.REMOTE,
    locationPhysical: null,
    publishedAt: Number.isNaN(publishedAt.getTime()) ? now : publishedAt,
    closingDate,
    lastSyncedAt: now,
    employmentType: typeof job.employmentType === 'string' ? job.employmentType.slice(0, 80) : null,
    seniority: Array.isArray(job.seniority) ? job.seniority.filter((value): value is string => typeof value === 'string').join(', ').slice(0, 120) : null,
    salaryMin,
    salaryMax,
    salaryCurrency: typeof job.currency === 'string' ? job.currency.slice(0, 8) : null,
    salaryPeriod: typeof job.salaryPeriod === 'string' ? job.salaryPeriod.slice(0, 40) : null,
    eligibleLocations,
  };
}

@Injectable()
export class ExternalImportService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(ExternalImportService.name);
  private timer?: NodeJS.Timeout;
  private running = false;
  private readonly source = 'himalayas';

  constructor(private readonly prisma: PrismaService, private readonly cache: CacheService) {}

  onApplicationBootstrap() {
    if (process.env.EXTERNAL_IMPORT_ENABLED === 'false') return;
    void this.syncIfDue();
    this.timer = setInterval(() => void this.syncIfDue(), 60 * 60 * 1000);
    this.timer.unref();
  }

  onApplicationShutdown() {
    if (this.timer) clearInterval(this.timer);
  }

  async syncIfDue() {
    if (this.running) return;
    this.running = true;
    try {
      const state = await this.prisma.importState.findUnique({ where: { source: this.source } });
      if (state && Date.now() - state.lastSuccessAt.getTime() < 24 * 60 * 60 * 1000) {
        const missingDetails = await this.prisma.opportunity.findFirst({ where: { sourceName: 'Himalayas', summary: null }, select: { id: true } });
        if (!missingDetails) return;
      }
      await this.sync();
    } catch (error) {
      this.logger.error('External opportunity sync failed', error instanceof Error ? error.stack : String(error));
    } finally {
      this.running = false;
    }
  }

  private async sync() {
    let imported = 0;
    const now = new Date();
    try {
      const provider = await this.prisma.user.upsert({
        where: { email: 'external-import@bolivar-opportunities.invalid' },
        update: {},
        create: {
          email: 'external-import@bolivar-opportunities.invalid',
          displayName: 'External opportunities',
          passwordHash: randomUUID(),
          role: UserRole.PROVIDER,
        },
      });

      for (let page = 1; page <= 5; page++) {
        const url = new URL('https://himalayas.app/jobs/api/search');
        url.search = new URLSearchParams({ country: 'Colombia', seniority: 'Entry-level', sort: 'recent', page: String(page) }).toString();
        const response = await fetch(url, { signal: AbortSignal.timeout(15000), headers: { Accept: 'application/json' } });
        if (!response.ok) throw new Error(`Himalayas returned HTTP ${response.status}`);
        const payload = await response.json() as HimalayasResponse;
        if (!Array.isArray(payload.jobs)) throw new Error('Himalayas response has no jobs array');
        if (payload.jobs.length === 0) break;

        for (const rawJob of payload.jobs) {
          if (!rawJob || typeof rawJob !== 'object') continue;
          const job = normalizeHimalayasJob(rawJob as HimalayasJob, now);
          if (!job) continue;
          await this.prisma.opportunity.upsert({
            where: { externalKey: job.externalKey },
            update: { ...job },
            create: { ...job, providerId: provider.id },
          });
          imported++;
        }
      }
      await this.prisma.importState.upsert({
        where: { source: this.source },
        update: { lastSuccessAt: now },
        create: { source: this.source, lastSuccessAt: now },
      });
      this.logger.log(`Synchronized ${imported} external opportunities from Himalayas`);
    } finally {
      if (imported > 0) await this.cache.invalidate();
    }
  }
}
