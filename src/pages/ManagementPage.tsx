import UserPermissionManager from '../components/UserPermissionManager';

export default function ManagementPage() {
  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <header style={{ marginBottom: 24 }}>
        <p style={{ margin: 0, color: '#6b7280', letterSpacing: 1.2, textTransform: 'uppercase', fontSize: 12 }}>User management</p>
        <h1 style={{ margin: '8px 0 0', fontSize: 42, lineHeight: 1.1 }}>Team access controls</h1>
      </header>

      <UserPermissionManager />
    </div>
  );
}
