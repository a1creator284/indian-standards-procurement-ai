import type { GapSeverity, GapType, OutdatedStatus, RelationshipType, RequirementCategory, Sector, StandardCategory } from '@/engine/types';

export const CATEGORY_LABELS: Record<StandardCategory, string> = {
  product: 'Product standard',
  'test-method': 'Test method',
  'code-of-practice': 'Code of practice',
  safety: 'Safety',
  terminology: 'Terminology',
  installation: 'Installation',
  general: 'General requirements',
};

export const CATEGORY_TONE: Record<StandardCategory, 'navy' | 'saffron' | 'emerald' | 'amber' | 'rose' | 'slate' | 'sky' | 'violet'> = {
  product: 'navy',
  'test-method': 'sky',
  'code-of-practice': 'violet',
  safety: 'rose',
  terminology: 'slate',
  installation: 'emerald',
  general: 'amber',
};

export const SECTOR_LABELS: Record<Sector, string> = {
  lighting: 'Lighting',
  electrical: 'Electrical',
  cables: 'Cables & wires',
  civil: 'Civil & structural',
  water: 'Water',
  renewable: 'Renewable energy',
  'it-electronics': 'IT & electronics',
  mechanical: 'Mechanical',
  metering: 'Metering',
  jewellery: 'Jewellery',
  general: 'General',
};

export const RELATIONSHIP_TONE: Record<RelationshipType, 'navy' | 'saffron' | 'emerald' | 'amber' | 'rose' | 'slate' | 'sky' | 'violet'> = {
  normative_reference: 'navy',
  test_method: 'sky',
  terminology: 'slate',
  safety: 'rose',
  installation: 'emerald',
  related_product: 'violet',
  allied: 'amber',
  superseded_by: 'saffron',
  part_of: 'slate',
};

export const GAP_TYPE_LABELS: Record<GapType, string> = {
  'missing-standard': 'Missing standard',
  'outdated-reference': 'Outdated reference',
  'missing-test': 'Missing test requirement',
  'missing-safety': 'Missing safety requirement',
  'missing-installation': 'Missing installation requirement',
  'missing-certification': 'Missing certification requirement',
  'missing-terminology': 'Missing terminology',
  'ambiguous-requirement': 'Ambiguous requirement',
  'incomplete-field': 'Incomplete field',
  'missing-performance': 'Missing performance parameter',
};

export const SEVERITY_TONE: Record<GapSeverity, 'rose' | 'amber' | 'slate'> = { high: 'rose', medium: 'amber', low: 'slate' };

export const OUTDATED_LABELS: Record<OutdatedStatus, { label: string; tone: 'rose' | 'amber' | 'emerald' | 'slate' | 'sky' }> = {
  'potentially-outdated': { label: 'Potentially outdated', tone: 'amber' },
  superseded: { label: 'Superseded (indexed)', tone: 'rose' },
  'matches-indexed': { label: 'Matches indexed edition', tone: 'emerald' },
  'newer-than-indexed': { label: 'Newer than index', tone: 'sky' },
  'not-in-index': { label: 'Not in index', tone: 'slate' },
  'year-not-specified': { label: 'Edition not specified', tone: 'slate' },
};

export const REQ_CATEGORY_TONE: Record<RequirementCategory, 'navy' | 'saffron' | 'emerald' | 'amber' | 'rose' | 'slate' | 'sky' | 'violet'> = {
  product: 'navy',
  performance: 'sky',
  electrical: 'violet',
  environmental: 'emerald',
  safety: 'rose',
  mechanical: 'amber',
  material: 'amber',
  installation: 'emerald',
  testing: 'sky',
  certification: 'saffron',
  dimensional: 'slate',
  quantity: 'slate',
  warranty: 'slate',
  reference: 'navy',
  other: 'slate',
};

export function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return iso;
  }
}
