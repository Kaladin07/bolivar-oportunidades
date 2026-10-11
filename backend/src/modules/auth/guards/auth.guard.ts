import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { UserRole } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service.js';
import type { AuthRequest } from '../types/auth-request.type.js';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthRequest>();
    const token = request.cookies?.session as string | undefined;
    if (!token) throw new UnauthorizedException();

    try {
      const secret = process.env.JWT_SECRET;
      if (!secret) throw new Error('JWT_SECRET is required');
      const claims = await this.jwt.verifyAsync<{ id: string; role: UserRole }>(
        token,
        { secret },
      );
      const user = await this.prisma.user.findUnique({
        where: { id: claims.id },
        select: { id: true, role: true },
      });
      if (!user || user.role !== claims.role) throw new Error('Invalid session');
      request.user = user;
      return true;
    } catch {
      throw new UnauthorizedException();
    }
  }
}
