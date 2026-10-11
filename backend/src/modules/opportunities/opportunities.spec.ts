import { NotFoundException } from '@nestjs/common';
import type { PrismaService } from '../../infrastructure/database/prisma.service.js';
import type { CacheService } from '../../infrastructure/cache/cache.service.js';
import { OpportunitiesService } from './opportunities.service.js';

describe('OpportunitiesService in aggregator mode', () => {
  const prisma = {
    opportunity: {
      findMany: vi.fn(),
      count: vi.fn(),
      findFirst: vi.fn(),
    },
    $transaction: vi.fn(),
  };
  const cache = {
    version: vi.fn(),
    get: vi.fn(),
    set: vi.fn(),
  };
  const service = new OpportunitiesService(
    prisma as unknown as PrismaService,
    cache as unknown as CacheService,
  );

  beforeEach(() => {
    vi.resetAllMocks();
    cache.version.mockResolvedValue(1);
    cache.get.mockResolvedValue(null);
    cache.set.mockResolvedValue(undefined);
    prisma.opportunity.findMany.mockReturnValue(Promise.resolve([]));
    prisma.opportunity.count.mockReturnValue(Promise.resolve(0));
    prisma.$transaction.mockResolvedValue([[], 0]);
  });

  it('restricts the public search to fresh external opportunities', async () => {
    await service.search({ page: 1 });

    expect(prisma.opportunity.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          externalKey: { not: null },
          sourceName: { not: null },
          sourceUrl: { not: null },
          lastSyncedAt: { gte: expect.any(Date) },
        }),
      }),
    );
  });

  it('searches public fields and can order by the nearest closing date', async () => {
    await service.search({
      page: 1,
      q: '  logística  ',
      location: 'Colombia',
      sort: 'closing',
    });

    expect(prisma.opportunity.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            expect.objectContaining({
              OR: expect.arrayContaining([
                { title: { contains: 'logística', mode: 'insensitive' } },
                {
                  organizationName: {
                    contains: 'logística',
                    mode: 'insensitive',
                  },
                },
                {
                  categories: {
                    some: {
                      name: {
                        contains: 'logística',
                        mode: 'insensitive',
                      },
                    },
                  },
                },
              ]),
            }),
            {
              OR: [
                {
                  locationPhysical: {
                    contains: 'Colombia',
                    mode: 'insensitive',
                  },
                },
                { eligibleLocations: { has: 'Colombia' } },
              ],
            },
          ]),
        }),
        orderBy: [
          { closingDate: { sort: 'asc', nulls: 'last' } },
          { publishedAt: 'desc' },
        ],
      }),
    );
  });

  it('does not expose an internal opportunity by slug', async () => {
    prisma.opportunity.findFirst.mockResolvedValue(null);

    await expect(service.one('internal-listing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.opportunity.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          slug: 'internal-listing',
          externalKey: { not: null },
          sourceName: { not: null },
          sourceUrl: { not: null },
        },
      }),
    );
  });
});
