import { useEffect, useMemo, useState } from 'react';
import type { Customer, ProductInfo, Vehicle } from '../types/customer';
import { formatProductShortCode } from './ProductTagTooltip';

export type AssignmentSourcePage = 'products' | 'customers' | 'vehicles';
export type ProductAssignmentStatus = 'active' | 'pending' | 'error';

export interface ProductAssignmentPayload {
  customerIds: string[];
  vehicleIds: string[];
  productAbbreviations: string[];
  status: ProductAssignmentStatus;
}

interface ProductAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourcePage: AssignmentSourcePage;
  customers: Customer[];
  vehicles: Vehicle[];
  products: ProductInfo[];
  presetCustomerIds?: string[];
  presetVehicleIds?: string[];
  presetProductAbbreviations?: string[];
  title?: string;
  onConfirm: (payload: ProductAssignmentPayload) => void;
}

const EMPTY_STRINGS: string[] = [];

function stepLabelsForSource(sourcePage: AssignmentSourcePage): string[] {
  if (sourcePage === 'products') {
    return ['Customer', 'Vehicles', 'Review'];
  }

  if (sourcePage === 'customers') {
    return ['Vehicles', 'Review'];
  }

  return ['Products'];
}

export default function ProductAssignmentModal({
  isOpen,
  onClose,
  sourcePage,
  customers,
  vehicles,
  products,
  presetCustomerIds,
  presetVehicleIds,
  presetProductAbbreviations,
  title,
  onConfirm,
}: ProductAssignmentModalProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [customerSearch, setCustomerSearch] = useState('');
  const [vehicleSearch, setVehicleSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);
  const [selectedVehicleIds, setSelectedVehicleIds] = useState<string[]>([]);
  const [selectedProductAbbreviations, setSelectedProductAbbreviations] = useState<string[]>([]);
  const [assignmentStatus, setAssignmentStatus] = useState<ProductAssignmentStatus>('pending');

  const stepLabels = stepLabelsForSource(sourcePage);
  const isProductsFlow = sourcePage === 'products';
  const isCustomersFlow = sourcePage === 'customers';
  const isVehiclesFlow = sourcePage === 'vehicles';

  const safePresetCustomerIds = presetCustomerIds ?? EMPTY_STRINGS;
  const safePresetVehicleIds = presetVehicleIds ?? EMPTY_STRINGS;
  const safePresetProductAbbreviations = presetProductAbbreviations ?? EMPTY_STRINGS;
  const presetCustomerSignature = safePresetCustomerIds.join('|');
  const presetVehicleSignature = safePresetVehicleIds.join('|');
  const presetProductSignature = safePresetProductAbbreviations.join('|');

  useEffect(() => {
    if (!isOpen) return;

    setStepIndex(0);
    setCustomerSearch('');
    setVehicleSearch('');
    setProductSearch('');

    setSelectedCustomerIds(isCustomersFlow ? safePresetCustomerIds : []);
    setSelectedVehicleIds(isVehiclesFlow ? safePresetVehicleIds : []);
    setSelectedProductAbbreviations(isProductsFlow ? safePresetProductAbbreviations : []);
    setAssignmentStatus('pending');
  }, [isOpen, isCustomersFlow, isProductsFlow, isVehiclesFlow, presetCustomerSignature, presetProductSignature, presetVehicleSignature]);

  const customerById = useMemo(
    () => customers.reduce<Record<string, Customer>>((acc, customer) => {
      acc[customer.customerId] = customer;
      return acc;
    }, {}),
    [customers],
  );

  const vehicleById = useMemo(
    () => vehicles.reduce<Record<string, Vehicle>>((acc, vehicle) => {
      acc[vehicle.vehicleId] = vehicle;
      return acc;
    }, {}),
    [vehicles],
  );

  const filteredCustomers = useMemo(() => {
    const normalized = customerSearch.trim().toLowerCase();
    if (!normalized) return customers;

    return customers.filter((customer) =>
      [customer.name, customer.customerId]
        .join(' ')
        .toLowerCase()
        .includes(normalized),
    );
  }, [customerSearch, customers]);

  const candidateVehicles = useMemo(() => {
    if (isVehiclesFlow) {
      return vehicles.filter((vehicle) => safePresetVehicleIds.includes(vehicle.vehicleId));
    }

    const customerIdsForFilter = isCustomersFlow ? safePresetCustomerIds : selectedCustomerIds;
    if (!customerIdsForFilter.length) {
      return [];
    }

    return vehicles.filter((vehicle) => customerIdsForFilter.includes(vehicle.customerId));
  }, [
    isCustomersFlow,
    isVehiclesFlow,
    safePresetCustomerIds,
    safePresetVehicleIds,
    selectedCustomerIds,
    vehicles,
  ]);

  const filteredVehicles = useMemo(() => {
    const normalized = vehicleSearch.trim().toLowerCase();
    if (!normalized) return candidateVehicles;

    return candidateVehicles.filter((vehicle) =>
      [vehicle.name, vehicle.vin, vehicle.make, vehicle.model, String(vehicle.year)]
        .join(' ')
        .toLowerCase()
        .includes(normalized),
    );
  }, [candidateVehicles, vehicleSearch]);

  const filteredProducts = useMemo(() => {
    if (isProductsFlow) {
      return products.filter((product) => safePresetProductAbbreviations.includes(product.abbreviation));
    }

    const normalized = productSearch.trim().toLowerCase();
    if (!normalized) return products;

    return products.filter((product) =>
      [product.abbreviation, product.fullName]
        .join(' ')
        .toLowerCase()
        .includes(normalized),
    );
  }, [isProductsFlow, safePresetProductAbbreviations, productSearch, products]);

  const toggleCustomer = (customerId: string) => {
    if (isProductsFlow) {
      setSelectedCustomerIds([customerId]);
      return;
    }

    setSelectedCustomerIds((previous) =>
      previous.includes(customerId)
        ? previous.filter((id) => id !== customerId)
        : [...previous, customerId],
    );
  };

  const toggleVehicle = (vehicleId: string) => {
    setSelectedVehicleIds((previous) =>
      previous.includes(vehicleId)
        ? previous.filter((id) => id !== vehicleId)
        : [...previous, vehicleId],
    );
  };

  const toggleProduct = (abbreviation: string) => {
    setSelectedProductAbbreviations((previous) =>
      previous.includes(abbreviation)
        ? previous.filter((value) => value !== abbreviation)
        : [...previous, abbreviation],
    );
  };

  const selectedCustomerList = selectedCustomerIds
    .map((customerId) => customerById[customerId])
    .filter(Boolean);

  const selectedVehicleList = selectedVehicleIds
    .map((vehicleId) => vehicleById[vehicleId])
    .filter(Boolean);

  const selectedProducts = selectedProductAbbreviations
    .map((abbreviation) => products.find((product) => product.abbreviation === abbreviation))
    .filter((product): product is ProductInfo => Boolean(product));

  const canContinueFromCurrentStep = (() => {
    if (isVehiclesFlow) {
      return selectedProductAbbreviations.length > 0;
    }

    if (isProductsFlow) {
      if (stepIndex === 0) return selectedCustomerIds.length > 0;
      if (stepIndex === 1) return selectedVehicleIds.length > 0;
      return selectedProductAbbreviations.length > 0;
    }

    if (stepIndex === 0) {
      return selectedVehicleIds.length > 0 && selectedProductAbbreviations.length > 0;
    }

    return true;
  })();

  const isLastStep = stepIndex === stepLabels.length - 1;

  const handleConfirm = () => {
    const customerIds = isVehiclesFlow
      ? Array.from(new Set(selectedVehicleList.map((vehicle) => vehicle.customerId)))
      : isCustomersFlow
        ? safePresetCustomerIds
        : selectedCustomerIds;

    onConfirm({
      customerIds,
      vehicleIds: isVehiclesFlow ? safePresetVehicleIds : selectedVehicleIds,
      productAbbreviations: selectedProductAbbreviations,
      status: assignmentStatus,
    });

    onClose();
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Assign products"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 140,
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        style={{
          width: 'min(860px, 96vw)',
          maxHeight: '90vh',
          overflow: 'auto',
          background: '#fff',
          border: '1px solid #dbe3ef',
          borderRadius: 12,
          boxShadow: '0 24px 60px rgba(15, 23, 42, 0.28)',
          padding: 20,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 36, lineHeight: 1.1 }}>{title ?? 'Add product to vehicles'}</h2>
            <p style={{ margin: '8px 0 0', color: '#64748b', fontSize: 14 }}>
              {isProductsFlow && 'Choose customer scope, then eligible vehicles for assignment.'}
              {isCustomersFlow && 'Select vehicles and products for the current customer context.'}
              {isVehiclesFlow && 'Search and select products for the chosen vehicles.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              border: 'none',
              background: 'transparent',
              color: '#64748b',
              fontSize: 28,
              lineHeight: 1,
              cursor: 'pointer',
              padding: 4,
            }}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14 }}>
          {stepLabels.map((label, index) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div
                style={{
                  padding: '6px 10px',
                  borderRadius: 999,
                  background: index <= stepIndex ? '#eff6ff' : '#f1f5f9',
                  color: index <= stepIndex ? '#1d4ed8' : '#64748b',
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                {index + 1} {label}
              </div>
              {index < stepLabels.length - 1 && <span style={{ color: '#94a3b8' }}>-</span>}
            </div>
          ))}
        </div>

        <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 14 }}>
          {isProductsFlow && stepIndex === 0 && (
            <div>
              <input
                type="text"
                value={customerSearch}
                onChange={(event) => setCustomerSearch(event.target.value)}
                placeholder="Search managed customers..."
                style={{ width: '100%', padding: '9px 10px', borderRadius: 8, border: '1px solid #cbd5e1', marginBottom: 12 }}
              />
              <div style={{ border: '1px solid #dbe3ef', borderRadius: 8, overflow: 'hidden' }}>
                {filteredCustomers.map((customer) => {
                  const selected = selectedCustomerIds.includes(customer.customerId);
                  return (
                    <button
                      type="button"
                      key={customer.customerId}
                      onClick={() => toggleCustomer(customer.customerId)}
                      style={{
                        width: '100%',
                        border: 'none',
                        borderTop: '1px solid #edf2f7',
                        background: selected ? '#eff6ff' : '#fff',
                        padding: '10px 12px',
                        textAlign: 'left',
                        display: 'grid',
                        gridTemplateColumns: '1.5fr 1fr 1fr auto',
                        gap: 10,
                        alignItems: 'center',
                        cursor: 'pointer',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>{customer.name}</div>
                        <div style={{ fontSize: 12, color: '#64748b' }}>{customer.customerId}</div>
                      </div>
                      <div style={{ color: '#475569' }}>{customer.metrics.totalVehicles.toLocaleString()} vehicles</div>
                      <div style={{ color: '#475569' }}>{customer.metrics.productsAssigned} products</div>
                      <div style={{ color: selected ? '#1d4ed8' : '#64748b', fontWeight: 700 }}>{selected ? 'Selected' : 'Select'}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {((isProductsFlow && stepIndex === 1) || (isCustomersFlow && stepIndex === 0)) && (
            <div>
              <div style={{ display: 'grid', gap: 8, marginBottom: 12 }}>
                {!isProductsFlow && (
                  <div>
                    <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>Products to assign</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {products.map((product) => {
                        const selected = selectedProductAbbreviations.includes(product.abbreviation);
                        return (
                          <button
                            key={product.abbreviation}
                            type="button"
                            onClick={() => toggleProduct(product.abbreviation)}
                            style={{
                              border: selected ? '1px solid #93c5fd' : '1px solid #d1d5db',
                              background: selected ? '#eff6ff' : '#fff',
                              color: selected ? '#1d4ed8' : '#374151',
                              borderRadius: 999,
                              padding: '5px 10px',
                              fontSize: 12,
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            {formatProductShortCode(product.abbreviation)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {isProductsFlow && (
                  <div style={{ fontSize: 13, color: '#334155' }}>
                    Product: <strong>{selectedProducts[0]?.fullName ?? 'None selected'}</strong>
                  </div>
                )}

                <input
                  type="text"
                  value={vehicleSearch}
                  onChange={(event) => setVehicleSearch(event.target.value)}
                  placeholder="Search vehicle name, VIN, make, or model..."
                  style={{ width: '100%', padding: '9px 10px', borderRadius: 8, border: '1px solid #cbd5e1' }}
                />
              </div>

              <div style={{ border: '1px solid #dbe3ef', borderRadius: 8, overflow: 'hidden' }}>
                {filteredVehicles.map((vehicle) => {
                  const selected = selectedVehicleIds.includes(vehicle.vehicleId);
                  return (
                    <button
                      key={vehicle.vehicleId}
                      type="button"
                      onClick={() => toggleVehicle(vehicle.vehicleId)}
                      style={{
                        width: '100%',
                        border: 'none',
                        borderTop: '1px solid #edf2f7',
                        background: selected ? '#eff6ff' : '#fff',
                        padding: '10px 12px',
                        textAlign: 'left',
                        display: 'grid',
                        gridTemplateColumns: '1.3fr 1.3fr 1fr auto',
                        gap: 10,
                        alignItems: 'center',
                        cursor: 'pointer',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>{vehicle.name}</div>
                        <div style={{ fontSize: 12, color: '#64748b' }}>{vehicle.vin}</div>
                      </div>
                      <div style={{ color: '#475569' }}>{vehicle.make} {vehicle.model} · {vehicle.year}</div>
                      <div style={{ color: '#475569' }}>{customerById[vehicle.customerId]?.name ?? vehicle.customerId}</div>
                      <div style={{ color: selected ? '#1d4ed8' : '#64748b', fontWeight: 700 }}>{selected ? 'Selected' : 'Select'}</div>
                    </button>
                  );
                })}
                {!filteredVehicles.length && (
                  <div style={{ padding: 14, color: '#64748b' }}>No vehicles match this filter.</div>
                )}
              </div>
            </div>
          )}

          {((isProductsFlow && stepIndex === 2) || (isCustomersFlow && stepIndex === 1)) && (
            <div style={{ display: 'grid', gap: 12 }}>
              <div style={{ border: '1px solid #dbe3ef', borderRadius: 8, overflow: 'hidden' }}>
                <div style={{ background: '#f8fafc', padding: 12, fontSize: 12, color: '#64748b', textTransform: 'uppercase' }}>Summary</div>
                <div style={{ padding: 12 }}>
                  <div style={{ marginBottom: 8 }}><strong>Customers:</strong> {selectedCustomerList.map((customer) => customer.name).join(', ') || 'None'}</div>
                  <div style={{ marginBottom: 8 }}><strong>Vehicles:</strong> {selectedVehicleList.length}</div>
                  <div style={{ marginBottom: 8 }}><strong>Products:</strong> {selectedProducts.map((product) => formatProductShortCode(product.abbreviation)).join(', ') || 'None'}</div>
                </div>
              </div>

              <div style={{ border: '1px solid #dbe3ef', borderRadius: 8, padding: 12 }}>
                <div style={{ fontSize: 12, color: '#64748b', textTransform: 'uppercase', marginBottom: 8 }}>Assignment status</div>
                <select
                  value={assignmentStatus}
                  onChange={(event) => setAssignmentStatus(event.target.value as ProductAssignmentStatus)}
                  style={{ width: 240, maxWidth: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #cbd5e1' }}
                >
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                  <option value="error">Error</option>
                </select>
              </div>
            </div>
          )}

          {isVehiclesFlow && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'center', marginBottom: 12 }}>
                <input
                  type="text"
                  value={productSearch}
                  onChange={(event) => setProductSearch(event.target.value)}
                  placeholder="Search products..."
                  style={{ width: '100%', padding: '9px 10px', borderRadius: 8, border: '1px solid #cbd5e1' }}
                />
                <select
                  value={assignmentStatus}
                  onChange={(event) => setAssignmentStatus(event.target.value as ProductAssignmentStatus)}
                  style={{ padding: '9px 10px', borderRadius: 8, border: '1px solid #cbd5e1' }}
                >
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                  <option value="error">Error</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10, border: '1px solid #dbe3ef', borderRadius: 8, padding: 10 }}>
                {filteredProducts.map((product) => {
                  const checked = selectedProductAbbreviations.includes(product.abbreviation);
                  return (
                    <label
                      key={product.abbreviation}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 8,
                        border: checked ? '1px solid #93c5fd' : '1px solid #e2e8f0',
                        borderRadius: 8,
                        padding: 10,
                        cursor: 'pointer',
                        background: checked ? '#eff6ff' : '#fff',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleProduct(product.abbreviation)}
                      />
                      <div>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>{formatProductShortCode(product.abbreviation)}</div>
                        <div style={{ marginTop: 2, color: '#64748b', fontSize: 12 }}>{product.fullName}</div>
                      </div>
                    </label>
                  );
                })}
                {!filteredProducts.length && (
                  <div style={{ gridColumn: '1 / -1', color: '#64748b', padding: 6 }}>No products found.</div>
                )}
              </div>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, paddingTop: 12, borderTop: '1px solid #e2e8f0' }}>
          <button
            type="button"
            onClick={() => {
              if (stepIndex === 0) {
                onClose();
              } else {
                setStepIndex((current) => Math.max(0, current - 1));
              }
            }}
            style={{
              padding: '8px 14px',
              borderRadius: 8,
              border: '1px solid #d1d5db',
              background: '#fff',
              color: '#334155',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {stepIndex === 0 ? 'Cancel' : 'Back'}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ color: '#64748b', fontSize: 12 }}>
              {selectedVehicleIds.length} vehicles selected
            </span>

            {isLastStep || isVehiclesFlow ? (
              <button
                type="button"
                onClick={handleConfirm}
                disabled={!canContinueFromCurrentStep}
                style={{
                  padding: '9px 16px',
                  borderRadius: 8,
                  border: !canContinueFromCurrentStep ? '1px solid #d1d5db' : '1px solid #1d4ed8',
                  background: !canContinueFromCurrentStep ? '#f8fafc' : '#1d4ed8',
                  color: !canContinueFromCurrentStep ? '#94a3b8' : '#fff',
                  fontWeight: 700,
                  cursor: !canContinueFromCurrentStep ? 'not-allowed' : 'pointer',
                }}
              >
                Confirm assignment
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setStepIndex((current) => Math.min(stepLabels.length - 1, current + 1))}
                disabled={!canContinueFromCurrentStep}
                style={{
                  padding: '9px 16px',
                  borderRadius: 8,
                  border: !canContinueFromCurrentStep ? '1px solid #d1d5db' : '1px solid #1d4ed8',
                  background: !canContinueFromCurrentStep ? '#f8fafc' : '#1d4ed8',
                  color: !canContinueFromCurrentStep ? '#94a3b8' : '#fff',
                  fontWeight: 700,
                  cursor: !canContinueFromCurrentStep ? 'not-allowed' : 'pointer',
                }}
              >
                Continue
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
