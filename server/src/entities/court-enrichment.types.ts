export type EnrichmentConfidence = 'high' | 'medium' | 'low';
export type PhotoSource = 'platform' | 'stock' | 'mixed';

export interface CourtEnrichmentMeta {
  sources: string[];
  enrichedAt: string;
  searchQuery: string;
  confidence: EnrichmentConfidence;
  photoSource?: PhotoSource;
}
