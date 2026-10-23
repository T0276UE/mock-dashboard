export interface CustomerMetrics {
  productsAssigned: number;
  totalVehicles: number;
  onlineVehicles: number;
  offlineVehicles: number;
  pausedVehicles: number;
}

export interface ProductInfo {
  abbreviation: string;
  fullName: string;
}

export interface Customer {
  customerId: string;
  name: string;
  status: 'Active' | 'Pending' | 'Inactive';
  products: ProductInfo[];
  metrics: CustomerMetrics;
  email?: string;
  region?: string;
  accountOwner?: string;
  accountSteward?: string;
  activeSince?: string;
  industry?: string;
}

export interface Vehicle {
  vehicleId: string;
  customerId: string;
  vin: string;
  name: string;
  make: string;
  model: string;
  year: number;
  activity: 'Online' | 'Offline' | 'Paused';
  lastSeen: string;
  products: ProductInfo[];
  healthScore?: number;
}
