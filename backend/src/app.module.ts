import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './infrastructure/database/database.module.js';
import { CacheModule } from './infrastructure/cache/cache.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { OpportunitiesModule } from './modules/opportunities/opportunities.module.js';
import { ApplicationsModule } from './modules/applications/applications.module.js';
import { ImportsModule } from './modules/imports/imports.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    CacheModule,
    AuthModule,
    OpportunitiesModule,
    ApplicationsModule,
    ImportsModule,
  ],
})
export class AppModule {}
