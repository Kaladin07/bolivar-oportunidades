import { describe, expect, it } from 'vitest';
import { ImportRunCoordinator } from './import-run-coordinator.js';

describe('ImportRunCoordinator', () => {
  it('runs importer tasks sequentially', async () => {
    const coordinator = new ImportRunCoordinator();
    const events: string[] = [];
    let releaseFirst!: () => void;
    const firstCanFinish = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });

    const first = coordinator.enqueue(async () => {
      events.push('first:start');
      await firstCanFinish;
      events.push('first:end');
    });
    const second = coordinator.enqueue(async () => {
      events.push('second');
    });

    await Promise.resolve();
    expect(events).toEqual(['first:start']);

    releaseFirst();
    await Promise.all([first, second]);
    expect(events).toEqual(['first:start', 'first:end', 'second']);
  });

  it('continues with the next task after a failure', async () => {
    const coordinator = new ImportRunCoordinator();
    let nextCompleted = false;
    const failed = coordinator.enqueue(async () => {
      throw new Error('synthetic importer failure');
    });
    const next = coordinator.enqueue(async () => {
      nextCompleted = true;
    });

    await expect(failed).rejects.toThrow('synthetic importer failure');
    await expect(next).resolves.toBeUndefined();
    expect(nextCompleted).toBe(true);
  });
});
