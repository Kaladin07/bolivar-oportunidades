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
  FREECODECAMP_CATALOG,
  type FreeCodeCampCatalogEntry,
} from './freecodecamp-catalog.js';

const SOURCE = 'freecodecamp';
const SOURCE_NAME = 'freeCodeCamp';
const CURRICULUM_URL =
  'https://raw.githubusercontent.com/freeCodeCamp/freeCodeCamp/main/curriculum/structure/curriculum.json';
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

type CurriculumStructure = { certifications?: unknown };

export function parseCertificationSlugs(payload: CurriculumStructure) {
  if (!Array.isArray(payload.certifications))
    throw new Error('freeCodeCamp curriculum has no certifications array');
  const slugs = payload.certifications.filter(
    (value): value is string =>
      typeof value === 'string' && /^[a-z0-9-]+$/.test(value),
  );
  if (slugs.length === 0)
    throw new Error('freeCodeCamp curriculum has no valid certifications');
  return new Set(slugs);
}

export function normalizeFreeCodeCampCertification(
  entry: FreeCodeCampCatalogEntry,
  officialSlugs: ReadonlySet<string>,
  now = new Date(),
) {
  if (!officialSlugs.has(entry.slug)) return null;
  const sourceUrl = new URL(
    `/learn/${entry.slug}`,
    'https://www.freecodecamp.org',
  ).toString();
  const reviewedAt = new Date(`${entry.lastReviewedAt}T12:00:00Z`);
  if (Number.isNaN(reviewedAt.getTime())) return null;
  const categories = [
    ...new Set([...entry.categories, entry.language, 'Curso gratuito']),
  ];
  return {
    externalKey: `${SOURCE}:${entry.slug}`,
    slug: `freecodecamp-${entry.slug}`,
    title: entry.title.slice(0, 160),
    description: entry.description.slice(0, 30000),
    summary: entry.description.slice(0, 700),
    type: OpportunityType.COURSE,
    modality: Modality.REMOTE,
    locationPhysical: null,
    organizationName: SOURCE_NAME,
    sourceName: SOURCE_NAME,
    sourceUrl,
    publishedAt: reviewedAt,
    closingDate: null,
    lastSyncedAt: now,
    categoryNames: categories,
  };
}

@Injectable()
export class FreeCodeCampImportService
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(FreeCodeCampImportService.name);
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  onApplicationBootstrap() {
    if (
      process.env.FREECODECAMP_IMPORT_ENABLED === 'false' ||
      process.env.EXTERNAL_IMPORT_ENABLED === 'false'
    )
      return;
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
      const state = await this.prisma.importState.findUnique({
        where: { source: SOURCE },
      });
      if (state && Date.now() - state.lastSuccessAt.getTime() < WEEK_MS) return;
      await this.sync();
    } catch (error) {
      this.logger.error(
        'freeCodeCamp certification sync failed',
        error instanceof Error ? error.stack : String(error),
      );
    } finally {
      this.running = false;
    }
  }

  private async sync() {
    const now = new Date();
    const response = await fetch(CURRICULUM_URL, {
      signal: AbortSignal.timeout(15000),
      headers: { Accept: 'application/json' },
    });
    if (!response.ok)
      throw new Error(`freeCodeCamp returned HTTP ${response.status}`);
    const officialSlugs = parseCertificationSlugs(
      (await response.json()) as CurriculumStructure,
    );
    const opportunities = FREECODECAMP_CATALOG.map((entry) =>
      normalizeFreeCodeCampCertification(entry, officialSlugs, now),
    ).filter((item) => item !== null);
    if (opportunities.length === 0)
      throw new Error('No reviewed freeCodeCamp certifications remain active');

    const provider = await this.prisma.user.upsert({
      where: { email: 'freecodecamp-import@bolivar-opportunities.invalid' },
      update: {},
      create: {
        email: 'freecodecamp-import@bolivar-opportunities.invalid',
        displayName: SOURCE_NAME,
        passwordHash: randomUUID(),
        role: UserRole.PROVIDER,
      },
    });
    for (const { categoryNames, ...item } of opportunities) {
      const connectOrCreate = categoryNames.map((name) => ({
        where: { name },
        create: { name },
      }));
      const createCategories = {
        connectOrCreate,
      };
      const updateCategories = {
        set: [],
        connectOrCreate,
      };
      await this.prisma.opportunity.upsert({
        where: { externalKey: item.externalKey },
        update: { ...item, categories: updateCategories },
        create: {
          ...item,
          providerId: provider.id,
          categories: createCategories,
        },
      });
    }
    await this.prisma.importState.upsert({
      where: { source: SOURCE },
      update: { lastSuccessAt: now },
      create: { source: SOURCE, lastSuccessAt: now },
    });
    await this.cache.invalidate();
    this.logger.log(
      `Synchronized ${opportunities.length} reviewed freeCodeCamp certifications`,
    );
  }
}
