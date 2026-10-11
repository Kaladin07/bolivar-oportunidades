import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { InternalFeaturesGuard } from '../../infrastructure/config/internal-features.guard.js';
import { AuthGuard } from '../auth/guards/auth.guard.js';
import type { AuthRequest } from '../auth/types/auth-request.type.js';
import { ApplicationsService } from './applications.service.js';
import { UpdateApplicationStatusDto } from './dto/update-application-status.dto.js';

@Controller('applications')
@UseGuards(InternalFeaturesGuard, AuthGuard)
export class ApplicationsController {
  constructor(private readonly applications: ApplicationsService) {}

  @Get('mine')
  mine(@Req() request: AuthRequest) {
    if (request.user.role !== UserRole.YOUTH) throw new ForbiddenException();
    return this.applications.mine(request.user.id);
  }

  @Get('opportunity/:id')
  forOpportunity(@Req() request: AuthRequest, @Param('id') id: string) {
    if (request.user.role !== UserRole.PROVIDER) {
      throw new ForbiddenException();
    }
    return this.applications.forOpportunity(request.user.id, id);
  }

  @Post(':opportunityId')
  apply(
    @Req() request: AuthRequest,
    @Param('opportunityId') opportunityId: string,
  ) {
    if (request.user.role !== UserRole.YOUTH) throw new ForbiddenException();
    return this.applications.apply(request.user.id, opportunityId);
  }

  @Patch(':id/status')
  updateStatus(
    @Req() request: AuthRequest,
    @Param('id') id: string,
    @Body() dto: UpdateApplicationStatusDto,
  ) {
    if (request.user.role !== UserRole.PROVIDER) {
      throw new ForbiddenException();
    }
    return this.applications.updateStatus(request.user.id, id, dto.status);
  }
}
