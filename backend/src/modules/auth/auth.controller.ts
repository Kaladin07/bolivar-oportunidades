import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Post,
  Put,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import type { Response } from 'express';
import { InternalFeaturesGuard } from '../../infrastructure/config/internal-features.guard.js';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { AuthGuard } from './guards/auth.guard.js';
import type { AuthRequest } from './types/auth-request.type.js';

@Controller('auth')
@UseGuards(InternalFeaturesGuard)
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  private setCookie(response: Response, token: string) {
    response.cookie('session', token, {
      httpOnly: true,
      secure: process.env.COOKIE_SECURE === 'true',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }

  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const user = await this.auth.register(dto);
    this.setCookie(response, await this.auth.token(user));
    return user;
  }

  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const user = await this.auth.login(dto);
    this.setCookie(response, await this.auth.token(user));
    return user;
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) response: Response) {
    response.clearCookie('session', { path: '/' });
    return { ok: true };
  }

  @Get('me')
  @UseGuards(AuthGuard)
  me(@Req() request: AuthRequest) {
    return this.auth.me(request.user.id);
  }

  @Put('profile')
  @UseGuards(AuthGuard)
  updateProfile(
    @Req() request: AuthRequest,
    @Body() dto: UpdateProfileDto,
  ) {
    if (request.user.role !== UserRole.YOUTH) throw new ForbiddenException();
    return this.auth.updateProfile(request.user.id, dto);
  }
}
