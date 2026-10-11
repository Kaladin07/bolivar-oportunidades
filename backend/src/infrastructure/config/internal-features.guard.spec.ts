import { NotFoundException, type ExecutionContext } from '@nestjs/common';
import { InternalFeaturesGuard } from './internal-features.guard.js';

describe('InternalFeaturesGuard', () => {
  const guard = new InternalFeaturesGuard();
  const context = {} as ExecutionContext;
  const previous = process.env.INTERNAL_FEATURES_ENABLED;

  afterEach(() => {
    if (previous === undefined) delete process.env.INTERNAL_FEATURES_ENABLED;
    else process.env.INTERNAL_FEATURES_ENABLED = previous;
  });

  it('hides internal routes by default', () => {
    delete process.env.INTERNAL_FEATURES_ENABLED;
    expect(() => guard.canActivate(context)).toThrow(NotFoundException);
  });

  it('allows internal routes only when explicitly enabled', () => {
    process.env.INTERNAL_FEATURES_ENABLED = 'true';
    expect(guard.canActivate(context)).toBe(true);
  });
});
