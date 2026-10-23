import type { NavRoute, Role } from './types';

export function hasAccess(userRoles: Role[] | undefined, route: NavRoute): boolean {
  if (!route.requiredRoles || route.requiredRoles.length === 0) return true;
  if (!userRoles || userRoles.length === 0) return false;
  return userRoles.some((r) => route.requiredRoles!.includes(r));
}
