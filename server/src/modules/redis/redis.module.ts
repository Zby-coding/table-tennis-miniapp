import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Global()
@Module({
  providers: [
    {
      provide: 'REDIS_CLIENT',
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const redisHost = config.get<string>('redis.host');
        if (!redisHost || redisHost === 'localhost') {
          // Return null-inmemory fallback when no Redis
          return null;
        }
        return new Redis({
          host: redisHost,
          port: config.get<number>('redis.port', 6379),
          password: config.get<string>('redis.password') || undefined,
          retryStrategy: (times) => Math.min(times * 50, 2000),
          lazyConnect: true,
        });
      },
    },
  ],
  exports: ['REDIS_CLIENT'],
})
export class RedisModule {}
