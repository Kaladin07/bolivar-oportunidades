import { BadRequestException, ConflictException } from '@nestjs/common';
import { ApplicationsService } from './applications.service.js';
import type { PrismaService } from '../../infrastructure/database/prisma.service.js';

describe('ApplicationsService', () => {
  const profile = { bio: 'Interested in logistics', skills: ['Planning'], educationLevel: 'Secondary' };
  const opportunity = { id: 'opportunity-1', closingDate: null };
  const youth = { location: 'Cartagena', profile };
  const prisma = {
    opportunity: { findUnique: vi.fn() },
    user: { findUnique: vi.fn() },
    application: { findUnique: vi.fn(), create: vi.fn() },
  };
  const service = new ApplicationsService(prisma as unknown as PrismaService);

  beforeEach(() => {
    vi.resetAllMocks();
    prisma.opportunity.findUnique.mockResolvedValue(opportunity);
    prisma.user.findUnique.mockResolvedValue(youth);
    prisma.application.findUnique.mockResolvedValue(null);
    prisma.application.create.mockResolvedValue({ id: 'application-1' });
  });

  it('submits a snapshot of the saved profile', async () => {
    await service.apply('youth-1', 'opportunity-1');
    expect(prisma.application.create).toHaveBeenCalledWith({ data: {
      youthId: 'youth-1', opportunityId: 'opportunity-1',
      profileSnapshot: { ...profile, location: 'Cartagena' },
    } });
  });

  it('rejects an already submitted application', async () => {
    prisma.application.findUnique.mockResolvedValue({ id: 'existing' });
    await expect(service.apply('youth-1', 'opportunity-1')).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.application.create).not.toHaveBeenCalled();
  });

  it('rejects an expired opportunity', async () => {
    prisma.opportunity.findUnique.mockResolvedValue({ ...opportunity, closingDate: new Date('2020-01-01') });
    await expect(service.apply('youth-1', 'opportunity-1')).rejects.toBeInstanceOf(BadRequestException);
  });
});
