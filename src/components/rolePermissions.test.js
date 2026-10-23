import test from 'node:test';
import assert from 'node:assert/strict';

import { ROLE_OPTIONS, normalizeRole, getRoleLabel, canEditUserAccess } from './rolePermissions.js';

test('role options are exposed as valid admin roles', () => {
  assert.deepEqual(ROLE_OPTIONS, ['user', 'sysadmin', 'admin']);
});

test('role labels and normalization are stable', () => {
  assert.equal(normalizeRole('SysAdmin'), 'sysadmin');
  assert.equal(normalizeRole('admin '), 'admin');
  assert.equal(getRoleLabel('sysadmin'), 'System Administrator');
});

test('peers and managers are eligible for permission editing', () => {
  assert.equal(
    canEditUserAccess({ user_id: 'USR-002', role: 'sysadmin', manager_user_id: 'USR-001' }, { user_id: 'USR-001', role: 'admin', manager_user_id: null }),
    true,
  );

  assert.equal(
    canEditUserAccess({ user_id: 'USR-002', role: 'sysadmin', manager_user_id: 'USR-001' }, { user_id: 'USR-003', role: 'user', manager_user_id: 'USR-001' }),
    true,
  );
});

test('subordinates remain ineligible for permission editing', () => {
  assert.equal(
    canEditUserAccess({ user_id: 'USR-002', role: 'sysadmin', manager_user_id: 'USR-001' }, { user_id: 'USR-004', role: 'user', manager_user_id: 'USR-002' }),
    false,
  );
});
