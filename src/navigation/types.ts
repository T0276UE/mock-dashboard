export type Role = 'user' | 'sysadmin' | 'admin';

export interface NavRoute {
  id: string;
  path: string;
  name: string;
  component?: string;
  exact?: boolean;
  requiredRoles?: Role[];
  icon?: string;
}
