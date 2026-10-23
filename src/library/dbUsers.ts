import { db } from './db';

export type DbUserRole = 'user' | 'sysadmin' | 'admin';
export type DbUserStatus = 'active' | 'pending' | 'inactive';

export interface DbUser {
  user_id: string;
  name: string;
  email: string;
  manager_user_id: string | null;
  role: DbUserRole;
  permissions: string[];
  status: DbUserStatus;
  last_login: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export const testUsers: Array<Omit<DbUser, 'created_at' | 'updated_at'>> = [
  {
    user_id: 'USR-001',
    name: 'Alice Patel',
    email: 'alice@example.com',
    manager_user_id: null,
    role: 'admin',
    permissions: ['dashboard:view', 'customers:manage', 'vehicles:manage', 'users:manage'],
    status: 'active',
    last_login: null,
    is_active: 1,
  },
  {
    user_id: 'USR-002',
    name: 'Bob Stone',
    email: 'bob@example.com',
    manager_user_id: 'USR-001',
    role: 'sysadmin',
    permissions: ['dashboard:view', 'customers:manage', 'vehicles:view', 'users:manage'],
    status: 'active',
    last_login: null,
    is_active: 1,
  },
  {
    user_id: 'USR-003',
    name: 'Carol Lee',
    email: 'carol@example.com',
    manager_user_id: 'USR-001',
    role: 'user',
    permissions: ['dashboard:view', 'customers:view'],
    status: 'active',
    last_login: null,
    is_active: 1,
  },
  {
    user_id: 'USR-004',
    name: 'David Raj',
    email: 'david@example.com',
    manager_user_id: 'USR-002',
    role: 'user',
    permissions: ['dashboard:view', 'vehicles:view'],
    status: 'pending',
    last_login: null,
    is_active: 1,
  },
  {
    user_id: 'USR-005',
    name: 'Eva Martinez',
    email: 'eva@example.com',
    manager_user_id: null,
    role: 'admin',
    permissions: ['dashboard:view', 'customers:manage', 'vehicles:manage', 'users:manage'],
    status: 'active',
    last_login: null,
    is_active: 1,
  },
];

export function normalizeRole(value: string | null | undefined): DbUserRole {
  if (value === 'admin') return 'admin';
  if (value === 'sysadmin') return 'sysadmin';
  return 'user';
}

export function normalizeStatus(value: string | null | undefined): DbUserStatus {
  if (value === 'pending') return 'pending';
  if (value === 'inactive') return 'inactive';
  return 'active';
}

export function normalizePermissions(value: string | null | undefined): string[] {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
}

export function serializePermissions(permissions: string[]): string {
  return JSON.stringify(permissions);
}

function mapUserRow(row: Record<string, unknown>): DbUser {
  return {
    user_id: String(row.user_id ?? ''),
    name: String(row.name ?? ''),
    email: String(row.email ?? ''),
    manager_user_id: row.manager_user_id ? String(row.manager_user_id) : null,
    role: normalizeRole(typeof row.role === 'string' ? row.role : null),
    permissions: normalizePermissions(typeof row.permissions === 'string' ? row.permissions : null),
    status: normalizeStatus(typeof row.status === 'string' ? row.status : null),
    last_login: typeof row.last_login === 'string' ? row.last_login : null,
    is_active: Number(row.is_active ?? 1),
    created_at: String(row.created_at ?? ''),
    updated_at: String(row.updated_at ?? ''),
  };
}

export function seedUsers(): Promise<void> {
  return new Promise((resolve, reject) => {
    const now = new Date().toISOString();

    db.serialize(() => {
      db.run('DELETE FROM users', (deleteError: Error | null) => {
        if (deleteError) {
          reject(deleteError);
          return;
        }

        const stmt = db.prepare(
          `INSERT INTO users (
            user_id,
            name,
            email,
            manager_user_id,
            role,
            permissions,
            status,
            last_login,
            is_active,
            created_at,
            updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        );

        let completed = 0;

        testUsers.forEach((user) => {
          stmt.run(
            user.user_id,
            user.name,
            user.email,
            user.manager_user_id,
            user.role,
            serializePermissions(user.permissions),
            user.status,
            user.last_login,
            user.is_active,
            now,
            now,
            (insertError: Error | null) => {
              if (insertError) {
                reject(insertError);
                return;
              }

              completed += 1;
              if (completed === testUsers.length) {
                stmt.finalize((finalizeError: Error | null) => {
                  if (finalizeError) {
                    reject(finalizeError);
                    return;
                  }

                  resolve();
                });
              }
            },
          );
        });
      });
    });
  });
}

export function getUsers(): Promise<DbUser[]> {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT
        user_id,
        name,
        email,
        manager_user_id,
        role,
        permissions,
        status,
        last_login,
        is_active,
        created_at,
        updated_at
      FROM users
      ORDER BY name`,
      (error: Error | null, rows: unknown) => {
        if (error) {
          reject(error);
          return;
        }

        const mapped = ((rows as Array<Record<string, unknown>>) ?? []).map(mapUserRow);
        resolve(mapped);
      },
    );
  });
}

export function getUserById(userId: string): Promise<DbUser | null> {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT
        user_id,
        name,
        email,
        manager_user_id,
        role,
        permissions,
        status,
        last_login,
        is_active,
        created_at,
        updated_at
      FROM users
      WHERE user_id = ?
      LIMIT 1`,
      [userId],
      (error: Error | null, row: unknown) => {
        if (error) {
          reject(error);
          return;
        }

        if (!row) {
          resolve(null);
          return;
        }

        resolve(mapUserRow(row as Record<string, unknown>));
      },
    );
  });
}

export function updateUserRole(userId: string, role: DbUserRole): Promise<void> {
  return new Promise((resolve, reject) => {
    db.run(
      `UPDATE users
       SET role = ?, updated_at = ?
       WHERE user_id = ?`,
      [role, new Date().toISOString(), userId],
      (error: Error | null) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      },
    );
  });
}

export function updateUserPermissions(userId: string, permissions: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    db.run(
      `UPDATE users
       SET permissions = ?, updated_at = ?
       WHERE user_id = ?`,
      [serializePermissions(permissions), new Date().toISOString(), userId],
      (error: Error | null) => {
        if (error) {
          console.log(`Error updating ${userId} permissions:`, error);
          reject(error);
          return;
        }

        resolve();
      },
    );
  });
}

export function getUserPermissions(userId: string): Promise<string[]> {
  return new Promise((resolve, reject) => {
    db.get('SELECT permissions FROM users WHERE user_id = ?', [userId], (error: Error | null, row: unknown) => {
      if (error) {
        console.log(`Error retrieving ${userId} permissions:`, error);
        reject(error); //temp
        return;
      }
      const value = (row as { permissions?: string } | undefined)?.permissions;
      resolve(normalizePermissions(value));
    });
  });
}

export function getUserRole(userId: string): Promise<DbUserRole> {
  return new Promise((resolve, reject) => {
    db.get('SELECT role FROM users WHERE user_id = ?', [userId], (error: Error | null, row: unknown) => {
      if (error) {
        reject(error);
        return;
      }

      const role = (row as { role?: string } | undefined)?.role;
      resolve(normalizeRole(role));
    });
  });
}

export function getUserStatus(userId: string): Promise<DbUserStatus> {
  return new Promise((resolve, reject) => {
    db.get('SELECT status FROM users WHERE user_id = ?', [userId], (error: Error | null, row: unknown) => {
      if (error) {
        reject(error);
        return;
      }

      const status = (row as { status?: string } | undefined)?.status;
      resolve(normalizeStatus(status));
    });
  });
}

export function getUserRoleById(userId: string): Promise<DbUserRole> {
  return getUserRole(userId);
}

export function getUserPermissionsById(userId: string): Promise<string[]> {
  return getUserPermissions(userId);
}

export function getUserRecordById(userId: string): Promise<DbUser | null> {
  return getUserById(userId);
}
