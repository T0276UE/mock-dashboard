import ProductTagTooltip from '../../shared/components/ProductTagTooltip';
import { customers } from '../../data/customers';
import type { Vehicle } from '../../types/customer';
import { activityColors, drawerWidth } from './vehiclePageData';

interface VehicleDetailDrawerProps {
  vehicle: Vehicle | null;
  isOpen: boolean;
  onAddProducts: (vehicleId: string) => void;
}

export default function VehicleDetailDrawer({ vehicle, isOpen, onAddProducts }: VehicleDetailDrawerProps) {
  const customer = vehicle ? customers.find((entry) => entry.customerId === vehicle.customerId) : null;

  return (
    <aside
      style={{
        width: isOpen ? drawerWidth : 0,
        minWidth: isOpen ? drawerWidth : 0,
        maxWidth: isOpen ? drawerWidth : 0,
        overflow: 'hidden',
        transition: 'width 220ms ease, min-width 220ms ease, max-width 220ms ease',
        borderLeft: isOpen ? '1px solid #e5e7eb' : '1px solid transparent',
        background: '#fff',
        boxShadow: isOpen ? '-12px 0 24px rgba(15, 23, 42, 0.06)' : 'none',
      }}
    >
      <div
        style={{
          width: drawerWidth,
          transform: isOpen ? 'translateX(0)' : 'translateX(18px)',
          opacity: isOpen ? 1 : 0,
          transition: 'transform 220ms ease, opacity 180ms ease',
          height: '100%',
          overflowY: 'auto',
          scrollbarGutter: 'stable',
        }}
      >
        {!vehicle ? (
          <div style={{ padding: 24, color: '#6b7280', display: 'flex', alignItems: 'center', height: '100%' }}>
            Select a vehicle to view details.
          </div>
        ) : (
          <div style={{ padding: '24px 24px 32px', display: 'flex', flexDirection: 'column', gap: 18, minHeight: '100%' }}>
            <div>
              <p style={{ margin: 0, color: '#6b7280', letterSpacing: 1.1, fontSize: 12, textTransform: 'uppercase' }}>Vehicle details</p>
              <h2 style={{ margin: '8px 0 0', fontSize: 28, lineHeight: 1.1 }}>{vehicle.name}</h2>
              <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <span
                  style={{
                    padding: '4px 10px',
                    borderRadius: 999,
                    background: activityColors[vehicle.activity].bg,
                    color: activityColors[vehicle.activity].text,
                    border: `1px solid ${activityColors[vehicle.activity].border}`,
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  {vehicle.activity}
                </span>
                <span style={{ fontSize: 12, color: '#6b7280' }}>Last seen {vehicle.lastSeen}</span>
              </div>
              <button
                type="button"
                onClick={() => onAddProducts(vehicle.vehicleId)}
                style={{
                  marginTop: 12,
                  padding: '7px 12px',
                  borderRadius: 10,
                  border: '1px solid #bfdbfe',
                  background: '#eff6ff',
                  color: '#1d4ed8',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Add products
              </button>
            </div>

            <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden', background: '#fff' }}>
              {[
                { label: 'VIN', value: vehicle.vin, monospace: true },
                { label: 'Make / Model / Year', value: `${vehicle.make} ${vehicle.model} ${vehicle.year}` },
                { label: 'Customer', value: customer?.name ?? vehicle.customerId },
              ].map((item, index) => (
                <div
                  key={item.label}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '110px minmax(0, 1fr)',
                    gap: 10,
                    alignItems: 'start',
                    padding: '11px 12px',
                    borderTop: index === 0 ? 'none' : '1px solid #f3f4f6',
                    background: '#fff',
                  }}
                >
                  <div style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.8 }}>{item.label}</div>
                  <div
                    style={{
                      marginTop: 1,
                      fontSize: 13,
                      fontWeight: 600,
                      color: '#111827',
                      fontFamily: item.monospace ? 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace' : 'inherit',
                      wordBreak: item.monospace ? 'normal' : 'normal',
                      overflowWrap: item.monospace ? 'normal' : 'anywhere',
                      whiteSpace: item.monospace ? 'nowrap' : 'normal',
                      overflow: item.monospace ? 'hidden' : 'visible',
                      textOverflow: item.monospace ? 'ellipsis' : 'clip',
                    }}
                    title={item.monospace ? String(item.value) : undefined}
                  >
                    {item.value}
                  </div>
                </div>
              ))}
            </div>

            <div>
              <div style={{ fontSize: 12, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 1.1, marginBottom: 8 }}>Fleet metrics</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
                {[
                  { label: 'Health score', value: `${vehicle.healthScore ?? 0}` },
                  { label: 'Status', value: vehicle.activity },
                  { label: 'Telemetry', value: vehicle.activity === 'Online' ? 'Live stream' : 'No live feed' },
                  { label: 'Products', value: `${vehicle.products.length} assigned` },
                ].map((item) => (
                  <div key={item.label} style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 12, padding: 12 }}>
                    <div style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.8 }}>{item.label}</div>
                    <div style={{ marginTop: 6, fontSize: 15, fontWeight: 700, color: '#111827' }}>{item.value}</div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 12, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 1.1, marginBottom: 8 }}>Assigned products</div>
              <ProductTagTooltip products={vehicle.products} columnCount={1} />
            </div>

            {customer && (
              <div style={{ marginTop: 'auto', paddingTop: 8, borderTop: '1px solid #e5e7eb' }}>
                <div style={{ fontSize: 12, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 1.1, marginBottom: 8 }}>Customer context</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{customer.name}</div>
                <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>{customer.region ?? 'Unknown region'}</div>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
