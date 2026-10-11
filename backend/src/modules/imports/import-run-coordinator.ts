import { Injectable } from '@nestjs/common';

@Injectable()
export class ImportRunCoordinator {
  private queue: Promise<void> = Promise.resolve();

  enqueue(task: () => Promise<void>) {
    const run = this.queue.then(task);
    this.queue = run.catch(() => undefined);
    return run;
  }
}
