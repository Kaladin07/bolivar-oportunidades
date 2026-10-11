import { Module } from '@nestjs/common';
import { InternalFeaturesGuard } from '../../infrastructure/config/internal-features.guard.js';
import { AuthModule } from '../auth/auth.module.js';
import { ApplicationsController } from './applications.controller.js';
import { ApplicationsService } from './applications.service.js';

@Module({
  imports: [AuthModule],
  controllers: [ApplicationsController],
  providers: [ApplicationsService, InternalFeaturesGuard],
})
export class ApplicationsModule {}
