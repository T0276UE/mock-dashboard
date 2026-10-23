export default function CompatibilityPage() {
  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <header style={{ marginBottom: 24 }}>
        <p style={{ margin: 0, color: '#6b7280', letterSpacing: 1.2, textTransform: 'uppercase', fontSize: 12 }}>Compatibility</p>
        <h1 style={{ margin: '8px 0 0', fontSize: 42, lineHeight: 1.1 }}>Compatibility checks</h1>
      </header>

      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 18, padding: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
          {[
            { status: 'In progress', count: 4, accent: '#f59e0b' },
            { status: 'Completed', count: 18, accent: '#22c55e' },
            { status: 'Needs attention', count: 2, accent: '#ef4444' },
          ].map((item) => (
            <div key={item.status} style={{ padding: 18, borderRadius: 14, border: '1px solid #e5e7eb', background: '#fafafa' }}>
              <div style={{ color: '#6b7280', textTransform: 'uppercase', letterSpacing: 1, fontSize: 12 }}>{item.status}</div>
              <div style={{ marginTop: 12, fontSize: 34, fontWeight: 700, color: item.accent }}>{item.count}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
