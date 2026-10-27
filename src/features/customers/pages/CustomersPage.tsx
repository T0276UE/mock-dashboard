import { useMemo, useState } from 'react';
import ProductAssignmentModal from '../../../shared/components/ProductAssignmentModal';
import { customers, vehicles } from '../../../data/customers';
import ProductTagTooltip from '../../../shared/components/ProductTagTooltip';
import CustomerDetailPage from './CustomerDetailPage';
import { useUser } from '../../../context/UserContext';
import { userCanManageCustomer, userCanViewCustomer } from '../../management/components/rolePermissions';
import { navigateToCustomerDetail as navigateToCustomerDetailPath } from '../../../services/navigationService';
import type { Customer, ProductInfo } from '../../../types/customer';

const statusColors: Record<string, { bg: string; text: string; border: string }> = {
  Active: { bg: '#ecfdf5', text: '#15803d', border: '#86efac' },
  Pending: { bg: '#fef3c7', text: '#a16207', border: '#fcd34d' },
  Inactive: { bg: '#f3f4f6', text: '#6b7280', border: '#e5e7eb' },
};

type ViewMode = 'grid' | 'table';

export default function CustomersPage() {
  const { currentUser } = useUser();
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assignmentNotice, setAssignmentNotice] = useState<string | null>(null);

  const visibleCustomers = useMemo(() => {
    if (!currentUser) return customers;

    return customers.filter((customer) => userCanViewCustomer(currentUser, customer.customerId));
  }, [currentUser]);

  const filteredCustomers = visibleCustomers.filter((c) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.customerId.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const productCatalog = useMemo(() => {
    const map = new Map<string, ProductInfo>();
    customers.forEach((customer) => {
      customer.products.forEach((product) => map.set(product.abbreviation, product));
    });
    return Array.from(map.values());
  }, []);

  // Set first customer as selected when in table view
  const activeDetailCustomerId = viewMode === 'table' ? (selectedCustomerId || filteredCustomers[0]?.customerId) : null;
  const detailCustomer = activeDetailCustomerId ? visibleCustomers.find((c) => c.customerId === activeDetailCustomerId) : null;
  const assignmentCustomerId = selectedCustomerId || null;

  const navigateToCustomerDetail = (customerId: string) => {
    setSelectedCustomerId(customerId);
    navigateToCustomerDetailPath(customerId);
  };

  const openEnrichmentForCustomer = (customerId: string) => {
    setSelectedCustomerId(customerId);
    setAssignmentNotice(null);
    setIsAssignModalOpen(true);
  };

  return (
    <div style={{ maxWidth: viewMode === 'table' ? '100%' : 1400, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 24, marginBottom: 24 }}>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, color: '#6b7280', letterSpacing: 1.2, textTransform: 'uppercase', fontSize: 12, textAlign: 'left' }}>Customers</p>
          <div style={{display: 'flex', justifyContent: 'space-between', }}>  
            <h1 style={{ margin: '8px 0 0', fontSize: 32, lineHeight: 1.1, textAlign: 'left' }}>Manage accounts, hierarchy, access and product assignments</h1>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                onClick={() => {
                  if (!assignmentCustomerId) return;
                  openEnrichmentForCustomer(assignmentCustomerId);
                }}
                disabled={!assignmentCustomerId || !userCanManageCustomer(currentUser, assignmentCustomerId)}
                style={{
                  padding: '10px 14px',
                  borderRadius: 10,
                  border: assignmentCustomerId && userCanManageCustomer(currentUser, assignmentCustomerId) ? '1px solid #bfdbfe' : '1px solid #e5e7eb',
                  background: assignmentCustomerId && userCanManageCustomer(currentUser, assignmentCustomerId) ? '#eff6ff' : '#f8fafc',
                  color: assignmentCustomerId && userCanManageCustomer(currentUser, assignmentCustomerId) ? '#1d4ed8' : '#94a3b8',
                  fontWeight: 700,
                  cursor: assignmentCustomerId && userCanManageCustomer(currentUser, assignmentCustomerId) ? 'pointer' : 'not-allowed',
                  whiteSpace: 'nowrap',
                }}
              >
                + Product
              </button>
              <button
                style={{
                  padding: '10px 18px',
                  borderRadius: 10,
                  border: 'none',
                  background: '#005a9c',
                  color: '#fff',
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                Add Customer
              </button>
            </div>
          </div>
          {assignmentNotice && <p style={{ margin: '10px 0 0', color: '#166534', fontSize: 13 }}>{assignmentNotice}</p>}
        </div>
        
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 24, alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flex: 1 }}>
          <input
            type="text"
            placeholder="Search customers…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            aria-label="Search customers"
            style={{
              padding: '10px 12px',
              minWidth: 280,
              border: '1px solid #d1d5db',
              borderRadius: 10,
              fontSize: 14,
              outline: 'none',
            }}
          />
          <span style={{ color: '#6b7280', fontSize: 14, whiteSpace: 'nowrap' }}>All Customers · {filteredCustomers.length}</span>
        </div>

        <div style={{ display: 'flex', gap: 8, background: '#f3f4f6', padding: 4, borderRadius: 8 }}>
          {(['grid', 'table'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => {
                setViewMode(mode);
                if (mode === 'table' && !selectedCustomerId && filteredCustomers.length > 0) {
                  setSelectedCustomerId(filteredCustomers[0].customerId);
                }
              }}
              style={{
                padding: '6px 12px',
                borderRadius: 6,
                border: 'none',
                background: viewMode === mode ? '#fff' : 'transparent',
                color: viewMode === mode ? '#111827' : '#6b7280',
                fontWeight: 600,
                fontSize: 12,
                cursor: 'pointer',
                textTransform: 'capitalize',
                transition: 'all 150ms ease',
                boxShadow: viewMode === mode ? '0 1px 3px rgba(0, 0, 0, 0.1)' : 'none',
              }}
            >
              {mode === 'grid' ? '⊞ Grid' : '≡ Table'}
            </button>
          ))}
        </div>
      </div>

      {viewMode === 'grid' ? (
        // GRID VIEW
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {filteredCustomers.map((customer: Customer) => {
            const colors = statusColors[customer.status];
            const isSelected = selectedCustomerId === customer.customerId;
            return (
              <div
                key={customer.customerId}
                role="button"
                tabIndex={0}
                onClick={() => {
                  if (!userCanViewCustomer(currentUser, customer.customerId)) return;
                  navigateToCustomerDetail(customer.customerId);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    if (!userCanViewCustomer(currentUser, customer.customerId)) return;
                    navigateToCustomerDetail(customer.customerId);
                  }
                }}
                style={{
                  background: '#fff',
                  border: isSelected ? '1px solid #93c5fd' : '1px solid #e5e7eb',
                  borderRadius: 12,
                  padding: 18,
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  transition: 'all 150ms ease',
                  boxShadow: isSelected ? '0 8px 20px rgba(59, 130, 246, 0.15)' : '0 1px 3px rgba(0, 0, 0, 0.05)',
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.boxShadow = '0 8px 20px rgba(0, 0, 0, 0.1)';
                  el.style.borderColor = '#d1d5db';
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)';
                  el.style.borderColor = '#e5e7eb';
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ textAlign: 'left', flex: 1 }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>{customer.name}</div>
                    <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{customer.customerId}</div>
                    <div style={{ fontSize: 11, color: '#2563eb', marginTop: 8, fontWeight: 600 }}>Click card to open details page</div>
                  </div>
                  <span
                    style={{
                      padding: '4px 10px',
                      borderRadius: 999,
                      background: colors.bg,
                      color: colors.text,
                      fontSize: 11,
                      fontWeight: 600,
                      textTransform: 'capitalize',
                      border: `1px solid ${colors.border}`,
                      whiteSpace: 'nowrap',
                      marginLeft: 8,
                    }}
                  >
                    {customer.status}
                  </span>
                </div>

                <div style={{ fontSize: 12, color: '#374151', textAlign: 'left' }}>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>
                    {customer.metrics.productsAssigned} products · {(customer.metrics.totalVehicles / 1000).toFixed(1)}k vehicles
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'space-between' }}>
                  <ProductTagTooltip products={customer.products} columnCount={2} />
                  <div style={{ display: 'flex', gap: 6, fontSize: 11, color: '#6b7280', marginLeft: 'auto' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <span style={{ color: '#16a34a' }}>●</span>
                      {customer.metrics.onlineVehicles}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <span style={{ color: '#ef4444' }}>●</span>
                      {customer.metrics.offlineVehicles}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <span style={{ color: '#f59e0b' }}>●</span>
                      {customer.metrics.pausedVehicles}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginTop: 4 }}>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      openEnrichmentForCustomer(customer.customerId);
                    }}
                    style={{
                      padding: '7px 10px',
                      borderRadius: 8,
                      border: '1px solid #bfdbfe',
                      background: '#eff6ff',
                      color: '#1d4ed8',
                      fontWeight: 700,
                      fontSize: 12,
                      cursor: 'pointer',
                    }}
                  >
                    + Product
                  </button>
                  <span style={{ color: '#64748b', fontSize: 11 }}>Opens assignment flow for this customer</span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        // TABLE VIEW with persistent detail panel
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 24 }}>
          {/* Table on left */}
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: '#f9fafb', position: 'sticky', top: 0 }}>
                <tr>
                  {['Customer', 'Status', 'Products', 'Vehicles', 'Activity'].map((label) => (
                    <th
                      key={label}
                      style={{
                        textAlign: 'left',
                        padding: '12px 16px',
                        fontSize: 12,
                        fontWeight: 600,
                        color: '#6b7280',
                        textTransform: 'uppercase',
                        letterSpacing: 0.5,
                        borderBottom: '1px solid #e5e7eb',
                      }}
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((customer) => {
                  const colors = statusColors[customer.status];
                  const isSelected = selectedCustomerId === customer.customerId;
                  return (
                    <tr
                      key={customer.customerId}
                      onClick={() => setSelectedCustomerId(customer.customerId)}
                      style={{
                        borderTop: '1px solid #e5e7eb',
                        background: isSelected ? '#f0f6ff' : 'transparent',
                        cursor: 'pointer',
                        transition: 'background 150ms ease',
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) {
                          (e.currentTarget as HTMLElement).style.background = '#f9fafb';
                        }
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.background = isSelected ? '#f0f6ff' : 'transparent';
                      }}
                    >
                      <td style={{ padding: '12px 16px', fontWeight: 600, color: '#111827' }}>{customer.name}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span
                          style={{
                            padding: '4px 8px',
                            borderRadius: 6,
                            background: colors.bg,
                            color: colors.text,
                            fontSize: 11,
                            fontWeight: 600,
                            textTransform: 'capitalize',
                          }}
                        >
                          {customer.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', color: '#374151', fontSize: 14 }}>{customer.metrics.productsAssigned}</td>
                      <td style={{ padding: '12px 16px', color: '#374151', fontSize: 14 }}>
                        {(customer.metrics.totalVehicles / 1000).toFixed(1)}k
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 12, color: '#6b7280' }}>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <span style={{ color: '#16a34a', fontWeight: 600 }}>●</span>
                          <span>{customer.metrics.onlineVehicles}</span>
                          <span style={{ color: '#ef4444', fontWeight: 600, marginLeft: 6 }}>●</span>
                          <span>{customer.metrics.offlineVehicles}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Detail panel on right */}
          {detailCustomer ? (
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'auto', maxHeight: 'calc(100vh - 280px)' }}>
              <CustomerDetailPage customerId={detailCustomer.customerId} isPanel={true} />
            </div>
          ) : (
            <div
              style={{
                background: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: 12,
                padding: 32,
                textAlign: 'center',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div style={{ color: '#6b7280' }}>
                <p style={{ margin: '0 0 8px' }}>No customer selected</p>
                <p style={{ margin: 0, fontSize: 12 }}>Click a row to view details</p>
              </div>
            </div>
          )}
        </div>
      )}

      <ProductAssignmentModal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        sourcePage="customers"
        customers={customers}
        vehicles={vehicles}
        products={productCatalog}
        presetCustomerIds={assignmentCustomerId ? [assignmentCustomerId] : []}
        title="Select eligible vehicles"
        onConfirm={(assignment) => {
          const customerName = customers.find((entry) => entry.customerId === assignmentCustomerId)?.name ?? 'Customer';
          setAssignmentNotice(`${assignment.productAbbreviations.length} product${assignment.productAbbreviations.length === 1 ? '' : 's'} assigned to ${assignment.vehicleIds.length} vehicle${assignment.vehicleIds.length === 1 ? '' : 's'} for ${customerName}.`);
          setIsAssignModalOpen(false);
        }}
      />
    </div>
  );
}
