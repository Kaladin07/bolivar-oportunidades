import {
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

@Injectable()
export class InternalFeaturesGuard implements CanActivate {
  canActivate(_context: ExecutionContext) {
    if (process.env.INTERNAL_FEATURES_ENABLED === 'true') return true;
    throw new NotFoundException();
  }
}
