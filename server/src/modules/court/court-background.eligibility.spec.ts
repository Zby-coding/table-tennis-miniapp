import { mapCourtMedia } from './court-enrichment.util';

describe('background eligibility helpers via mapCourtMedia', () => {
  it('marks stock when empty photos', () => {
    const media = mapCourtMedia({ photos: [], facilityPhotos: [], enrichmentMeta: null });
    expect(media.photoSource === 'platform').toBe(false);
  });

  it('respects enrichmentMeta photoSource platform', () => {
    const media = mapCourtMedia({
      photos: ['/uploads/courts/1/live-0.jpg'],
      enrichmentMeta: {
        photoSource: 'platform',
        sources: ['user_upload'],
        enrichedAt: new Date().toISOString(),
        searchQuery: 'x',
        confidence: 'high',
      },
    });
    expect(media.photoSource).toBe('platform');
  });
});
