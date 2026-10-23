import { useEffect, useMemo, useState } from 'react';
import { useUser } from '../context/UserContext.tsx';
import type { Role } from '../navigation/types';
import { RoleSelector } from './RoleSelector';
import { ROLE_PERMISSIONS, canAssignRole, canEditUserAccess, getAccessNotice } from './rolePermissions';

export function UserPermissionManager() {
  const { users, currentUser, setUserAccessProfile, session } = useUser();
  const [selectedUserId, setSelectedUserId] = useState('');
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    if (!users.length) return;
    if (selectedUserId) return;

    setSelectedUserId(users[0].user_id);
  }, [users, selectedUserId]);

  useEffect(() => {
    if (!users.length) return;
    const selected = users.find((user) => user.user_id === selectedUserId) ?? users[0];
    setSelectedUserId(selected.user_id);
  }, [users, selectedUserId]);

  const selectedUser = useMemo(
    () => users.find((user) => user.user_id === selectedUserId) ?? users[0],
    [selectedUserId, users],
  );

  const selectedRole = selectedUser?.role ?? 'user';
  const canEditSelectedUser = canEditUserAccess(currentUser, selectedUser);
  const accessNotice = getAccessNotice(currentUser, selectedUser);

  const updateRoleForSelectedUser = (nextRole: Role) => {
    if (!selectedUser || !currentUser) return;
    if (!canAssignRole(currentUser, selectedUser, nextRole)) return;

    setUserAccessProfile(selectedUser.user_id, {
      role: nextRole,
      permissions: ROLE_PERMISSIONS[nextRole],
    });

    setSavedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  };

  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: 18,
        padding: 20,
        boxShadow: '0 8px 20px rgba(15, 23, 42, 0.04)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center', marginBottom: 20, flexWrap: 'wrap' }}>
        <div>
          <p style={{ margin: 0, color: '#6b7280', letterSpacing: 1.1, fontSize: 12, textTransform: 'uppercase' }}>Permission manager</p>
          <h2 style={{ margin: '8px 0 0', fontSize: 30 }}>Access rules</h2>
          <p style={{ margin: '8px 0 0', color: '#6b7280', fontSize: 13 }}>
            Session source: {session?.provider === 'external' ? 'External auth' : 'Demo provider'}
          </p>
        </div>
        {savedAt && (
          <span style={{ padding: '6px 10px', borderRadius: 999, background: '#ecfdf5', color: '#166534', fontSize: 12, fontWeight: 600 }}>
            Saved {savedAt}
          </span>
        )}
      </div>

      {accessNotice && (
        <div style={{ marginBottom: 16, padding: '10px 12px', borderRadius: 10, background: '#f8fafc', border: '1px solid #e2e8f0', color: '#475569', fontSize: 13 }}>
          {accessNotice}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 320px) minmax(220px, 300px)', gap: 24, marginBottom: 24 }}>
        <label style={{ display: 'grid', gap: 8 }}>
          <span style={{ fontSize: 12, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 1.1 }}>User</span>
          <select
            value={selectedUser?.user_id ?? ''}
            onChange={(event) => setSelectedUserId(event.target.value)}
            style={{
              padding: '10px 12px',
              borderRadius: 10,
              border: '1px solid #d1d5db',
              background: '#fff',
              fontSize: 14,
              color: '#111827',
            }}
          >
            {users.map((user) => (
              <option key={user.user_id} value={user.user_id}>
                {user.name} ({user.email})
              </option>
            ))}
          </select>
        </label>

        <RoleSelector value={selectedRole} onChange={updateRoleForSelectedUser} disabled={!canEditSelectedUser} />
      </div>

      {selectedUser && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 24 }}>
          <div style={{ background: '#f9fafb', borderRadius: 12, padding: 18, border: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: 12, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 1.1, marginBottom: 8 }}>Account summary</div>
            <h3 style={{ margin: '0 0 8px', fontSize: 28 }}>{selectedUser.name}</h3>
            <p style={{ margin: '0 0 8px', color: '#4b5563' }}>{selectedUser.email}</p>
            <p style={{ margin: 0, color: '#4b5563' }}>
              Manager: {selectedUser.manager_user_id ? selectedUser.manager_user_id : 'No direct manager'}
            </p>
          </div>

          <div style={{ background: '#f9fafb', borderRadius: 12, padding: 18, border: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: 12, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 1.1, marginBottom: 8 }}>Granted permissions</div>
            <ul style={{ margin: 0, paddingLeft: 18, color: '#374151', display: 'grid', gap: 10 }}>
              {(selectedUser.permissions.length ? selectedUser.permissions : ROLE_PERMISSIONS[selectedRole]).map((permission) => (
                <li key={permission}>{permission}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserPermissionManager;
