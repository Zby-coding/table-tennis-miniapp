export const redisConfig = () => ({
  // Empty host = disable Redis (dev without local redis)
  host: (process.env.REDIS_HOST || '').trim(),
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
});
