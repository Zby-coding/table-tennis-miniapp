export const jwtConfig = () => ({
  secret: 'tt-pro-jwt-dev-only',
  expiresIn: process.env.JWT_EXPIRES_IN || '7d',
});
