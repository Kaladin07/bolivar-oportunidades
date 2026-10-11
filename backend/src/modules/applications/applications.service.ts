import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ApplicationStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service.js';

@Injectable()
export class ApplicationsService {
  constructor(private readonly prisma: PrismaService) {}

  async apply(youthId: string, opportunityId: string) {
    const opportunity = await this.prisma.opportunity.findUnique({
      where: { id: opportunityId },
    });
    if (!opportunity) throw new NotFoundException();
    if (opportunity.externalKey) {
      throw new BadRequestException('Apply through the original source');
    }
    if (opportunity.closingDate && opportunity.closingDate < new Date()) {
      throw new BadRequestException('Applications are closed');
    }

    const youth = await this.prisma.user.findUnique({
      where: { id: youthId },
      include: { profile: true },
    });
    if (
      !youth?.profile ||
      (!youth.profile.bio && youth.profile.skills.length === 0)
    ) {
      throw new BadRequestException('Complete your profile before applying');
    }

    const existing = await this.prisma.application.findUnique({
      where: { youthId_opportunityId: { youthId, opportunityId } },
    });
    if (existing) throw new ConflictException('Already applied');

    try {
      return await this.prisma.application.create({
        data: {
          youthId,
          opportunityId,
          profileSnapshot: {
            bio: youth.profile.bio,
            skills: youth.profile.skills,
            educationLevel: youth.profile.educationLevel,
            location: youth.location,
          },
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Already applied');
      }
      throw error;
    }
  }

  mine(youthId: string) {
    return this.prisma.application.findMany({
      where: { youthId },
      include: {
        opportunity: {
          include: { provider: { select: { displayName: true } } },
        },
      },
      orderBy: { appliedAt: 'desc' },
    });
  }

  async forOpportunity(providerId: string, opportunityId: string) {
    const opportunity = await this.prisma.opportunity.findUnique({
      where: { id: opportunityId },
    });
    if (!opportunity) throw new NotFoundException();
    if (opportunity.providerId !== providerId) throw new ForbiddenException();
    return this.prisma.application.findMany({
      where: { opportunityId },
      include: { youth: { select: { email: true, location: true } } },
      orderBy: { appliedAt: 'desc' },
    });
  }

  async updateStatus(
    providerId: string,
    id: string,
    status: ApplicationStatus,
  ) {
    const application = await this.prisma.application.findUnique({
      where: { id },
      include: { opportunity: true },
    });
    if (!application) throw new NotFoundException();
    if (application.opportunity.providerId !== providerId) {
      throw new ForbiddenException();
    }
    return this.prisma.application.update({
      where: { id },
      data: { status },
    });
  }
}
