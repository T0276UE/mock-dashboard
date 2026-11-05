import { useEffect, useMemo, useState } from 'react';
import { useUser } from '../../../context/UserContext.tsx';
import type { Role } from '../../../navigation/types';
import { RoleSelector } from './RoleSelector';
import { DEFAULT_ROLE_PERMISSIONS, ROLE_PERMISSIONS, canAssignRole, canEditUserAccess, getAccessNotice } from './rolePermissions';
import { customers } from '../../../data/customers';

export function UserPermissionManager() {
  const {
    users,
    currentUser,
    setUserAccessProfile,
    session,
    grantCustomerAccessToUser,
    revokeCustomerAccessFromUser,
    isSyncingAccess,
    syncError,
  } = useUser();
  const [selectedUserId, setSelectedUserId] = useState('');
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [updatingKey, setUpdatingKey] = useState<string | null>(null);

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
  const customerOptions = useMemo(
    () => customers.map((customer) => ({ id: customer.customerId, name: customer.name })),
    [],
  );
  const canManageCustomerAccess = currentUser?.role === 'admin';
  const manageableUsers = useMemo(
    () => users.filter((user) => user.user_id !== currentUser?.user_id),
    [users, currentUser?.user_id],
  );

  const updateRoleForSelectedUser = (nextRole: Role) => {
    if (!selectedUser || !currentUser) return;
    if (!canAssignRole(currentUser, selectedUser, nextRole)) return;

    setUserAccessProfile(selectedUser.user_id, {
      role: nextRole,
      permissions: DEFAULT_ROLE_PERMISSIONS[nextRole],
    });

    setSavedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  };

  const handleCustomerAccessToggle = async (userId: string, customerId: string, isChecked: boolean) => {
    if (!canManageCustomerAccess) return;

    const key = `${userId}:${customerId}`;
    setUpdatingKey(key);

    try {
      if (isChecked) {
        await grantCustomerAccessToUser(userId, customerId);
      } else {
        await revokeCustomerAccessFromUser(userId, customerId);
      }

      setSavedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    } finally {
      setUpdatingKey(null);
    }
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

      <div style={{ marginTop: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: 20 }}>Customer Access Matrix</h3>
          <div style={{ color: '#6b7280', fontSize: 12 }}>
            {canManageCustomerAccess ? 'Admins can update customer access.' : 'Admin-only control'}
          </div>
        </div>

        {syncError && (
          <div
            style={{
              marginBottom: 12,
              padding: '10px 12px',
              borderRadius: 10,
              border: '1px solid #fecaca',
              background: '#fef2f2',
              color: '#991b1b',
              fontSize: 12,
            }}
          >
            {syncError}
          </div>
        )}

        <div style={{ overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: 12 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
            <thead style={{ background: '#f8fafc' }}>
              <tr>
                <th style={{ textAlign: 'left', padding: '10px 12px', borderBottom: '1px solid #e5e7eb', fontSize: 12 }}>User</th>
                <th style={{ textAlign: 'left', padding: '10px 12px', borderBottom: '1px solid #e5e7eb', fontSize: 12 }}>Role</th>
                {customerOptions.map((customer) => (
                  <th key={customer.id} style={{ textAlign: 'center', padding: '10px 8px', borderBottom: '1px solid #e5e7eb', fontSize: 11 }} title={customer.name}>
                    <div>{customer.name}</div>
                    <div style={{ color: '#64748b', fontWeight: 500 }}>{customer.id}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {manageableUsers.map((user) => (
                <tr key={user.user_id} style={{ borderTop: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '10px 12px', fontSize: 13 }}>
                    <div style={{ fontWeight: 600 }}>{user.name}</div>
                    <div style={{ color: '#6b7280' }}>{user.user_id}</div>
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: 12, color: '#475569', textTransform: 'capitalize' }}>{user.role}</td>
                  {customerOptions.map((customer) => {
                    const checked = user.managed_customer_ids.includes(customer.id);
                    const key = `${user.user_id}:${customer.id}`;
                    const disabled = !canManageCustomerAccess || isSyncingAccess || updatingKey === key;

                    return (
                      <td key={key} style={{ textAlign: 'center', padding: '10px 8px' }}>
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={disabled}
                          onChange={(event) => {
                            void handleCustomerAccessToggle(user.user_id, customer.id, event.target.checked);
                          }}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default UserPermissionManager;
