import { Module } from '@nestjs/common';
import { InternalFeaturesGuard } from '../../infrastructure/config/internal-features.guard.js';
import { AuthModule } from '../auth/auth.module.js';
import { OpportunitiesController } from './opportunities.controller.js';
import { OpportunitiesService } from './opportunities.service.js';

@Module({
  imports: [AuthModule],
  controllers: [OpportunitiesController],
  providers: [OpportunitiesService, InternalFeaturesGuard],
})
export class OpportunitiesModule {}
