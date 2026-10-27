import type { ProductInfo } from '../../types/customer';

export interface ProductRow {
  product: string;
  category: string;
  delivery: string;
  availability: 'Available' | 'Limited' | 'Draft';
  feature: string;
  active: number;
  paused: number;
  disabled: number;
}

export interface ProductCatalogEntry {
  sku: string;
  name: string;
  category: string;
  availability: string;
  price: string;
  productInfo: ProductInfo;
}

export const sampleProductRows: ProductRow[] = [
  { product: 'Vehicle Health Telemetry', category: 'Telemetry', delivery: 'Kinesis stream', availability: 'Available', feature: 'Diagnostics', active: 18402, paused: 620, disabled: 84 },
  { product: 'Vehicle Location History', category: 'Location', delivery: 'S3 batch', availability: 'Limited', feature: 'Location', active: 14315, paused: 314, disabled: 127 },
  { product: 'Driving Behavior Analytics', category: 'Analytics', delivery: 'Kinesis stream', availability: 'Available', feature: 'Telematics', active: 12948, paused: 441, disabled: 96 },
  { product: 'Battery Health Insights', category: 'Telemetry', delivery: 'Kinesis stream', availability: 'Available', feature: 'Battery', active: 8734, paused: 275, disabled: 201 },
  { product: 'EV Charging Intelligence', category: 'API', delivery: 'S3 batch', availability: 'Available', feature: 'Charging', active: 5903, paused: 119, disabled: 63 },
  { product: 'Diagnostics Summary', category: 'Diagnostics', delivery: 'API', availability: 'Available', feature: 'Diagnostics', active: 3481, paused: 182, disabled: 104 },
  { product: 'Maintenance Predictor', category: 'Diagnostics', delivery: 'Kinesis stream', availability: 'Limited', feature: 'Maintenance', active: 1037, paused: 142, disabled: 88 },
  { product: 'Insurance Risk Signals', category: 'Risk', delivery: 'API', availability: 'Draft', feature: 'Risk', active: 0, paused: 52, disabled: 101 },
];

export const creationPrompts = [
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
  'Praesent volutpat interdum urna, in posuere lorem pulvinar ut.',
  'Integer posuere tortor a purus iaculis, vitae blandit lorem tristique.',
];

export const products: ProductCatalogEntry[] = [
  {
    sku: 'PRD-1001',
    name: 'Fleet Core',
    category: 'Platform',
    availability: 'In stock',
    price: '$1,200',
    productInfo: { abbreviation: 'FLT', fullName: 'Fleet Management Suite' },
  },
  {
    sku: 'PRD-1082',
    name: 'Vehicle Insight Pro',
    category: 'Analytics',
    availability: 'Low stock',
    price: '$980',
    productInfo: { abbreviation: 'ANL', fullName: 'Driving Behavior Analytics' },
  },
  {
    sku: 'PRD-1143',
    name: 'Compatibility Gateway',
    category: 'Integration',
    availability: 'In stock',
    price: '$1,450',
    productInfo: { abbreviation: 'CMP', fullName: 'Compatibility Validation' },
  },
  {
    sku: 'PRD-1205',
    name: 'API Access Pack',
    category: 'Support',
    availability: 'Backorder',
    price: '$340',
    productInfo: { abbreviation: 'SUP', fullName: 'Support Services' },
  },
];

export const featureOptions = ['All features', 'Diagnostics', 'Location', 'Telematics', 'Battery', 'Charging', 'Maintenance', 'Risk'];
export const availabilityOptions = ['All availability', 'Available', 'Limited', 'Draft'];

export function getSortedProductRows(
  rows: ProductRow[],
  searchTerm: string,
  featureFilter: string,
  availabilityFilter: string,
  sortOption: string,
): ProductRow[] {
  const filtered = rows.filter((row) => {
    const matchesSearch = !searchTerm || row.product.toLowerCase().includes(searchTerm.toLowerCase()) || row.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFeature = featureFilter === 'All features' || row.feature === featureFilter;
    const matchesAvailability = availabilityFilter === 'All availability' || row.availability === availabilityFilter;
    return matchesSearch && matchesFeature && matchesAvailability;
  });

  const copy = [...filtered];
  switch (sortOption) {
    case 'A-Z':
      copy.sort((a, b) => a.product.localeCompare(b.product));
      break;
    case 'Most active':
      copy.sort((a, b) => Number(b.active) - Number(a.active));
      break;
    case 'Least active':
      copy.sort((a, b) => Number(a.active) - Number(b.active));
      break;
    default:
      break;
  }

  return copy;
}
