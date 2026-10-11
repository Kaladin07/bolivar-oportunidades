import { createHash, randomUUID } from 'node:crypto';
import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import { Modality, OpportunityType, UserRole } from '@prisma/client';
import { load } from 'cheerio';
import { PrismaService } from '../../../../infrastructure/database/prisma.service.js';
import { CacheService } from '../../../../infrastructure/cache/cache.service.js';

const SOURCE = 'cartagena';
const BASE_URL = 'https://cartagena.gov.co/convocatorias';
const SOURCE_NAME = 'Alcaldía de Cartagena';
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_PAGES = 5;

type Listing = { url: string; title: string };

function opportunityType(title: string): OpportunityType | null {
  if (/mi primera chamba|pr[aá]ctic|pasant[ií]a/i.test(title))
    return OpportunityType.INTERNSHIP;
  if (/beca/i.test(title)) return OpportunityType.SCHOLARSHIP;
  if (/diplomado|curso|formaci[oó]n|capacitaci[oó]n/i.test(title))
    return OpportunityType.COURSE;
  if (/vacante|empleo|trabajo|convocatoria de m[eé]ritos/i.test(title))
    return OpportunityType.EMPLOYMENT;
  return null;
}

function safeSourceUrl(value: string, base = BASE_URL) {
  try {
    const url = new URL(value.trim(), base);
    if (
      url.protocol !== 'https:' ||
      !['cartagena.gov.co', 'www.cartagena.gov.co'].includes(url.hostname) ||
      !url.pathname.startsWith('/convocatorias/')
    )
      return null;
    url.hostname = 'cartagena.gov.co';
    url.search = '';
    url.hash = '';
    return url.toString();
  } catch {
    return null;
  }
}

export function parseCartagenaList(html: string, pageUrl = BASE_URL) {
  const $ = load(html);
  const listings: Listing[] = [];
  $(
    '#views-bootstrap-vista-de-participacion-documental-block-1 .card-body',
  ).each((_, element) => {
    const card = $(element);
    const anchor = card.find('.card-title a').first();
    const title = anchor.text().replace(/\s+/g, ' ').trim();
    const status = card.find('small').text().replace(/\s+/g, ' ').trim();
    const url = safeSourceUrl(anchor.attr('href') || '', pageUrl);
    if (url && /^abiert[ao]$/i.test(status) && opportunityType(title))
      listings.push({ url, title });
  });
  const nextHref = $('a[rel="next"]').first().attr('href');
  const next = nextHref ? new URL(nextHref, pageUrl) : null;
  if (
    next &&
    (next.hostname !== 'cartagena.gov.co' || next.pathname !== '/convocatorias')
  )
    throw new Error('Unexpected Cartagena pagination URL');
  return { listings, nextUrl: next?.toString() || null };
}

function displayTitle(value: string) {
  const match = value.match(
    /mi primera chamba.*?(primer|segundo) semestre\s+(\d{4})/i,
  );
  if (match)
    return `Mi Primera Chamba — prácticas laborales, ${match[1].toLowerCase()} semestre de ${match[2]}`;
  return value.length > 160 ? `${value.slice(0, 157).trimEnd()}…` : value;
}

export function normalizeCartagenaListing(
  listing: Listing,
  html: string,
  now = new Date(),
) {
  const sourceUrl = safeSourceUrl(listing.url);
  if (!sourceUrl) return null;
  const $ = load(html);
  const fullTitle = $('.field--name-title')
    .first()
    .text()
    .replace(/\s+/g, ' ')
    .trim();
  const title = fullTitle || listing.title;
  const type = opportunityType(title);
  const closingValue = $('.field--name-field-fecha-de-cierre time')
    .first()
    .attr('datetime');
  const publishedValue = $('.field--name-created time')
    .first()
    .attr('datetime');
  if (!type || !title || !closingValue || !publishedValue) return null;
  const closingDate = new Date(closingValue);
  const publishedAt = new Date(publishedValue);
  if (
    Number.isNaN(closingDate.getTime()) ||
    Number.isNaN(publishedAt.getTime()) ||
    closingDate <= now
  )
    return null;

  const id = createHash('sha256')
    .update(new URL(sourceUrl).pathname)
    .digest('hex');
  const description =
    'Convocatoria en Cartagena, Bolívar. Consulta los requisitos, fechas y proceso de inscripción en la publicación oficial de la Alcaldía de Cartagena.';
  return {
    externalKey: `${SOURCE}:${id}`,
    slug: `cartagena-${id.slice(0, 20)}`,
    title: displayTitle(title),
    description,
    summary: description,
    type,
    modality: Modality.IN_PERSON,
    locationPhysical: 'Cartagena, Bolívar',
    organizationName: SOURCE_NAME,
    sourceName: SOURCE_NAME,
    sourceUrl,
    publishedAt,
    closingDate,
    lastSyncedAt: now,
    sourceActive: true,
  };
}

@Injectable()
export class CartagenaImportService
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(CartagenaImportService.name);
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  onApplicationBootstrap() {
    if (
      process.env.CARTAGENA_IMPORT_ENABLED === 'false' ||
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
      if (state && Date.now() - state.lastSuccessAt.getTime() < DAY_MS) return;
      await this.sync();
    } catch (error) {
      this.logger.error(
        'Cartagena opportunity sync failed',
        error instanceof Error ? error.stack : String(error),
      );
    } finally {
      this.running = false;
    }
  }

  private async fetchHtml(url: string) {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(15000),
      headers: { Accept: 'text/html' },
    });
    if (
      !response.ok ||
      !response.headers.get('content-type')?.includes('text/html') ||
      response.headers.has('cf-mitigated')
    ) {
      throw new Error(
        `Cartagena returned an unusable response: HTTP ${response.status}`,
      );
    }
    return response.text();
  }

  private async sync() {
    const now = new Date();
    const listings = new Map<string, Listing>();
    let pageUrl: string | null = BASE_URL;
    for (let page = 0; page < MAX_PAGES && pageUrl; page++) {
      const parsed = parseCartagenaList(await this.fetchHtml(pageUrl), pageUrl);
      for (const listing of parsed.listings) listings.set(listing.url, listing);
      pageUrl = parsed.nextUrl;
    }
    if (pageUrl)
      throw new Error(
        'Cartagena pagination exceeded the configured page limit',
      );

    const opportunities = [];
    for (const listing of listings.values()) {
      const item = normalizeCartagenaListing(
        listing,
        await this.fetchHtml(listing.url),
        now,
      );
      if (item) opportunities.push(item);
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    const provider = await this.prisma.user.upsert({
      where: { email: 'cartagena-import@bolivar-opportunities.invalid' },
      update: {},
      create: {
        email: 'cartagena-import@bolivar-opportunities.invalid',
        displayName: SOURCE_NAME,
        passwordHash: randomUUID(),
        role: UserRole.PROVIDER,
      },
    });
    for (const item of opportunities) {
      await this.prisma.opportunity.upsert({
        where: { externalKey: item.externalKey },
        update: item,
        create: { ...item, providerId: provider.id },
      });
    }
    const closed = await this.prisma.opportunity.updateMany({
      where: {
        sourceName: SOURCE_NAME,
        externalKey: { notIn: opportunities.map((item) => item.externalKey) },
        closingDate: { gt: now },
      },
      data: { closingDate: now, sourceActive: false },
    });
    await this.prisma.importState.upsert({
      where: { source: SOURCE },
      update: { lastSuccessAt: now },
      create: { source: SOURCE, lastSuccessAt: now },
    });
    if (opportunities.length || closed.count) await this.cache.invalidate();
    this.logger.log(
      `Synchronized ${opportunities.length} Cartagena opportunities; closed ${closed.count} unavailable listings`,
    );
  }
}
