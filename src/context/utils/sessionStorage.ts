import type { SessionState, SessionUser } from '../UserContext';

export const STORAGE_KEY = 'mock-dashboard-session-context';

export interface PersistedSessionContext {
  users?: SessionUser[];
  currentUser?: SessionUser | null;
  session?: SessionState | null;
}

export function loadSessionContext(): PersistedSessionContext | null {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return null;

  return JSON.parse(stored) as PersistedSessionContext;
}

export function saveSessionContext(payload: PersistedSessionContext): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}
