import { Module, Global, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Global()
@Module({
  providers: [
    {
      provide: 'REDIS_CLIENT',
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const redisHost = (config.get<string>('redis.host') || '').trim();
        if (!redisHost) {
          Logger.log('Redis host empty — running without Redis', 'RedisModule');
          return null;
        }
        const client = new Redis({
          host: redisHost,
          port: config.get<number>('redis.port', 6379),
          password: config.get<string>('redis.password') || undefined,
          retryStrategy: (times) => {
            if (times > 3) return null;
            return Math.min(times * 50, 2000);
          },
          maxRetriesPerRequest: 1,
          lazyConnect: true,
          enableOfflineQueue: false,
        });
        client.on('error', () => {
          // swallow spam; callers must tolerate null/errors
        });
        return client;
      },
    },
  ],
  exports: ['REDIS_CLIENT'],
})
export class RedisModule {}
