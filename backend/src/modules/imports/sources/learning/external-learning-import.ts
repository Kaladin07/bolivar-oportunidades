import { createHash, randomUUID } from 'node:crypto';
import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import { Modality, OpportunityType, UserRole } from '@prisma/client';
import { load } from 'cheerio';
import type { Impit as ImpitClient } from 'impit';
import { CacheService } from '../../../../infrastructure/cache/cache.service.js';
import { PrismaService } from '../../../../infrastructure/database/prisma.service.js';
import { ImportRunCoordinator } from '../../import-run-coordinator.js';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const CS50_CATALOG_URL = 'https://www.edx.org/cs50';
const OPENLEARN_CATALOG_URL = 'https://www.open.edu/openlearn/badged-courses';
const MAX_OPENLEARN_PAGES = 10;
const BROWSER_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';

type CourseSource = {
  id: string;
  sourceName: string;
  organizationName: string;
  providerEmail: string;
  enabledEnvironmentVariable: string;
  enabledByDefault: boolean;
  minimumExpectedItems: number;
};

export type DiscoveredCourse = {
  externalId: string;
  title: string;
  description: string;
  sourceUrl: string;
  categories: string[];
};

export const CS50_SOURCE: CourseSource = {
  id: 'cs50',
  sourceName: 'CS50',
  organizationName: 'Harvard University',
  providerEmail: 'cs50-import@bolivar-opportunities.invalid',
  enabledEnvironmentVariable: 'CS50_IMPORT_ENABLED',
  enabledByDefault: true,
  minimumExpectedItems: 5,
};

export const OPENLEARN_SOURCE: CourseSource = {
  id: 'openlearn',
  sourceName: 'OpenLearn',
  organizationName: 'The Open University',
  providerEmail: 'openlearn-import@bolivar-opportunities.invalid',
  enabledEnvironmentVariable: 'OPENLEARN_IMPORT_ENABLED',
  enabledByDefault: false,
  minimumExpectedItems: 10,
};

function cleanText(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function safeUrl(value: string, hostname: string, pathPrefix: string) {
  try {
    const url = new URL(value);
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      url.hostname !== hostname ||
      !url.pathname.startsWith(pathPrefix)
    )
      return null;
    url.search = '';
    url.hash = '';
    return url.toString();
  } catch {
    return null;
  }
}

function idFromUrl(value: string) {
  return createHash('sha256').update(new URL(value).pathname).digest('hex');
}

export function parseCs50Catalog(html: string) {
  const decoded = html.replaceAll('\\/', '/').replaceAll('\\u0026', '&');
  const urls = decoded.match(
    /https:\/\/www\.edx\.org\/learn\/[a-z0-9-]+\/harvard-university-cs50-s-[a-z0-9-]+/g,
  );
  const courses = new Map<string, { externalId: string; sourceUrl: string }>();
  for (const value of urls ?? []) {
    const sourceUrl = safeUrl(value, 'www.edx.org', '/learn/');
    if (!sourceUrl) continue;
    const externalId = idFromUrl(sourceUrl);
    courses.set(externalId, { externalId, sourceUrl });
  }
  if (courses.size < CS50_SOURCE.minimumExpectedItems)
    throw new Error('CS50 catalog snapshot is incomplete');
  return [...courses.values()];
}

function decodeHtmlText(value: string) {
  const namedEntities: Record<string, string> = {
    amp: '&',
    apos: "'",
    gt: '>',
    lt: '<',
    nbsp: ' ',
    quot: '"',
  };
  return value.replace(
    /&(?:#(\d+)|#x([\da-f]+)|([a-z]+));/gi,
    (entity, decimal: string, hexadecimal: string, named: string) => {
      if (decimal) return String.fromCodePoint(Number.parseInt(decimal, 10));
      if (hexadecimal)
        return String.fromCodePoint(Number.parseInt(hexadecimal, 16));
      return namedEntities[named.toLowerCase()] ?? entity;
    },
  );
}

function htmlAttribute(tag: string, attribute: string) {
  const match = tag.match(
    new RegExp(`${attribute}\\s*=\\s*(["'])(.*?)\\1`, 'i'),
  );
  return match ? decodeHtmlText(match[2]) : '';
}

function metaContent(html: string, key: 'name' | 'property', value: string) {
  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
    if (htmlAttribute(match[0], key).toLowerCase() === value)
      return htmlAttribute(match[0], 'content');
  }
  return '';
}

function elementText(html: string, element: 'h1' | 'title') {
  const match = html.match(
    new RegExp(`<${element}\\b[^>]*>([\\s\\S]*?)<\\/${element}>`, 'i'),
  );
  return match
    ? decodeHtmlText(match[1].replace(/<[^>]*>/g, ' '))
    : '';
}

export function parseCourseDetail(html: string) {
  const title = cleanText(
    elementText(html, 'h1') ||
      metaContent(html, 'property', 'og:title') ||
      elementText(html, 'title'),
  ).replace(/\s*[|–-]\s*edX\s*$/i, '');
  const description = cleanText(
    metaContent(html, 'name', 'description') ||
      metaContent(html, 'property', 'og:description'),
  );
  if (!title || !description)
    throw new Error('Course detail has no title or description');
  return { title, description };
}

function openLearnCourseUrl(value: string, pageUrl: string) {
  try {
    const absolute = new URL(value, pageUrl);
    if (
      absolute.protocol !== 'https:' ||
      absolute.hostname !== 'www.open.edu' ||
      !absolute.pathname.startsWith('/openlearn/') ||
      absolute.pathname === '/openlearn/badged-courses' ||
      absolute.pathname.startsWith('/openlearn/free-courses/')
    )
      return null;
    absolute.search = '';
    absolute.hash = '';
    return absolute.toString();
  } catch {
    return null;
  }
}

export function parseOpenLearnCatalogPage(html: string, pageUrl: string) {
  if (/cf-chl-|challenge-platform|Just a moment/i.test(html))
    throw new Error('OpenLearn returned a bot challenge');
  const $ = load(html);
  const courses = new Map<string, DiscoveredCourse>();
  $('h3 a[href]').each((_, element) => {
    const anchor = $(element);
    const sourceUrl = openLearnCourseUrl(anchor.attr('href') || '', pageUrl);
    const title = cleanText(anchor.text());
    if (!sourceUrl || !title) return;

    let container = anchor.parent();
    let paragraphs: string[] = [];
    for (let depth = 0; depth < 6 && container.length; depth++) {
      paragraphs = container
        .find('p')
        .map((__, paragraph) => cleanText($(paragraph).text()))
        .get()
        .filter(
          (text) =>
            text.length >= 30 && !/^Browse free badged courses/i.test(text),
        );
      if (paragraphs.length) break;
      container = container.parent();
    }
    const description = paragraphs[0];
    if (!description) return;
    const externalId = idFromUrl(sourceUrl);
    courses.set(externalId, {
      externalId,
      title,
      description,
      sourceUrl,
      categories: [
        'Curso gratuito',
        'Insignia digital gratuita',
        'Constancia de participación',
      ],
    });
  });

  const nextHref =
    $('a[rel="next"]').first().attr('href') ||
    $('a')
      .filter((_, element) => /^Next$/i.test(cleanText($(element).text())))
      .first()
      .attr('href');
  let nextUrl: string | null = null;
  if (nextHref) {
    const candidate = new URL(nextHref, pageUrl);
    if (
      candidate.protocol !== 'https:' ||
      candidate.hostname !== 'www.open.edu' ||
      candidate.pathname !== '/openlearn/badged-courses'
    )
      throw new Error('Unexpected OpenLearn pagination URL');
    nextUrl = candidate.toString();
  }
  return { courses: [...courses.values()], nextUrl };
}

export function normalizeDiscoveredCourse(
  entry: DiscoveredCourse,
  source: CourseSource,
  now = new Date(),
) {
  const title = cleanText(entry.title);
  const description = cleanText(entry.description);
  if (!/^[a-f0-9]{64}$/.test(entry.externalId) || !title || !description)
    return null;
  return {
    externalKey: `${source.id}:${entry.externalId}`,
    slug: `${source.id}-${entry.externalId.slice(0, 20)}`,
    title: title.slice(0, 160),
    description: description.slice(0, 30000),
    summary: description.slice(0, 700),
    type: OpportunityType.COURSE,
    modality: Modality.REMOTE,
    locationPhysical: null,
    organizationName: source.organizationName,
    sourceName: source.sourceName,
    sourceUrl: entry.sourceUrl,
    publishedAt: now,
    closingDate: null,
    lastSyncedAt: now,
    sourceActive: true,
    categoryNames: [...new Set(entry.categories)],
  };
}

@Injectable()
export class ExternalLearningImportService
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(ExternalLearningImportService.name);
  private openLearnClient?: ImpitClient;
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly coordinator: ImportRunCoordinator,
  ) {}

  onApplicationBootstrap() {
    if (process.env.EXTERNAL_IMPORT_ENABLED === 'false') return;
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
      for (const source of [CS50_SOURCE, OPENLEARN_SOURCE]) {
        const configured = process.env[source.enabledEnvironmentVariable];
        const enabled = configured
          ? configured === 'true'
          : source.enabledByDefault;
        if (!enabled) continue;
        try {
          const state = await this.prisma.importState.findUnique({
            where: { source: source.id },
          });
          if (state && Date.now() - state.lastSuccessAt.getTime() < WEEK_MS)
            continue;
          const discovered =
            source.id === CS50_SOURCE.id
              ? await this.discoverCs50()
              : await this.discoverOpenLearn();
          await this.syncSource(source, discovered);
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

  private async fetchHtml(url: string) {
    const isOpenLearn = new URL(url).hostname === 'www.open.edu';
    const response = isOpenLearn
      ? await (await this.getOpenLearnClient()).fetch(url, {
          redirect: 'follow',
          signal: AbortSignal.timeout(20000),
          headers: {
            'accept-language': 'en-GB,en;q=0.9',
            referer: 'https://www.open.edu/openlearn/',
          },
        })
      : await fetch(url, {
          redirect: 'follow',
          signal: AbortSignal.timeout(20000),
          headers: {
            Accept:
              'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-GB,en;q=0.9',
            'User-Agent': BROWSER_USER_AGENT,
          },
        });
    const contentType = response.headers.get('content-type');
    if (
      !response.ok ||
      !contentType?.includes('text/html') ||
      response.headers.has('cf-mitigated')
    )
      throw new Error(`Course source returned HTTP ${response.status}`);
    return { html: await response.text(), finalUrl: response.url };
  }

  private async getOpenLearnClient() {
    if (!this.openLearnClient) {
      const { Impit } = await import('impit');
      this.openLearnClient = new Impit({
        browser: 'firefox144',
        timeout: 20000,
      });
    }
    return this.openLearnClient;
  }

  private async discoverCs50() {
    const catalog = await this.fetchHtml(CS50_CATALOG_URL);
    const links = parseCs50Catalog(catalog.html);
    const courses: DiscoveredCourse[] = [];
    for (const link of links) {
      const detail = await this.fetchHtml(link.sourceUrl);
      const sourceUrl = safeUrl(detail.finalUrl, 'www.edx.org', '/learn/');
      if (!sourceUrl)
        throw new Error(`Unsafe CS50 redirect for ${link.sourceUrl}`);
      courses.push({
        ...link,
        ...parseCourseDetail(detail.html),
        sourceUrl,
        categories: ['Curso gratuito', 'Acceso gratuito por auditoría'],
      });
    }
    return courses;
  }

  private async discoverOpenLearn() {
    const courses = new Map<string, DiscoveredCourse>();
    const visited = new Set<string>();
    let pageUrl: string | null = OPENLEARN_CATALOG_URL;
    for (let page = 0; page < MAX_OPENLEARN_PAGES && pageUrl; page++) {
      if (visited.has(pageUrl))
        throw new Error('OpenLearn pagination loop detected');
      visited.add(pageUrl);
      const response = await this.fetchHtml(pageUrl);
      const parsed = parseOpenLearnCatalogPage(
        response.html,
        response.finalUrl,
      );
      for (const course of parsed.courses)
        courses.set(course.externalId, course);
      pageUrl = parsed.nextUrl;
    }
    if (pageUrl)
      throw new Error('OpenLearn pagination exceeded the configured limit');
    return [...courses.values()];
  }

  private async syncSource(
    source: CourseSource,
    discovered: DiscoveredCourse[],
  ) {
    if (discovered.length < source.minimumExpectedItems)
      throw new Error(`${source.sourceName} snapshot is incomplete`);
    const now = new Date();
    const normalized = discovered.map((entry) =>
      normalizeDiscoveredCourse(entry, source, now),
    );
    if (normalized.some((item) => item === null))
      throw new Error(`${source.sourceName} returned an invalid course`);
    const items = normalized.filter((item) => item !== null);
    if (new Set(items.map((item) => item.externalKey)).size !== items.length)
      throw new Error(`${source.sourceName} returned duplicated courses`);

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
    for (const { categoryNames, ...item } of items) {
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
        sourceName: source.sourceName,
        sourceActive: true,
        externalKey: { notIn: items.map((item) => item.externalKey) },
      },
      data: { sourceActive: false },
    });
    await this.prisma.importState.upsert({
      where: { source: source.id },
      update: { lastSuccessAt: now },
      create: { source: source.id, lastSuccessAt: now },
    });
    await this.cache.invalidate();
    this.logger.log(
      `Synchronized ${items.length} courses from ${source.sourceName}; deactivated ${inactive.count}`,
    );
  }
}
