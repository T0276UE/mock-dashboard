import type { Role } from '../../../navigation/types';
import { ROLE_LABELS, ROLE_OPTIONS } from './rolePermissions';

interface RoleSelectorProps {
  value: Role;
  onChange: (nextRole: Role) => void;
  disabled?: boolean;
}

export function RoleSelector({ value, onChange, disabled = false }: RoleSelectorProps) {
  return (
    <label style={{ display: 'grid', gap: 8, minWidth: 220 }}>
      <span style={{ fontSize: 12, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 1.1 }}>Role</span>
      <select
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value as Role)}
        style={{
          appearance: 'none',
          padding: '10px 12px',
          borderRadius: 10,
          border: '1px solid #d1d5db',
          background: '#fff',
          fontSize: 14,
          color: '#111827',
          outline: 'none',
          opacity: disabled ? 0.6 : 1,
          cursor: disabled ? 'not-allowed' : 'pointer',
        }}
      >
        {ROLE_OPTIONS.map((role) => (
          <option key={role} value={role}>
            {ROLE_LABELS[role]}
          </option>
        ))}
      </select>
    </label>
  );
}

export default RoleSelector;
