import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Role } from '../navigation/types';
import { DEFAULT_ROLE_PERMISSIONS, ROLE_HIERARCHY } from '../features/management/components/rolePermissions';
import { seedUsers, toSessionUser } from './utils/userSeed';
import { loadSessionContext, saveSessionContext } from './utils/sessionStorage';

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
  effectiveRoles: Role[];
  effectivePermissions: string[];
  setCurrentUser: (user: User | null) => void;
  setUserAccessProfile: (userId: string, updates: Partial<Pick<SessionUser, 'role' | 'permissions' | 'manager_user_id' | 'status' | 'managed_customer_ids'>>) => void;
  handleLoginSuccess: (payload: LoginResult) => void;
  logout: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<SessionUser[]>(seedUsers);
  const [currentUser, setCurrentUserState] = useState<SessionUser | null>(null);
  const [session, setSession] = useState<SessionState | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
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
    } finally {
      setIsLoading(false);
    }
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
    const next = toSessionUser(user);
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
    updates: Partial<Pick<SessionUser, 'role' | 'permissions' | 'manager_user_id' | 'status' | 'managed_customer_ids'>>,
  ) => {
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
        effectiveRoles,
        effectivePermissions,
        setCurrentUser,
        setUserAccessProfile,
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
