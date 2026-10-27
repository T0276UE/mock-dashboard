const metrics = [
  { label: 'Active dashboards', value: '18' },
  { label: 'Pending checks', value: '6' },
  { label: 'Inventory alerts', value: '3' },
];

export default function LandingPage() {
  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <header style={{ marginBottom: 24 }}>
        <p style={{ margin: 0, color: '#6b7280', letterSpacing: 1.2, textTransform: 'uppercase', fontSize: 12 }}>Overview</p>
        <h1 style={{ margin: '8px 0 0', fontSize: 42, lineHeight: 1.1 }}>Welcome to Mock Dashboard</h1>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
        {metrics.map((metric) => (
          <div key={metric.label} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 18, padding: 18 }}>
            <div style={{ color: '#6b7280', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }}>{metric.label}</div>
            <div style={{ marginTop: 12, fontSize: 32, fontWeight: 700 }}>{metric.value}</div>
          </div>
        ))}
      </div>

      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 18, padding: 22 }}>
        <h2 style={{ margin: '0 0 12px', fontSize: 24 }}>Announcements</h2>
        <ul style={{ margin: 0, paddingLeft: 18, color: '#374151', lineHeight: 1.8 }}>
          <li>Compatibility review window opens Friday at 9:00 AM.</li>
          <li>API access keys for new partner integrations are ready for validation.</li>
          <li>Inventory sync completed successfully across 3 regions.</li>
        </ul>
      </div>
    </div>
  );
}
