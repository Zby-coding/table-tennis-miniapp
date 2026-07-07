import { registerAs } from '@nestjs/config';

export const jwtConfig = registerAs('jwt', () => ({
  secret: process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? (() => { throw new Error('JWT_SECRET env var is required in production'); })() : 'tt-pro-jwt-dev-only'),
  expiresIn: process.env.JWT_EXPIRES_IN || '7d',
}));
