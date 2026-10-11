import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Modality, Prisma } from '@prisma/client';
import { CacheService } from '../../infrastructure/cache/cache.service.js';
import { PrismaService } from '../../infrastructure/database/prisma.service.js';
import type { SearchOpportunitiesDto } from './dto/search-opportunities.dto.js';
import type { UpsertOpportunityDto } from './dto/upsert-opportunity.dto.js';

const publicInclude = {
  provider: { select: { id: true, displayName: true, location: true } },
  categories: { select: { id: true, name: true } },
} satisfies Prisma.OpportunityInclude;

@Injectable()
export class OpportunitiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async search(query: SearchOpportunitiesDto) {
    const page = query.page || 1;
    const version = await this.cache.version();
    const key = `opportunities:${version}:${JSON.stringify({
      q: query.q,
      type: query.type,
      modality: query.modality,
      location: query.location,
      page,
    })}`;
    const cached = await this.cache.get<unknown>(key);
    if (cached) return cached;

    const where: Prisma.OpportunityWhereInput = {
      OR: [{ closingDate: null }, { closingDate: { gte: new Date() } }],
      AND: [
        {
          OR: [
            { externalKey: null },
            {
              lastSyncedAt: {
                gte: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
              },
            },
          ],
        },
        ...(query.q
          ? [
              {
                OR: [
                  {
                    title: {
                      contains: query.q,
                      mode: 'insensitive' as const,
                    },
                  },
                  {
                    description: {
                      contains: query.q,
                      mode: 'insensitive' as const,
                    },
                  },
                ],
              },
            ]
          : []),
      ],
      ...(query.type ? { type: query.type } : {}),
      ...(query.modality ? { modality: query.modality } : {}),
      ...(query.location
        ? {
            locationPhysical: {
              contains: query.location,
              mode: 'insensitive',
            },
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.opportunity.findMany({
        where,
        include: publicInclude,
        orderBy: { publishedAt: 'desc' },
        skip: (page - 1) * 12,
        take: 12,
      }),
      this.prisma.opportunity.count({ where }),
    ]);
    const result = { items, total, page, pages: Math.ceil(total / 12) };
    await this.cache.set(key, result);
    return result;
  }

  async one(slug: string) {
    const opportunity = await this.prisma.opportunity.findUnique({
      where: { slug },
      include: publicInclude,
    });
    const externalExpired =
      opportunity?.externalKey &&
      ((opportunity.closingDate && opportunity.closingDate < new Date()) ||
        !opportunity.lastSyncedAt ||
        opportunity.lastSyncedAt <
          new Date(Date.now() - 45 * 24 * 60 * 60 * 1000));
    if (!opportunity || externalExpired) throw new NotFoundException();
    return opportunity;
  }

  mine(providerId: string) {
    return this.prisma.opportunity.findMany({
      where: { providerId },
      include: {
        categories: true,
        _count: { select: { applications: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  private categories(names: string[]) {
    return {
      connectOrCreate: names.map((name) => ({
        where: { name },
        create: { name },
      })),
    };
  }

  async create(providerId: string, dto: UpsertOpportunityDto) {
    if (!dto.title?.trim() || !dto.description?.trim() || !dto.type || !dto.modality) {
      throw new BadRequestException(
        'Title, description, type, and modality are required',
      );
    }
    if (dto.modality !== Modality.REMOTE && !dto.locationPhysical?.trim()) {
      throw new BadRequestException('Physical location is required');
    }
    const slugBase = dto.title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 80);
    const opportunity = await this.prisma.opportunity.create({
      data: {
        slug: `${slugBase}-${randomUUID().slice(0, 8)}`,
        title: dto.title.trim(),
        description: dto.description.trim(),
        type: dto.type,
        modality: dto.modality,
        locationPhysical:
          dto.modality === Modality.REMOTE
            ? null
            : dto.locationPhysical?.trim(),
        closingDate: dto.closingDate ? new Date(dto.closingDate) : null,
        providerId,
        categories: this.categories(
          (dto.categories ?? []).map((name) => name.trim()).filter(Boolean),
        ),
      },
      include: publicInclude,
    });
    await this.cache.invalidate();
    return opportunity;
  }

  async update(
    id: string,
    providerId: string,
    dto: UpsertOpportunityDto,
  ) {
    const existing = await this.prisma.opportunity.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException();
    if (existing.providerId !== providerId) throw new ForbiddenException();
    const modality = dto.modality ?? existing.modality;
    const location = dto.locationPhysical ?? existing.locationPhysical;
    if (modality !== Modality.REMOTE && !location?.trim()) {
      throw new BadRequestException('Physical location is required');
    }

    const opportunity = await this.prisma.opportunity.update({
      where: { id },
      data: {
        title: dto.title?.trim(),
        description: dto.description?.trim(),
        type: dto.type,
        modality,
        locationPhysical:
          modality === Modality.REMOTE ? null : location?.trim(),
        closingDate: dto.closingDate ? new Date(dto.closingDate) : undefined,
        ...(dto.categories
          ? {
              categories: {
                set: [],
                ...this.categories(
                  dto.categories.map((name) => name.trim()).filter(Boolean),
                ),
              },
            }
          : {}),
      },
      include: publicInclude,
    });
    await this.cache.invalidate();
    return opportunity;
  }

  async remove(id: string, providerId: string) {
    const existing = await this.prisma.opportunity.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException();
    if (existing.providerId !== providerId) throw new ForbiddenException();
    await this.prisma.opportunity.delete({ where: { id } });
    await this.cache.invalidate();
    return { ok: true };
  }
}
