import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma, UserRole } from '@prisma/client';
import { compare, hash } from 'bcryptjs';
import { PrismaService } from '../../infrastructure/database/prisma.service.js';
import type { LoginDto } from './dto/login.dto.js';
import type { RegisterDto } from './dto/register.dto.js';
import type { UpdateProfileDto } from './dto/update-profile.dto.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    if (dto.role === UserRole.ADMIN) {
      throw new BadRequestException('Admin registration is unavailable');
    }
    if (dto.role === UserRole.PROVIDER && !dto.displayName?.trim()) {
      throw new BadRequestException('Organization name is required');
    }
    const email = dto.email.trim().toLowerCase();
    if (await this.prisma.user.findUnique({ where: { email } })) {
      throw new ConflictException('Email already registered');
    }

    try {
      return await this.prisma.user.create({
        data: {
          email,
          passwordHash: await hash(dto.password, 12),
          role: dto.role,
          location: dto.location,
          displayName: dto.displayName?.trim(),
          profile: { create: { skills: [] } },
        },
        select: {
          id: true,
          email: true,
          role: true,
          location: true,
          displayName: true,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Email already registered');
      }
      throw error;
    }
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.trim().toLowerCase() },
    });
    if (!user || !(await compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      location: user.location,
      displayName: user.displayName,
    };
  }

  async token(user: { id: string; role: UserRole }) {
    const secret = process.env.JWT_SECRET;
    if (!secret || secret.length < 32) {
      throw new Error('JWT_SECRET must contain at least 32 characters');
    }
    return this.jwt.signAsync(
      { id: user.id, role: user.role },
      { secret, expiresIn: '7d' },
    );
  }

  me(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        role: true,
        location: true,
        displayName: true,
        profile: true,
      },
    });
  }

  async updateProfile(id: string, dto: UpdateProfileDto) {
    await this.prisma.user.update({
      where: { id },
      data: {
        location: dto.location,
        profile: {
          upsert: {
            create: {
              bio: dto.bio,
              skills: dto.skills ?? [],
              educationLevel: dto.educationLevel,
            },
            update: {
              bio: dto.bio,
              skills: dto.skills,
              educationLevel: dto.educationLevel,
            },
          },
        },
      },
    });
    return this.me(id);
  }
}
