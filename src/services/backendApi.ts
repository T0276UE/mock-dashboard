import type { SessionUser } from '../context/UserContext';

export interface SessionMeResponse {
  userId: string;
  name: string;
  role: SessionUser['role'];
  status: SessionUser['status'];
  effectiveRoles: string[];
  effectivePermissions: string[];
  managedCustomerIds: string[];
}

export interface BackendAccessUser {
  userId: string;
  name: string;
  email: string;
  managerUserId: string | null;
  role: SessionUser['role'];
  permissions: string[];
  status: SessionUser['status'];
}

export interface UpdateUserCustomersRequest {
  customerIds: string[];
}

export interface DevUserSummaryResponse {
  userId: string;
  organizationId: string;
  displayName: string;
  email: string | null;
  status: string;
  role: SessionUser['role'];
  permissions: string[];
  managerUserId: string | null;
}

export interface DevSessionRequest {
  userId: string;
}

export interface DevSessionResponse {
  authenticated: boolean;
  userId: string;
  organizationId: string;
  displayName: string;
  status: string;
  issuedAt: string;
}

export interface MeContextResponse {
  userId: string;
  organizationId: string;
  treeId: string;
  treeVersion: number;
  managerUserId: string | null;
  directReportUserIds: string[];
  peerUserIds: string[];
  pathToRootUserIds: string[];
}

export function isBackendSessionEnabled(): boolean {
  return String(import.meta.env.VITE_USE_BACKEND_SESSION ?? '').toLowerCase() === 'true';
}

export function isBackendCustomerAccessFlowEnabled(): boolean {
  return String(import.meta.env.VITE_USE_BACKEND_CUSTOMER_ACCESS_FLOW ?? '').toLowerCase() === 'true';
}

function getApiBaseUrl(): string {
  const baseUrl = import.meta.env.VITE_BACKEND_API_BASE_URL;
  return baseUrl?.trim() || 'http://localhost:8080';
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    credentials: 'include',
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Backend API ${response.status}: ${body || response.statusText}`);
  }

  return (await response.json()) as T;
}

export async function fetchSessionMe(userId?: string): Promise<SessionMeResponse> {
  const headers: HeadersInit = userId ? { 'x-user-id': userId } : {};
  return request<SessionMeResponse>('/api/v1/session/me', { method: 'GET', headers });
}

export async function fetchUsers(): Promise<BackendAccessUser[]> {
  return request<BackendAccessUser[]>('/api/v1/users', { method: 'GET' });
}

export async function fetchUserCustomers(userId: string): Promise<string[]> {
  return request<string[]>(`/api/v1/users/${encodeURIComponent(userId)}/customers`, { method: 'GET' });
}

export async function replaceUserCustomers(userId: string, payload: UpdateUserCustomersRequest): Promise<string[]> {
  return request<string[]>(`/api/v1/users/${encodeURIComponent(userId)}/customers`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function fetchDevUsers(): Promise<DevUserSummaryResponse[]> {
  return request<DevUserSummaryResponse[]>('/api/v1/dev/users', { method: 'GET' });
}

export async function createDevSession(payload: DevSessionRequest): Promise<DevSessionResponse> {
  return request<DevSessionResponse>('/api/v1/dev/session', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchMeContext(): Promise<MeContextResponse> {
  return request<MeContextResponse>('/api/v1/me/context', { method: 'GET' });
}
