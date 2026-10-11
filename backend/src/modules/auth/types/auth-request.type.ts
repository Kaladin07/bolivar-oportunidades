import type { UserRole } from '@prisma/client';
import type { Request } from 'express';

export type AuthRequest = Request & {
  user: { id: string; role: UserRole };
};
