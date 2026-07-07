// Use factory functions instead of registerAs for easier module resolution
export const appConfig = () => ({
  port: parseInt(process.env.PORT || '3001', 10),
  checkin: {
    gpsRadius: parseInt(process.env.CHECKIN_GPS_RADIUS || '200', 10),
    autoTimeoutMinutes: parseInt(process.env.CHECKIN_AUTO_TIMEOUT_MINUTES || '180', 10),
  },
});
