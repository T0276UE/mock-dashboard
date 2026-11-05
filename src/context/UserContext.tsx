import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Role } from '../navigation/types';
import { DEFAULT_ROLE_PERMISSIONS, ROLE_HIERARCHY } from '../features/management/components/rolePermissions';
import { seedUsers, toSessionUser } from './utils/userSeed';
import { loadSessionContext, saveSessionContext } from './utils/sessionStorage';
import {
  addCustomerToUserAccess,
  databricksAccessClient,
  getCustomerIdsForUser,
  getUserIdsForCustomer,
  removeCustomerFromUserAccess,
  type AccessDataSource,
  type UserAccessProfileUpdate,
} from '../services/databricksAccessService';

export interface User {
  user_id: string;
  name: string;
  email: string;
  manager_user_id?: string | null;
}

export interface SessionUser extends User {
  role: Role;
  permissions: string[];
  status: 'active' | 'pending' | 'inactive';
  managed_customer_ids: string[];
}

export interface SessionState {
  provider: 'external' | 'demo';
  isAuthenticated: boolean;
  accessToken?: string;
  issuedAt: string;
  expiresAt?: string;
}

export interface LoginResult {
  session: SessionState;
  user: SessionUser;
  users?: SessionUser[];
}

// This adapter contract is meant for wiring real auth providers later.
export interface ExternalAuthAdapter {
  restoreSession: () => Promise<LoginResult | null>;
  signIn: () => Promise<LoginResult>;
  signOut: () => Promise<void>;
}

interface UserContextType {
  currentUser: SessionUser | null;
  users: SessionUser[];
  session: SessionState | null;
  isLoading: boolean;
  isSyncingAccess: boolean;
  databricksSource: AccessDataSource;
  syncError: string | null;
  effectiveRoles: Role[];
  effectivePermissions: string[];
  setCurrentUser: (user: User | null) => void;
  setUserAccessProfile: (userId: string, updates: UserAccessProfileUpdate) => void;
  getCustomerAccessForUser: (userId: string) => Promise<string[]>;
  getUserAccessForCustomer: (customerId: string) => Promise<string[]>;
  grantCustomerAccessToUser: (userId: string, customerId: string) => Promise<string[]>;
  revokeCustomerAccessFromUser: (userId: string, customerId: string) => Promise<string[]>;
  refreshAccessData: () => Promise<void>;
  handleLoginSuccess: (payload: LoginResult) => void;
  logout: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<SessionUser[]>(seedUsers);
  const [currentUser, setCurrentUserState] = useState<SessionUser | null>(null);
  const [session, setSession] = useState<SessionState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncingAccess, setIsSyncingAccess] = useState(false);
  const [databricksSource, setDatabricksSource] = useState<AccessDataSource>('seed');
  const [syncError, setSyncError] = useState<string | null>(null);

  const resolveSessionUser = (user: User | SessionUser | null, sourceUsers: SessionUser[]): SessionUser | null => {
    if (!user) return null;

    const matched = sourceUsers.find((candidate) => candidate.user_id === user.user_id);
    if (matched) return matched;

    return toSessionUser(user);
  };

  const refreshAccessData = async () => {
    setIsSyncingAccess(true);
    setSyncError(null);

    try {
      const snapshot = await databricksAccessClient.fetchAccessSnapshot();
      if (!snapshot.users.length) return;

      setDatabricksSource(snapshot.source);
      setUsers(snapshot.users);

      setCurrentUserState((prev) => {
        if (!prev) return prev;
        return snapshot.users.find((candidate) => candidate.user_id === prev.user_id) ?? prev;
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to sync Databricks access data.';
      setSyncError(message);
      console.error('Failed to refresh Databricks access data:', error);
    } finally {
      setIsSyncingAccess(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const bootstrap = async () => {
      try {
        const parsed = loadSessionContext();
        if (parsed) {
          if (Array.isArray(parsed.users) && parsed.users.length) {
            setUsers(parsed.users);
          }

          if (parsed.currentUser) {
            setCurrentUserState(parsed.currentUser);
          }

          if (parsed.session) {
            setSession(parsed.session);
          }
        }
      } catch (error) {
        console.error('Failed to restore session context:', error);
      }

      if (!isMounted) return;

      await refreshAccessData();

      if (!isMounted) return;
      setIsLoading(false);
    };

    void bootstrap();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (isLoading) return;

    saveSessionContext({ users, currentUser, session });
  }, [users, currentUser, session, isLoading]);

  const effectiveRoles = useMemo<Role[]>(() => {
    if (!currentUser) return ['user'];
    return ROLE_HIERARCHY[currentUser.role] ?? ['user'];
  }, [currentUser]);

  const effectivePermissions = useMemo<string[]>(() => {
    if (!currentUser) return [];

    const fromRole = DEFAULT_ROLE_PERMISSIONS[currentUser.role] ?? [];
    return [...new Set([...fromRole, ...currentUser.permissions])];
  }, [currentUser]);

  const setCurrentUser = (user: User | null) => {
    const next = resolveSessionUser(user, users);
    setCurrentUserState(next);

    if (next) {
      setSession((prev) => ({
        provider: prev?.provider ?? 'demo',
        isAuthenticated: true,
        accessToken: prev?.accessToken,
        issuedAt: prev?.issuedAt ?? new Date().toISOString(),
        expiresAt: prev?.expiresAt,
      }));
      return;
    }

    setSession(null);
  };

  const setUserAccessProfile = (
    userId: string,
    updates: UserAccessProfileUpdate,
  ) => {
    setSyncError(null);

    setUsers((prevUsers) =>
      prevUsers.map((user) => {
        if (user.user_id !== userId) return user;

        const nextRole = updates.role ?? user.role;

        return {
          ...user,
          ...updates,
          role: nextRole,
          permissions: updates.permissions ?? user.permissions,
          managed_customer_ids: updates.managed_customer_ids ?? user.managed_customer_ids,
        };
      }),
    );

    setCurrentUserState((prev) => {
      if (!prev || prev.user_id !== userId) return prev;

      const nextRole = updates.role ?? prev.role;
      return {
        ...prev,
        ...updates,
        role: nextRole,
        permissions: updates.permissions ?? prev.permissions,
        managed_customer_ids: updates.managed_customer_ids ?? prev.managed_customer_ids,
      };
    });

    void databricksAccessClient.updateUserAccessProfile(userId, updates).catch((error) => {
      const message = error instanceof Error ? error.message : 'Failed to persist access profile changes.';
      setSyncError(message);
      console.error('Failed to persist access profile update:', error);
    });
  };

  const syncManagedCustomersToState = (userId: string, managedCustomerIds: string[]) => {
    setUsers((prevUsers) =>
      prevUsers.map((user) => {
        if (user.user_id !== userId) return user;
        return {
          ...user,
          managed_customer_ids: managedCustomerIds,
        };
      }),
    );

    setCurrentUserState((prev) => {
      if (!prev || prev.user_id !== userId) return prev;
      return {
        ...prev,
        managed_customer_ids: managedCustomerIds,
      };
    });
  };

  const getCustomerAccessForUser = async (userId: string): Promise<string[]> => {
    try {
      setSyncError(null);
      return await getCustomerIdsForUser(userId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load customer access for user.';
      setSyncError(message);
      throw error;
    }
  };

  const getUserAccessForCustomer = async (customerId: string): Promise<string[]> => {
    try {
      setSyncError(null);
      return await getUserIdsForCustomer(customerId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load user access for customer.';
      setSyncError(message);
      throw error;
    }
  };

  const grantCustomerAccessToUser = async (userId: string, customerId: string): Promise<string[]> => {
    try {
      setSyncError(null);
      const updatedCustomerIds = await addCustomerToUserAccess(userId, customerId);
      syncManagedCustomersToState(userId, updatedCustomerIds);
      return updatedCustomerIds;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to grant customer access.';
      setSyncError(message);
      throw error;
    }
  };

  const revokeCustomerAccessFromUser = async (userId: string, customerId: string): Promise<string[]> => {
    try {
      setSyncError(null);
      const updatedCustomerIds = await removeCustomerFromUserAccess(userId, customerId);
      syncManagedCustomersToState(userId, updatedCustomerIds);
      return updatedCustomerIds;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to revoke customer access.';
      setSyncError(message);
      throw error;
    }
  };

  const handleLoginSuccess = (payload: LoginResult) => {
    if (payload.users && payload.users.length) {
      setUsers(payload.users);
    }

    setCurrentUserState(payload.user);
    setSession(payload.session);
  };

  const logout = () => {
    setCurrentUserState(null);
    setSession(null);
  };

  return (
    <UserContext.Provider
      value={{
        currentUser,
        users,
        session,
        isLoading,
        isSyncingAccess,
        databricksSource,
        syncError,
        effectiveRoles,
        effectivePermissions,
        setCurrentUser,
        setUserAccessProfile,
        getCustomerAccessForUser,
        getUserAccessForCustomer,
        grantCustomerAccessToUser,
        revokeCustomerAccessFromUser,
        refreshAccessData,
        handleLoginSuccess,
        logout,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within UserProvider');
  }
  return context;
}
