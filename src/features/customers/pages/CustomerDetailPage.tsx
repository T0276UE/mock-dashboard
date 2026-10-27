import { useMemo } from 'react';
import { customers, vehicles } from '../../../data/customers';
import ProductTagTooltip from '../../../shared/components/ProductTagTooltip';
import { navigateToCustomers } from '../../../services/navigationService';

const statusColors: Record<string, { bg: string; text: string }> = {
  Active: { bg: '#ecfdf5', text: '#15803d' },
  Pending: { bg: '#fef3c7', text: '#a16207' },
  Inactive: { bg: '#f3f4f6', text: '#6b7280' },
};

interface CustomerDetailPageProps {
  customerId: string;
  isPanel?: boolean;
}

export default function CustomerDetailPage({ customerId, isPanel = false }: CustomerDetailPageProps) {
  const customer = useMemo(() => customers.find((c) => c.customerId === customerId), [customerId]);
  const customerVehicles = useMemo(() => vehicles.filter((v) => v.customerId === customerId), [customerId]);

  if (!customer) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center' }}>
        <h2 style={{ color: '#6b7280' }}>Customer not found</h2>
      </div>
    );
  }

  const colors = statusColors[customer.status];

  if (isPanel) {
    return (
      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Header */}
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#111827' }}>{customer.name}</h2>
          <div style={{ marginTop: 6, fontSize: 12, color: '#6b7280' }}>
            {customer.customerId}
            <span
              style={{
                marginLeft: 8,
                padding: '2px 8px',
                borderRadius: 4,
                background: colors.bg,
                color: colors.text,
                fontWeight: 600,
                textTransform: 'capitalize',
              }}
            >
              {customer.status}
            </span>
          </div>
        </div>

        {/* Quick Stats */}
        <div>
          <div style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10, fontWeight: 600 }}>
            Quick Stats
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { label: 'Active', value: customer.metrics.onlineVehicles, color: '#16a34a' },
              { label: 'Offline', value: customer.metrics.offlineVehicles, color: '#ef4444' },
              { label: 'Paused', value: customer.metrics.pausedVehicles, color: '#f59e0b' },
            ].map((stat) => (
              <div key={stat.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
                <div style={{ color: '#6b7280', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: stat.color }} />
                  {stat.label}
                </div>
                <div style={{ fontWeight: 700, color: '#111827' }}>{stat.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Account Info */}
        <div>
          <div style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10, fontWeight: 600 }}>
            Account Details
          </div>
          <div style={{ fontSize: 12, color: '#4b5563', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div>
              <div style={{ fontSize: 10, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.4 }}>Owner</div>
              <div style={{ fontWeight: 500 }}>{customer.accountOwner}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.4 }}>Steward</div>
              <div style={{ fontWeight: 500 }}>{customer.accountSteward}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.4 }}>Region</div>
              <div style={{ fontWeight: 500 }}>{customer.region}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.4 }}>Active Since</div>
              <div style={{ fontWeight: 500 }}>{customer.activeSince}</div>
            </div>
          </div>
        </div>

        {/* Products */}
        <div>
          <div style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10, fontWeight: 600 }}>
            Assigned Products
          </div>
          <ProductTagTooltip products={customer.products} columnCount={1} />
        </div>

        {/* Email */}
        {customer.email && (
          <div>
            <div style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10, fontWeight: 600 }}>
              Contact
            </div>
            <div style={{ fontSize: 12, color: '#4b5563', wordBreak: 'break-word' }}>{customer.email}</div>
          </div>
        )}
      </div>
    );
  }

  // Full page view
  return (
    <div style={{ maxWidth: 1400, margin: '0 auto' }}>
      <header style={{ marginBottom: 24 }}>
        <button
          onClick={navigateToCustomers}
          style={{
            background: 'none',
            border: 'none',
            color: '#0078d4',
            fontSize: 14,
            fontWeight: 500,
            cursor: 'pointer',
            marginBottom: 12,
            padding: 0,
          }}
        >
          ← Back to Customers
        </button>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 16 }}>
          <div style={{ flex: 1 }}>
            <h1 style={{ margin: 0, fontSize: 42, lineHeight: 1.1, color: '#111827' }}>{customer.name}</h1>
            <div style={{ marginTop: 8, display: 'flex', gap: 12, alignItems: 'center', fontSize: 14, color: '#6b7280' }}>
              <span>{customer.customerId}</span>
              <span
                style={{
                  padding: '4px 10px',
                  borderRadius: 999,
                  background: colors.bg,
                  color: colors.text,
                  fontWeight: 600,
                  fontSize: 12,
                  textTransform: 'capitalize',
                }}
              >
                {customer.status}
              </span>
            </div>
          </div>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Account Information */}
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 20 }}>
            <h2 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700, color: '#111827' }}>Account Information</h2>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 20,
              }}
            >
              {[
                { label: 'Customer Type', value: 'External' },
                { label: 'Industry', value: customer.industry },
                { label: 'Account Owner', value: customer.accountOwner },
                { label: 'Account Steward', value: customer.accountSteward },
                { label: 'Active Since', value: customer.activeSince },
                { label: 'Region', value: customer.region },
              ].map((item) => (
                <div key={item.label}>
                  <div style={{ fontSize: 12, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>{item.label}</div>
                  <div style={{ fontSize: 16, fontWeight: 500, color: '#111827' }}>{item.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Assigned Products */}
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 20 }}>
            <h2 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700, color: '#111827' }}>Assigned Products · {customer.metrics.productsAssigned}</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
              <ProductTagTooltip products={customer.products} columnCount={2} />
            </div>
            <button
              style={{
                color: '#0078d4',
                fontSize: 14,
                fontWeight: 500,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              View all →
            </button>
          </div>

          {/* Vehicles */}
          {customerVehicles.length > 0 && (
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ padding: 20, borderBottom: '1px solid #e5e7eb' }}>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#111827' }}>Vehicles · {customerVehicles.length}</h2>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ background: '#f9fafb' }}>
                  <tr>
                    {['Vehicle Name', 'VIN', 'Make', 'Model', 'Year', 'Status'].map((label) => (
                      <th key={label} style={{ textAlign: 'left', padding: '12px 20px', fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {customerVehicles.map((vehicle) => (
                    <tr key={vehicle.vehicleId} style={{ borderTop: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '12px 20px', fontWeight: 500, color: '#111827' }}>{vehicle.name}</td>
                      <td style={{ padding: '12px 20px', fontSize: 12, color: '#6b7280', fontFamily: 'monospace' }}>{vehicle.vin}</td>
                      <td style={{ padding: '12px 20px', color: '#374151' }}>{vehicle.make}</td>
                      <td style={{ padding: '12px 20px', color: '#374151' }}>{vehicle.model}</td>
                      <td style={{ padding: '12px 20px', color: '#374151' }}>{vehicle.year}</td>
                      <td style={{ padding: '12px 20px' }}>
                        <span
                          style={{
                            padding: '4px 10px',
                            borderRadius: 6,
                            background: vehicle.activity === 'Online' ? '#ecfdf5' : vehicle.activity === 'Offline' ? '#fee2e2' : '#fef3c7',
                            color: vehicle.activity === 'Online' ? '#15803d' : vehicle.activity === 'Offline' ? '#dc2626' : '#a16207',
                            fontSize: 12,
                            fontWeight: 600,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {vehicle.activity}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Quick Stats */}
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 18 }}>
            <div style={{ fontSize: 12, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>Quick Stats</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { label: 'Active Vehicles', value: customer.metrics.onlineVehicles, color: '#16a34a' },
                { label: 'Offline', value: customer.metrics.offlineVehicles, color: '#ef4444' },
                { label: 'Paused', value: customer.metrics.pausedVehicles, color: '#f59e0b' },
              ].map((stat) => (
                <div key={stat.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 12, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: stat.color }} />
                    {stat.label}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 16, color: '#111827' }}>{stat.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Contact Information */}
          {customer.email && (
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 18 }}>
              <div style={{ fontSize: 12, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>Contact</div>
              <div style={{ fontSize: 13, color: '#4b5563', wordBreak: 'break-word' }}>{customer.email}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
