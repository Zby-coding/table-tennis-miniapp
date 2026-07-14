import { PaidCourtProvider } from './paid-court.provider';

describe('PaidCourtProvider', () => {
  it('returns normalized paid table-tennis venues for Nanyang', async () => {
    const provider = new PaidCourtProvider();

    const venues = await provider.fetchPaidCourts('南阳');

    expect(venues.length).toBeGreaterThanOrEqual(7);
    expect(venues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: '卓悦乒搏俱乐部',
          isFree: false,
          isIndoor: true,
          hasLighting: true,
        }),
        expect.objectContaining({
          name: '挥扬乒乓球运动俱乐部',
          address: expect.stringContaining('宛城区'),
          isFree: false,
        }),
        expect.objectContaining({
          name: '风云乒乓球运动俱乐部',
          address: expect.stringContaining('宛城区'),
          isFree: false,
        }),
      ]),
    );

    for (const venue of venues) {
      expect(venue.lat).toEqual(expect.any(Number));
      expect(venue.lng).toEqual(expect.any(Number));
      expect(venue.features).toContain('第三方付费场馆');
    }
  });
});
