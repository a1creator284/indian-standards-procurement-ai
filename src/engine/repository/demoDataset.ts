import standardsJson from '../../../data/demo/standards.json';
import relationshipsJson from '../../../data/demo/relationships.json';
import certificationsJson from '../../../data/demo/certifications.json';
import type { StandardsDataset } from '../types';
import { normalizeDataset, type RawDatasetInput } from './normalize';

let cached: StandardsDataset | null = null;

/** Loads and normalises the bundled, clearly-labelled demo dataset. */
export function loadDemoDataset(): StandardsDataset {
  if (cached) return cached;
  const input = {
    meta: standardsJson.meta,
    standards: standardsJson.standards,
    relationships: relationshipsJson.relationships,
    certifications: certificationsJson.certifications,
    standardCertifications: certificationsJson.standardCertifications,
  } as unknown as RawDatasetInput;
  const { dataset } = normalizeDataset(input, standardsJson.meta.generatedAt);
  cached = dataset;
  return dataset;
}
