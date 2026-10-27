import type { SessionUser, User } from '../UserContext';
import { DEFAULT_ROLE_PERMISSIONS } from '../../features/management/components/rolePermissions';

export const seedUsers: SessionUser[] = [
  {
    user_id: 'USR-001',
    name: 'Alice Patel',
    email: 'alice@example.com',
    manager_user_id: null,
    role: 'admin',
    permissions: DEFAULT_ROLE_PERMISSIONS.admin,
    status: 'active',
    managed_customer_ids: ['CUST-000124', 'CUST-000208', 'CUST-000311', 'CUST-000415'],
  },
  {
    user_id: 'USR-002',
    name: 'Bob Stone',
    email: 'bob@example.com',
    manager_user_id: 'USR-001',
    role: 'sysadmin',
    permissions: DEFAULT_ROLE_PERMISSIONS.sysadmin,
    status: 'active',
    managed_customer_ids: ['CUST-000509', 'CUST-000622', 'CUST-000714'],
  },
  {
    user_id: 'USR-003',
    name: 'Carol Lee',
    email: 'carol@example.com',
    manager_user_id: 'USR-001',
    role: 'user',
    permissions: DEFAULT_ROLE_PERMISSIONS.user,
    status: 'active',
    managed_customer_ids: ['CUST-000124', 'CUST-000415'],
  },
  {
    user_id: 'USR-004',
    name: 'David Raj',
    email: 'david@example.com',
    manager_user_id: 'USR-002',
    role: 'user',
    permissions: ['dashboard:view', 'vehicles:view'],
    status: 'pending',
    managed_customer_ids: ['CUST-000208'],
  },
  {
    user_id: 'USR-005',
    name: 'Eva Martinez',
    email: 'eva@example.com',
    manager_user_id: null,
    role: 'admin',
    permissions: DEFAULT_ROLE_PERMISSIONS.admin,
    status: 'active',
    managed_customer_ids: ['CUST-000801', 'CUST-000509', 'CUST-000622'],
  },
];

export function toSessionUser(user: User | null): SessionUser | null {
  if (!user) return null;

  const fromSeed = seedUsers.find((item) => item.user_id === user.user_id);
  if (fromSeed) return fromSeed;

  return {
    user_id: user.user_id,
    name: user.name,
    email: user.email,
    manager_user_id: user.manager_user_id ?? null,
    role: 'user',
    permissions: DEFAULT_ROLE_PERMISSIONS.user,
    status: 'active',
    managed_customer_ids: [],
  };
}
