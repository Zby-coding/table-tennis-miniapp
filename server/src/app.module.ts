import { Module, Global } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { appConfig } from './config/app.config';
import { databaseConfig } from './config/database.config';
import { redisConfig } from './config/redis.config';
import { jwtConfig } from './config/jwt.config';
import { entities } from './entities';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { UserModule } from './modules/user/user.module';
import { AuthModule } from './modules/auth/auth.module';
import { CourtModule } from './modules/court/court.module';
import { CheckinModule } from './modules/checkin/checkin.module';
import { PostModule } from './modules/post/post.module';
import { MatchModule } from './modules/match/match.module';
import { AchievementModule } from './modules/achievement/achievement.module';
import { UploadModule } from './modules/upload/upload.module';
import { RedisModule } from './modules/redis/redis.module';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, redisConfig, jwtConfig],
      envFilePath: ['.env', '.env.local'],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const dbHost = config.get<string>('database.host');
        if (!dbHost || (dbHost === 'localhost' && !config.get<string>('database.password'))) {
          return {
            type: 'better-sqlite3' as const,
            database: 'table-tennis-dev3.sqlite',
            entities,
            synchronize: true,
            logging: false,
          };
        }
        return {
          type: 'mysql' as const,
          host: dbHost,
          port: config.get<number>('database.port', 3306),
          username: config.get<string>('database.username', 'root'),
          password: config.get<string>('database.password', ''),
          database: config.get<string>('database.database', 'table_tennis'),
          entities,
          synchronize: process.env.NODE_ENV !== 'production',
          logging: false,
          timezone: '+08:00',
        };
      },
    }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('jwt.secret'),
        signOptions: { expiresIn: config.get<string>('jwt.expiresIn', '7d') },
      }),
    }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot({ throttlers: [{ ttl: 60000, limit: 100 }] }),
    RedisModule,
    UserModule, AuthModule, CourtModule, CheckinModule,
    PostModule, MatchModule, AchievementModule, UploadModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
