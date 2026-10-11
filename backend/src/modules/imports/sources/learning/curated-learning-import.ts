import { randomUUID } from 'node:crypto';
import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import { Modality, OpportunityType, UserRole } from '@prisma/client';
import { CacheService } from '../../../../infrastructure/cache/cache.service.js';
import { PrismaService } from '../../../../infrastructure/database/prisma.service.js';
import {
  CURATED_COURSE_SOURCES,
  type CuratedCourse,
  type CuratedCourseSource,
} from './curated-learning-catalog.js';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function safeCourseUrl(value: string, source: CuratedCourseSource) {
  try {
    const url = new URL(value);
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      url.hostname !== source.hostname ||
      !url.pathname.startsWith(source.pathPrefix)
    )
      return null;
    url.search = '';
    url.hash = '';
    return url.toString();
  } catch {
    return null;
  }
}

export function normalizeCuratedCourse(
  entry: CuratedCourse,
  source: CuratedCourseSource,
  now = new Date(),
) {
  if (!/^[a-z0-9-]+$/.test(entry.externalId)) return null;
  const sourceUrl = safeCourseUrl(entry.sourceUrl, source);
  const reviewedAt = new Date(`${entry.lastReviewedAt}T12:00:00Z`);
  if (!sourceUrl || Number.isNaN(reviewedAt.getTime())) return null;
  return {
    externalKey: `${source.id}:${entry.externalId}`,
    slug: `${source.id}-${entry.externalId}`,
    title: entry.title.slice(0, 160),
    description: entry.description.slice(0, 30000),
    summary: entry.description.slice(0, 700),
    type: OpportunityType.COURSE,
    modality: Modality.REMOTE,
    locationPhysical: null,
    organizationName: source.organizationName,
    sourceName: source.sourceName,
    sourceUrl,
    publishedAt: reviewedAt,
    closingDate: null,
    lastSyncedAt: now,
    categoryNames: [
      ...new Set([...entry.categories, entry.language, 'Curso gratuito']),
    ],
  };
}

@Injectable()
export class CuratedLearningImportService
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(CuratedLearningImportService.name);
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

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
      for (const source of CURATED_COURSE_SOURCES) {
        if (process.env[source.enabledEnvironmentVariable] === 'false')
          continue;
        try {
          const state = await this.prisma.importState.findUnique({
            where: { source: source.id },
          });
          if (state && Date.now() - state.lastSuccessAt.getTime() < WEEK_MS)
            continue;
          await this.syncSource(source);
        } catch (error) {
          this.logger.error(
            `${source.sourceName} course sync failed`,
            error instanceof Error ? error.stack : String(error),
          );
        }
      }
    } finally {
      this.running = false;
    }
  }

  private async validateUrl(url: string, source: CuratedCourseSource) {
    const response = await fetch(url, {
      redirect: 'follow',
      signal: AbortSignal.timeout(15000),
      headers: { Accept: 'text/html' },
    });
    const finalUrl = safeCourseUrl(response.url, source);
    const contentType = response.headers.get('content-type');
    await response.body?.cancel();
    if (!response.ok || !finalUrl || !contentType?.includes('text/html'))
      throw new Error(
        `${source.sourceName} returned an unusable response for ${url}: HTTP ${response.status}`,
      );
  }

  private async syncSource(source: CuratedCourseSource) {
    const now = new Date();
    const opportunities = source.catalog.map((entry) =>
      normalizeCuratedCourse(entry, source, now),
    );
    if (opportunities.some((item) => item === null))
      throw new Error(`${source.sourceName} catalog contains an invalid entry`);
    const normalized = opportunities.filter((item) => item !== null);
    const keys = new Set(normalized.map((item) => item.externalKey));
    if (normalized.length === 0 || keys.size !== normalized.length)
      throw new Error(`${source.sourceName} catalog is empty or duplicated`);

    await Promise.all(
      normalized.map((item) => this.validateUrl(item.sourceUrl, source)),
    );
    const provider = await this.prisma.user.upsert({
      where: { email: source.providerEmail },
      update: {},
      create: {
        email: source.providerEmail,
        displayName: source.organizationName,
        passwordHash: randomUUID(),
        role: UserRole.PROVIDER,
      },
    });
    for (const { categoryNames, ...item } of normalized) {
      const connectOrCreate = categoryNames.map((name) => ({
        where: { name },
        create: { name },
      }));
      await this.prisma.opportunity.upsert({
        where: { externalKey: item.externalKey },
        update: {
          ...item,
          categories: { set: [], connectOrCreate },
        },
        create: {
          ...item,
          providerId: provider.id,
          categories: { connectOrCreate },
        },
      });
    }
    await this.prisma.importState.upsert({
      where: { source: source.id },
      update: { lastSuccessAt: now },
      create: { source: source.id, lastSuccessAt: now },
    });
    await this.cache.invalidate();
    this.logger.log(
      `Synchronized ${normalized.length} reviewed courses from ${source.sourceName}`,
    );
  }
}
