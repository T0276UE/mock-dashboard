import type { Role } from '../navigation/types';
import type { SessionUser } from '../context/UserContext';
import { DEFAULT_ROLE_PERMISSIONS } from '../features/management/components/rolePermissions';
import { seedCustomerAccessRecords, seedUsers } from '../context/utils/userSeed';
import {
  fetchUserCustomers,
  isBackendCustomerAccessFlowEnabled,
  replaceUserCustomers,
} from './backendApi';

export type AccessDataSource = 'seed' | 'databricks-local-json' | 'databricks-http';

export interface UserAccessProfileUpdate {
  role?: Role;
  permissions?: string[];
  manager_user_id?: string | null;
  status?: SessionUser['status'];
  managed_customer_ids?: string[];
}

export interface AccessSnapshot {
  users: SessionUser[];
  source: AccessDataSource;
}

interface DatabricksUserRecord {
  user_id: string;
  name: string;
  email: string;
  manager_user_id?: string | null;
  role?: string;
  permissions?: string | string[];
  status?: string;
}

interface DatabricksCustomerAccessRecord {
  user_id: string;
  customer_id: string;
}

interface DatabricksAccessClient {
  fetchAccessSnapshot(): Promise<AccessSnapshot>;
  updateUserAccessProfile(userId: string, updates: UserAccessProfileUpdate): Promise<void>;
}

function normalizeRole(value: string | null | undefined): Role {
  if (value === 'admin') return 'admin';
  if (value === 'sysadmin') return 'sysadmin';
  return 'user';
}

function normalizeStatus(value: string | null | undefined): SessionUser['status'] {
  if (value === 'pending') return 'pending';
  if (value === 'inactive') return 'inactive';
  return 'active';
}

function normalizePermissions(value: string | string[] | null | undefined, role: Role): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string');
  }

  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.filter((item): item is string => typeof item === 'string');
      }
    } catch {
      return value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }

  return DEFAULT_ROLE_PERMISSIONS[role] ?? [];
}

function mapRecordsToSessionUsers(
  userRecords: DatabricksUserRecord[],
  customerAccessRows: DatabricksCustomerAccessRecord[],
): SessionUser[] {
  const managedByUser = new Map<string, string[]>();

  customerAccessRows.forEach((row) => {
    const list = managedByUser.get(row.user_id) ?? [];
    if (!list.includes(row.customer_id)) {
      list.push(row.customer_id);
      managedByUser.set(row.user_id, list);
    }
  });

  return userRecords.map((record) => {
    const role = normalizeRole(record.role);
    return {
      user_id: record.user_id,
      name: record.name,
      email: record.email,
      manager_user_id: record.manager_user_id ?? null,
      role,
      permissions: normalizePermissions(record.permissions, role),
      status: normalizeStatus(record.status),
      managed_customer_ids: managedByUser.get(record.user_id) ?? [],
    };
  });
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) {
    throw new Error(`Request failed (${response.status}) for ${url}`);
  }

  return (await response.json()) as T;
}

class SeedAccessClient implements DatabricksAccessClient {
  async fetchAccessSnapshot(): Promise<AccessSnapshot> {
    return {
      users: seedUsers,
      source: 'seed',
    };
  }

  async updateUserAccessProfile(): Promise<void> {
    return;
  }
}

class LocalJsonAccessClient implements DatabricksAccessClient {
  async fetchAccessSnapshot(): Promise<AccessSnapshot> {
    const [users, customerAccess] = await Promise.all([
      fetchJson<DatabricksUserRecord[]>('/data/databricks/users.json'),
      fetchJson<DatabricksCustomerAccessRecord[]>('/data/databricks/customer_access.json'),
    ]);

    return {
      users: mapRecordsToSessionUsers(users, customerAccess),
      source: 'databricks-local-json',
    };
  }

  async updateUserAccessProfile(): Promise<void> {
    // Local JSON mode is read-only from the app perspective.
    return;
  }
}

class HttpDatabricksAccessClient implements DatabricksAccessClient {
  private readonly usersUrl: string;

  private readonly customerAccessUrl: string;

  constructor(usersUrl: string, customerAccessUrl: string) {
    this.usersUrl = usersUrl;
    this.customerAccessUrl = customerAccessUrl;
  }

  private getHeaders(): HeadersInit {
    return {
      'Content-Type': 'application/json',
    };
  }

  async fetchAccessSnapshot(): Promise<AccessSnapshot> {
    const [users, customerAccess] = await Promise.all([
      fetchJson<DatabricksUserRecord[]>(this.usersUrl, { headers: this.getHeaders() }),
      fetchJson<DatabricksCustomerAccessRecord[]>(this.customerAccessUrl, { headers: this.getHeaders() }),
    ]);

    return {
      users: mapRecordsToSessionUsers(users, customerAccess),
      source: 'databricks-http',
    };
  }

  async updateUserAccessProfile(userId: string, updates: UserAccessProfileUpdate): Promise<void> {
    await fetchJson(`${this.usersUrl}/${userId}`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: JSON.stringify(updates),
    });

    if (updates.managed_customer_ids) {
      await fetchJson(this.customerAccessUrl, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify({ user_id: userId, customer_ids: updates.managed_customer_ids }),
      });
    }
  }
}

function shouldUseLocalJsonMode(): boolean {
  return String(import.meta.env.VITE_DATABRICKS_USE_LOCAL_JSON ?? '').toLowerCase() === 'true';
}

function getDatabricksHttpEndpoints() {
  const usersUrl = import.meta.env.VITE_DATABRICKS_USERS_URL as string | undefined;
  const customerAccessUrl = import.meta.env.VITE_DATABRICKS_CUSTOMER_ACCESS_URL as string | undefined;

  return {
    usersUrl,
    customerAccessUrl,
  };
}

function buildCustomerAccessRowsFromSeed(): DatabricksCustomerAccessRecord[] {
  return seedCustomerAccessRecords.map((row) => ({
    user_id: row.user_id,
    customer_id: row.customer_id,
  }));
}

async function fetchCustomerAccessRows(): Promise<DatabricksCustomerAccessRecord[]> {
  const { customerAccessUrl } = getDatabricksHttpEndpoints();

  if (customerAccessUrl) {
    return fetchJson<DatabricksCustomerAccessRecord[]>(customerAccessUrl, {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (shouldUseLocalJsonMode()) {
    const rows = await fetchJson<DatabricksCustomerAccessRecord[]>('/data/databricks/customer_access.json');
    return rows.map((row) => ({ user_id: row.user_id, customer_id: row.customer_id }));
  }

  return buildCustomerAccessRowsFromSeed();
}

export async function getCustomerIdsForUser(userId: string): Promise<string[]> {
  const normalizedUserId = userId.trim();
  if (!normalizedUserId) return [];

  if (isBackendCustomerAccessFlowEnabled()) {
    return fetchUserCustomers(normalizedUserId);
  }

  const rows = await fetchCustomerAccessRows();
  const customerIds = rows
    .filter((row) => row.user_id === normalizedUserId)
    .map((row) => row.customer_id)
    .filter(Boolean);

  return [...new Set(customerIds)];
}

export async function getUserIdsForCustomer(customerId: string): Promise<string[]> {
  const normalizedCustomerId = customerId.trim();
  if (!normalizedCustomerId) return [];

  const rows = await fetchCustomerAccessRows();
  const userIds = rows
    .filter((row) => row.customer_id === normalizedCustomerId)
    .map((row) => row.user_id)
    .filter(Boolean);

  return [...new Set(userIds)];
}

export async function addCustomerToUserAccess(userId: string, customerId: string): Promise<string[]> {
  const normalizedUserId = userId.trim();
  const normalizedCustomerId = customerId.trim();

  if (!normalizedUserId || !normalizedCustomerId) {
    throw new Error('Both userId and customerId are required to add customer access.');
  }

  const currentCustomerIds = await getCustomerIdsForUser(normalizedUserId);
  if (currentCustomerIds.includes(normalizedCustomerId)) {
    return currentCustomerIds;
  }

  const nextCustomerIds = [...currentCustomerIds, normalizedCustomerId];
  if (isBackendCustomerAccessFlowEnabled()) {
    await replaceUserCustomers(normalizedUserId, { customerIds: nextCustomerIds });
  } else {
    await databricksAccessClient.updateUserAccessProfile(normalizedUserId, {
      managed_customer_ids: nextCustomerIds,
    });
  }

  return nextCustomerIds;
}

export async function removeCustomerFromUserAccess(userId: string, customerId: string): Promise<string[]> {
  const normalizedUserId = userId.trim();
  const normalizedCustomerId = customerId.trim();

  if (!normalizedUserId || !normalizedCustomerId) {
    throw new Error('Both userId and customerId are required to remove customer access.');
  }

  const currentCustomerIds = await getCustomerIdsForUser(normalizedUserId);
  const nextCustomerIds = currentCustomerIds.filter((candidate) => candidate !== normalizedCustomerId);

  if (nextCustomerIds.length === currentCustomerIds.length) {
    return currentCustomerIds;
  }

  if (isBackendCustomerAccessFlowEnabled()) {
    await replaceUserCustomers(normalizedUserId, { customerIds: nextCustomerIds });
  } else {
    await databricksAccessClient.updateUserAccessProfile(normalizedUserId, {
      managed_customer_ids: nextCustomerIds,
    });
  }

  return nextCustomerIds;
}

function createDatabricksAccessClient(): DatabricksAccessClient {
  const { usersUrl, customerAccessUrl } = getDatabricksHttpEndpoints();

  if (usersUrl && customerAccessUrl) {
    return new HttpDatabricksAccessClient(usersUrl, customerAccessUrl);
  }

  if (shouldUseLocalJsonMode()) {
    return new LocalJsonAccessClient();
  }

  return new SeedAccessClient();
}

export const databricksAccessClient = createDatabricksAccessClient();
