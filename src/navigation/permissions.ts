import type { NavRoute, Role } from './types';

function hasRequiredPermission(userPermissions: string[], requiredPermission: string): boolean {
  if (userPermissions.includes(requiredPermission)) return true;

  // Treat manage as a superset of view for the same domain, e.g. customers:manage -> customers:view.
  if (requiredPermission.endsWith(':view')) {
    const domain = requiredPermission.slice(0, requiredPermission.indexOf(':'));
    return userPermissions.includes(`${domain}:manage`);
  }

  return false;
}

export function hasAccess(
  userRoles: Role[] | undefined,
  userPermissions: string[] | undefined,
  route: NavRoute,
): boolean {
  const roleAllowed =
    !route.requiredRoles || route.requiredRoles.length === 0
      ? true
      : Boolean(userRoles && userRoles.length && userRoles.some((r) => route.requiredRoles!.includes(r)));

  if (!roleAllowed) return false;

  if (!route.requiredPermissions || route.requiredPermissions.length === 0) {
    return true;
  }

  if (!userPermissions || userPermissions.length === 0) {
    return false;
  }

  return route.requiredPermissions.every((permission) => hasRequiredPermission(userPermissions, permission));
}
