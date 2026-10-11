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
import { ImportRunCoordinator } from '../../import-run-coordinator.js';

const SOURCE = 'freecodecamp';
const SOURCE_NAME = 'freeCodeCamp';
const CATALOG_URL =
  'https://raw.githubusercontent.com/freeCodeCamp/freeCodeCamp/main/README.md';
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const MINIMUM_EXPECTED_CERTIFICATIONS = 5;

export type DiscoveredCertification = {
  externalId: string;
  title: string;
  description: string;
  sourceUrl: string;
};

function cleanText(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function safeCertificationUrl(value: string) {
  try {
    const url = new URL(value);
    if (
      url.protocol !== 'https:' ||
      url.hostname !== 'www.freecodecamp.org' ||
      !/^\/learn\/[a-z0-9-]+\/$/.test(url.pathname)
    )
      return null;
    url.search = '';
    url.hash = '';
    return url.toString();
  } catch {
    return null;
  }
}

export function parseFreeCodeCampCertifications(markdown: string) {
  const section = markdown.match(
    /### Certifications\s+([\s\S]*?)\s+### The Learning Platform/,
  )?.[1];
  if (!section)
    throw new Error('freeCodeCamp README has no certifications section');

  const certifications = new Map<string, DiscoveredCertification>();
  let context = '';
  for (const line of section.split(/\r?\n/)) {
    const match = line.match(/^\s*-\s+\[([^\]]+)]\((https:\/\/[^)]+)\)\s*$/);
    if (!match) {
      const paragraph = cleanText(
        line.replace(/\[([^\]]+)]\([^)]+\)/g, '$1').replace(/[*_`]/g, ''),
      );
      if (paragraph) context = paragraph;
      continue;
    }
    const sourceUrl = safeCertificationUrl(match[2]);
    if (!sourceUrl) continue;
    const externalId = new URL(sourceUrl).pathname
      .split('/')
      .filter(Boolean)
      .at(-1);
    const title = cleanText(match[1]);
    if (externalId && title && context)
      certifications.set(externalId, {
        externalId,
        title,
        description: context,
        sourceUrl,
      });
  }

  if (certifications.size < MINIMUM_EXPECTED_CERTIFICATIONS)
    throw new Error('freeCodeCamp certification snapshot is incomplete');
  return [...certifications.values()];
}

export function normalizeFreeCodeCampCertification(
  entry: DiscoveredCertification,
  now = new Date(),
) {
  const sourceUrl = safeCertificationUrl(entry.sourceUrl);
  const title = cleanText(entry.title);
  const cleanDescription = cleanText(entry.description);
  if (
    !sourceUrl ||
    !/^[a-z0-9-]+$/.test(entry.externalId) ||
    !title ||
    !cleanDescription
  )
    return null;
  return {
    externalKey: `${SOURCE}:${entry.externalId}`,
    slug: `freecodecamp-${entry.externalId}`,
    title: title.slice(0, 160),
    description: cleanDescription.slice(0, 30000),
    summary: cleanDescription.slice(0, 700),
    type: OpportunityType.COURSE,
    modality: Modality.REMOTE,
    locationPhysical: null,
    organizationName: SOURCE_NAME,
    sourceName: SOURCE_NAME,
    sourceUrl,
    publishedAt: now,
    closingDate: null,
    lastSyncedAt: now,
    sourceActive: true,
    categoryNames: ['Curso gratuito', 'Certificación gratuita'],
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
    private readonly coordinator: ImportRunCoordinator,
  ) {}

  onApplicationBootstrap() {
    if (
      process.env.FREECODECAMP_IMPORT_ENABLED === 'false' ||
      process.env.EXTERNAL_IMPORT_ENABLED === 'false'
    )
      return;
    void this.coordinator.enqueue(() => this.syncIfDue());
    this.timer = setInterval(
      () => void this.coordinator.enqueue(() => this.syncIfDue()),
      60 * 60 * 1000,
    );
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

  private async fetchText(url: string, accept: string) {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(15000),
      headers: {
        Accept: accept,
        'User-Agent': 'BolivarOportunidadesImporter/1.0',
      },
    });
    if (!response.ok)
      throw new Error(`freeCodeCamp returned HTTP ${response.status}`);
    return response.text();
  }

  private async sync() {
    const now = new Date();
    const discovered = parseFreeCodeCampCertifications(
      await this.fetchText(CATALOG_URL, 'text/plain'),
    );
    const opportunities = [];
    for (const entry of discovered) {
      const item = normalizeFreeCodeCampCertification(entry, now);
      if (!item)
        throw new Error(`Invalid freeCodeCamp course: ${entry.externalId}`);
      opportunities.push(item);
    }

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
      await this.prisma.opportunity.upsert({
        where: { externalKey: item.externalKey },
        update: { ...item, categories: { set: [], connectOrCreate } },
        create: {
          ...item,
          providerId: provider.id,
          categories: { connectOrCreate },
        },
      });
    }
    const inactive = await this.prisma.opportunity.updateMany({
      where: {
        sourceName: SOURCE_NAME,
        sourceActive: true,
        externalKey: { notIn: opportunities.map((item) => item.externalKey) },
      },
      data: { sourceActive: false },
    });
    await this.prisma.importState.upsert({
      where: { source: SOURCE },
      update: { lastSuccessAt: now },
      create: { source: SOURCE, lastSuccessAt: now },
    });
    await this.cache.invalidate();
    this.logger.log(
      `Synchronized ${opportunities.length} freeCodeCamp certifications; deactivated ${inactive.count}`,
    );
  }
}
