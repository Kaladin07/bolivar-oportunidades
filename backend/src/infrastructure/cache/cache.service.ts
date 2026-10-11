import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Redis } from 'ioredis';

@Injectable()
export class CacheService implements OnModuleDestroy {
  private readonly client: Redis | null;

  constructor() {
    this.client = process.env.REDIS_URL
      ? new Redis(process.env.REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 1, enableOfflineQueue: false })
      : null;
    this.client?.on('error', () => undefined);
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      if (!this.client) return null;
      if (this.client.status === 'wait') await this.client.connect();
      const value = await this.client.get(key);
      return value ? (JSON.parse(value) as T) : null;
    } catch {
      return null;
    }
  }

  async set(key: string, value: unknown): Promise<void> {
    try {
      if (!this.client) return;
      if (this.client.status === 'wait') await this.client.connect();
      await this.client.set(key, JSON.stringify(value), 'EX', 60);
    } catch {
      // Search remains available through PostgreSQL.
    }
  }

  async version(): Promise<string> {
    try {
      if (!this.client) return '0';
      if (this.client.status === 'wait') await this.client.connect();
      return (await this.client.get('opportunities:version')) ?? '0';
    } catch {
      return '0';
    }
  }

  async invalidate(): Promise<void> {
    try {
      if (!this.client) return;
      if (this.client.status === 'wait') await this.client.connect();
      await this.client.incr('opportunities:version');
    } catch {
      // Cached results expire after one minute if invalidation is unavailable.
    }
  }

  async onModuleDestroy() {
    this.client?.disconnect();
  }
}
