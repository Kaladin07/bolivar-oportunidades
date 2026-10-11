import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { InternalFeaturesGuard } from '../../infrastructure/config/internal-features.guard.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { AuthGuard } from './guards/auth.guard.js';

@Module({
  imports: [JwtModule.register({})],
  controllers: [AuthController],
  providers: [AuthGuard, AuthService, InternalFeaturesGuard],
  exports: [AuthGuard, JwtModule],
})
export class AuthModule {}
