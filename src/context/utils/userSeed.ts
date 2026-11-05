import type { SessionUser, User } from '../UserContext';
import { DEFAULT_ROLE_PERMISSIONS } from '../../features/management/components/rolePermissions';

export interface SeedCustomerAccessRecord {
  user_id: string;
  customer_id: string;
}

type SeedUserBase = Omit<SessionUser, 'managed_customer_ids'>;

const seedUsersBase: SeedUserBase[] = [
  {
    user_id: 'USR-001',
    name: 'Alice Patel',
    email: 'alice@example.com',
    manager_user_id: null,
    role: 'admin',
    permissions: DEFAULT_ROLE_PERMISSIONS.admin,
    status: 'active',
  },
  {
    user_id: 'USR-002',
    name: 'Bob Stone',
    email: 'bob@example.com',
    manager_user_id: 'USR-001',
    role: 'sysadmin',
    permissions: DEFAULT_ROLE_PERMISSIONS.sysadmin,
    status: 'active',
  },
  {
    user_id: 'USR-003',
    name: 'Carol Lee',
    email: 'carol@example.com',
    manager_user_id: 'USR-001',
    role: 'user',
    permissions: DEFAULT_ROLE_PERMISSIONS.user,
    status: 'active',
  },
  {
    user_id: 'USR-004',
    name: 'David Raj',
    email: 'david@example.com',
    manager_user_id: 'USR-002',
    role: 'user',
    permissions: ['dashboard:view', 'vehicles:view'],
    status: 'pending',
  },
  {
    user_id: 'USR-005',
    name: 'Eva Martinez',
    email: 'eva@example.com',
    manager_user_id: null,
    role: 'admin',
    permissions: DEFAULT_ROLE_PERMISSIONS.admin,
    status: 'active',
  },
];

export const seedCustomerAccessRecords: SeedCustomerAccessRecord[] = [
  { user_id: 'USR-001', customer_id: 'CUST-000124' },
  { user_id: 'USR-001', customer_id: 'CUST-000208' },
  { user_id: 'USR-001', customer_id: 'CUST-000311' },
  { user_id: 'USR-001', customer_id: 'CUST-000415' },
  { user_id: 'USR-002', customer_id: 'CUST-000509' },
  { user_id: 'USR-002', customer_id: 'CUST-000622' },
  { user_id: 'USR-002', customer_id: 'CUST-000714' },
  { user_id: 'USR-003', customer_id: 'CUST-000124' },
  { user_id: 'USR-003', customer_id: 'CUST-000415' },
  { user_id: 'USR-004', customer_id: 'CUST-000208' },
  { user_id: 'USR-005', customer_id: 'CUST-000801' },
  { user_id: 'USR-005', customer_id: 'CUST-000509' },
  { user_id: 'USR-005', customer_id: 'CUST-000622' },
];

function hydrateManagedCustomers(users: SeedUserBase[], accessRows: SeedCustomerAccessRecord[]): SessionUser[] {
  const managedByUser = new Map<string, string[]>();

  accessRows.forEach((row) => {
    const current = managedByUser.get(row.user_id) ?? [];
    if (!current.includes(row.customer_id)) {
      current.push(row.customer_id);
      managedByUser.set(row.user_id, current);
    }
  });

  return users.map((user) => ({
    ...user,
    managed_customer_ids: managedByUser.get(user.user_id) ?? [],
  }));
}

export const seedUsers: SessionUser[] = hydrateManagedCustomers(seedUsersBase, seedCustomerAccessRecords);

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
