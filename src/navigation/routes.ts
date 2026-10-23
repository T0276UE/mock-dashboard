import type { NavRoute, Role } from './types';

const all: Role[] = ['user', 'sysadmin', 'admin'];
const editors: Role[] = ['sysadmin', 'admin'];
const viewers: Role[] = ['user', 'sysadmin', 'admin'];

export const routes: NavRoute[] = [
  { id: 'landing', path: '/', name: 'Landing', component: 'LandingPage', exact: true, requiredRoles: all },
  { id: 'customers', path: '/customers', name: 'Customers', component: 'CustomersPage', requiredRoles: viewers },
  { id: 'products', path: '/products', name: 'Products', component: 'ProductsPage', requiredRoles: viewers },
  { id: 'vehicles', path: '/vehicles', name: 'Vehicles', component: 'VehiclesPage', requiredRoles: viewers },
  { id: 'compat', path: '/compatibility', name: 'Compatibility', component: 'CompatibilityPage', requiredRoles: viewers },
  { id: 'manage', path: '/management', name: 'User Management', component: 'ManagementPage', requiredRoles: editors },
];
