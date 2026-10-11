import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { InternalFeaturesGuard } from '../../infrastructure/config/internal-features.guard.js';
import { AuthGuard } from '../auth/guards/auth.guard.js';
import type { AuthRequest } from '../auth/types/auth-request.type.js';
import { SearchOpportunitiesDto } from './dto/search-opportunities.dto.js';
import { UpsertOpportunityDto } from './dto/upsert-opportunity.dto.js';
import { OpportunitiesService } from './opportunities.service.js';

@Controller('opportunities')
export class OpportunitiesController {
  constructor(private readonly opportunities: OpportunitiesService) {}

  @Get()
  search(@Query() query: SearchOpportunitiesDto) {
    return this.opportunities.search(query);
  }

  @Get('mine')
  @UseGuards(InternalFeaturesGuard, AuthGuard)
  mine(@Req() request: AuthRequest) {
    if (request.user.role !== UserRole.PROVIDER) {
      throw new ForbiddenException();
    }
    return this.opportunities.mine(request.user.id);
  }

  @Get(':slug')
  one(@Param('slug') slug: string) {
    return this.opportunities.one(slug);
  }

  @Post()
  @UseGuards(InternalFeaturesGuard, AuthGuard)
  create(
    @Req() request: AuthRequest,
    @Body() dto: UpsertOpportunityDto,
  ) {
    if (request.user.role !== UserRole.PROVIDER) {
      throw new ForbiddenException();
    }
    return this.opportunities.create(request.user.id, dto);
  }

  @Patch(':id')
  @UseGuards(InternalFeaturesGuard, AuthGuard)
  update(
    @Req() request: AuthRequest,
    @Param('id') id: string,
    @Body() dto: UpsertOpportunityDto,
  ) {
    if (request.user.role !== UserRole.PROVIDER) {
      throw new ForbiddenException();
    }
    return this.opportunities.update(id, request.user.id, dto);
  }

  @Delete(':id')
  @UseGuards(InternalFeaturesGuard, AuthGuard)
  remove(@Req() request: AuthRequest, @Param('id') id: string) {
    if (request.user.role !== UserRole.PROVIDER) {
      throw new ForbiddenException();
    }
    return this.opportunities.remove(id, request.user.id);
  }
}
