import type { Role } from '../../../navigation/types';

export interface AccessActor {
  user_id: string;
  role: Role;
  manager_user_id?: string | null;
  managed_customer_ids?: string[];
}

export interface AccessTarget {
  user_id: string;
  role: Role;
  manager_user_id?: string | null;
  managed_customer_ids?: string[];
}

export const ROLE_OPTIONS: Role[] = ['user', 'sysadmin', 'admin'];

export const ROLE_LABELS: Record<Role, string> = {
  user: 'User',
  sysadmin: 'System Administrator',
  admin: 'Administrator',
};

export const ROLE_PERMISSIONS: Record<Role, string[]> = {
  user: ['View dashboards', 'View assigned customers and vehicles', 'View products'],
  sysadmin: ['Manage all roles', 'Access all services', 'Override access controls'],
  admin: ['Manage non-admin users', 'View all customers and vehicles', 'Manage non-admin access'],
};

export const ROLE_HIERARCHY: Record<Role, Role[]> = {
  user: ['user'],
  sysadmin: ['user', 'sysadmin'],
  admin: ['user', 'sysadmin', 'admin'],
};

export const DEFAULT_ROLE_PERMISSIONS: Record<Role, string[]> = {
  user: ['dashboard:view', 'customers:view', 'vehicles:view', 'products:view'],
  sysadmin: ['dashboard:view', 'customers:manage', 'vehicles:manage', 'products:view', 'users:manage'],
  admin: ['dashboard:view', 'customers:manage', 'vehicles:manage', 'products:view', 'users:manage'],
};

export function canEditUserAccess(actor: AccessActor | null | undefined, target: AccessTarget | null | undefined): boolean {
  if (!actor || !target) return false;
  if (actor.user_id === target.user_id) return false;

  const actorManager = actor.manager_user_id ?? null;
  const targetManager = target.manager_user_id ?? null;

  if (actor.role === 'admin') {
    return target.role !== 'admin';
  }

  if (actor.role === 'sysadmin') {
    if (targetManager === actor.user_id) return false;

    const isSameLevel = actorManager === targetManager && actorManager !== null;
    const isAboveTarget = actorManager === target.user_id || (actorManager === null && targetManager === null);

    return isSameLevel || isAboveTarget || target.role === 'user' || target.role === 'sysadmin';
  }

  return false;
}

export function canAssignRole(actor: AccessActor | null | undefined, target: AccessTarget | null | undefined, nextRole: Role): boolean {
  if (!canEditUserAccess(actor, target)) return false;
  if (!actor || !target) return false;

  if (actor.role === 'admin') {
    return nextRole !== 'admin';
  }

  if (actor.role === 'sysadmin') {
    return nextRole !== 'admin';
  }

  return false;
}

export function getAccessNotice(actor: AccessActor | null | undefined, target: AccessTarget | null | undefined): string | null {
  if (!actor || !target) return 'Select a user to manage access.';
  if (actor.user_id === target.user_id) return 'You cannot edit your own permissions.';
  if (actor.role === 'user') return 'Standard users cannot manage access.';
  if (actor.role === 'admin' && target.role === 'admin') return 'Administrators cannot edit other administrators.';
  if (actor.role === 'sysadmin' && (target.manager_user_id === actor.user_id || actor.manager_user_id === target.user_id)) {
    return 'You can only edit users at your level or above, not direct reports.';
  }
  return null;
}

export function normalizeRole(value: string): Role {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'sysadmin') return 'sysadmin';
  if (normalized === 'admin') return 'admin';
  return 'user';
}

export function getRoleLabel(role: Role): string {
  return ROLE_LABELS[role] ?? ROLE_LABELS.user;
}

export function userCanManageCustomer(actor: AccessActor | null | undefined, customerId: string | null | undefined): boolean {
  if (!actor || !customerId) return false;

  if (actor.role === 'admin' || actor.role === 'sysadmin') return true;

  return (actor.managed_customer_ids ?? []).includes(customerId);
}

export function userCanViewCustomer(actor: AccessActor | null | undefined, customerId: string | null | undefined): boolean {
  if (!actor || !customerId) return false;

  if (actor.role === 'admin' || actor.role === 'sysadmin') return true;

  return (actor.managed_customer_ids ?? []).includes(customerId);
}

export function userCanViewVehicle(actor: AccessActor | null | undefined, vehicleCustomerId: string | null | undefined): boolean {
  if (!actor || !vehicleCustomerId) return false;

  if (actor.role === 'admin' || actor.role === 'sysadmin') return true;

  return (actor.managed_customer_ids ?? []).includes(vehicleCustomerId);
}
