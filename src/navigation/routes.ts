import type { NavRoute, Role } from './types';

const all: Role[] = ['user', 'sysadmin', 'admin'];
const editors: Role[] = ['sysadmin', 'admin'];
const viewers: Role[] = ['user', 'sysadmin', 'admin'];

export const routes: NavRoute[] = [
  {
    id: 'landing',
    path: '/',
    name: 'Landing',
    component: 'LandingPage',
    exact: true,
    requiredRoles: all,
    requiredPermissions: ['dashboard:view'],
  },
  {
    id: 'customers',
    path: '/customers',
    name: 'Customers',
    component: 'CustomersPage',
    requiredRoles: viewers,
    requiredPermissions: ['customers:view'],
  },
  {
    id: 'products',
    path: '/products',
    name: 'Products',
    component: 'ProductsPage',
    requiredRoles: viewers,
    requiredPermissions: ['products:view'],
  },
  {
    id: 'vehicles',
    path: '/vehicles',
    name: 'Vehicles',
    component: 'VehiclesPage',
    requiredRoles: viewers,
    requiredPermissions: ['vehicles:view'],
  },
  {
    id: 'compat',
    path: '/compatibility',
    name: 'Compatibility',
    component: 'CompatibilityPage',
    requiredRoles: viewers,
    requiredPermissions: ['products:view'],
  },
  {
    id: 'manage',
    path: '/management',
    name: 'User Management',
    component: 'ManagementPage',
    requiredRoles: editors,
    requiredPermissions: ['users:manage'],
  },
];
