import { customers, vehicles as seedVehicles } from '../../data/customers';
import type { ProductAssignmentStatus } from '../../shared/components/ProductAssignmentModal';
import type { Vehicle } from '../../types/customer';

export type ProductInfo = Vehicle['products'][number];

export const activityColors: Record<Vehicle['activity'], { bg: string; text: string; border: string }> = {
  Online: { bg: '#ecfdf5', text: '#15803d', border: '#86efac' },
  Offline: { bg: '#fee2e2', text: '#dc2626', border: '#fca5a5' },
  Paused: { bg: '#fef3c7', text: '#a16207', border: '#fcd34d' },
};

export const yearOptions = ['All Years', '2024', '2023', '2022', '2021', '2020'] as const;
export const activityOptions: Array<'All Activity' | Vehicle['activity']> = ['All Activity', 'Online', 'Offline', 'Paused'];
export const drawerWidth = 320;

export const productStatusColors: Record<ProductAssignmentStatus, { bg: string; text: string; border: string; label: string }> = {
  active: { bg: '#ecfdf5', text: '#15803d', border: '#86efac', label: 'Active' },
  pending: { bg: '#fef9c3', text: '#a16207', border: '#fde68a', label: 'Pending' },
  error: { bg: '#fee2e2', text: '#b91c1c', border: '#fca5a5', label: 'Error' },
};

export function formatProductShortCode(value: string) {
  const normalized = value.trim().toUpperCase();
  if (!normalized) return '';

  const segments = normalized.split('-').filter(Boolean);
  if (segments.length >= 3) {
    return `${segments[1]}-${segments[2]}`;
  }

  return normalized;
}

export const supplementalProducts: ProductInfo[] = [
  { abbreviation: 'CMP', fullName: 'Compatibility Validation' },
  { abbreviation: 'CNS', fullName: 'Consent Management' },
  { abbreviation: 'TRI', fullName: 'Trip Intelligence' },
  { abbreviation: 'SEC', fullName: 'Security Monitoring' },
];

const baseProductCatalog: ProductInfo[] = (() => {
  const map = new Map<string, ProductInfo>();

  customers.forEach((customer) => {
    customer.products.forEach((product) => {
      map.set(product.abbreviation, product);
    });
  });

  supplementalProducts.forEach((product) => {
    map.set(product.abbreviation, product);
  });

  return Array.from(map.values()).sort((a, b) => a.abbreviation.localeCompare(b.abbreviation));
})();

function buildSeedVehiclesWithProductVariance(vehicles: Vehicle[]) {
  return vehicles.map((vehicle, index) => {
    const targetCount = index % 5;

    if (targetCount === 0) {
      return { ...vehicle, products: [] };
    }

    const selectedProducts = [...vehicle.products];
    const seen = new Set(selectedProducts.map((product) => product.abbreviation));
    let cursor = index;

    while (selectedProducts.length < targetCount && baseProductCatalog.length > 0) {
      const candidate = baseProductCatalog[cursor % baseProductCatalog.length];
      if (!seen.has(candidate.abbreviation)) {
        selectedProducts.push(candidate);
        seen.add(candidate.abbreviation);
      }
      cursor += 1;
      if (cursor > baseProductCatalog.length * 3) {
        break;
      }
    }

    return { ...vehicle, products: selectedProducts.slice(0, targetCount) };
  });
}

export const seededVehicles = buildSeedVehiclesWithProductVariance(seedVehicles);

export const columnWidths: Record<string, number> = {
  Select: 44,
  Vehicle: 128,
  Customer: 128,
  VIN: 160,
  Make: 88,
  Model: 110,
  Year: 70,
  'Product Status': 220,
};

export const columnAlignments: Record<string, 'center' | 'left' | 'right'> = {
  Select: 'center',
  Vehicle: 'center',
  Customer: 'center',
  VIN: 'center',
  Make: 'center',
  Model: 'center',
  Year: 'center',
  'Product Status': 'center',
};

export type YearFilter = (typeof yearOptions)[number];
export type ActivityFilter = (typeof activityOptions)[number];

export function getDefaultProductStatus(vehicle: Vehicle, product: ProductInfo): ProductAssignmentStatus {
  if (product.abbreviation === 'CMP' || product.abbreviation === 'CNS') {
    return 'pending';
  }

  if (vehicle.activity === 'Online') {
    return 'active';
  }

  if (vehicle.activity === 'Paused') {
    return 'pending';
  }

  return 'error';
}

export function buildInitialProductStatusMap(vehicles: Vehicle[]) {
  return vehicles.reduce<Record<string, Record<string, ProductAssignmentStatus>>>((acc, vehicle) => {
    acc[vehicle.vehicleId] = vehicle.products.reduce<Record<string, ProductAssignmentStatus>>((productAcc, product) => {
      productAcc[product.abbreviation] = getDefaultProductStatus(vehicle, product);
      return productAcc;
    }, {});
    return acc;
  }, {});
}

export function matchesVehicleSearch(vehicle: Vehicle, searchTerm: string) {
  if (!searchTerm) return true;

  const normalized = searchTerm.toLowerCase();
  const customerName = customers.find((customer) => customer.customerId === vehicle.customerId)?.name ?? '';

  return [vehicle.name, vehicle.vin, vehicle.make, vehicle.model, customerName, vehicle.customerId, String(vehicle.year)]
    .join(' ')
    .toLowerCase()
    .includes(normalized);
}

export function buildProductCatalog(vehicles: Vehicle[]): ProductInfo[] {
  const map = new Map<string, ProductInfo>();

  customers.forEach((customer) => {
    customer.products.forEach((product) => {
      map.set(product.abbreviation, product);
    });
  });

  vehicles.forEach((vehicle) => {
    vehicle.products.forEach((product) => {
      map.set(product.abbreviation, product);
    });
  });

  supplementalProducts.forEach((product) => {
    if (!map.has(product.abbreviation)) {
      map.set(product.abbreviation, product);
    }
  });

  return Array.from(map.values()).sort((a, b) => a.abbreviation.localeCompare(b.abbreviation));
}
