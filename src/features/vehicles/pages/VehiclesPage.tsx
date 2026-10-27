import { useEffect, useMemo, useState } from 'react';
import { customers } from '../../../data/customers';
import ProductAssignmentModal from '../../../shared/components/ProductAssignmentModal';
import type { ProductAssignmentPayload, ProductAssignmentStatus } from '../../../shared/components/ProductAssignmentModal';
import type { Vehicle } from '../../../types/customer';
import { useUser } from '../../../context/UserContext';
import { userCanViewVehicle } from '../../management/components/rolePermissions';
import VehicleDetailDrawer from '../VehicleDetailDrawer';
import {
  activityOptions,
  buildInitialProductStatusMap,
  buildProductCatalog,
  columnAlignments,
  columnWidths,
  drawerWidth,
  formatProductShortCode,
  getDefaultProductStatus,
  matchesVehicleSearch,
  productStatusColors,
  seededVehicles,
  type ActivityFilter,
  type YearFilter,
  yearOptions,
} from '../vehiclePageData';

export default function VehiclesPage() {
  const { currentUser } = useUser();
  const [vehicles, setVehicles] = useState<Vehicle[]>(seededVehicles);
  const [searchTerm, setSearchTerm] = useState('');
  const [customerFilter, setCustomerFilter] = useState('All Customers');
  const [makeFilter, setMakeFilter] = useState('All Makes');
  const [modelFilter, setModelFilter] = useState('All Models');
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>('All Activity');
  const [yearFilter, setYearFilter] = useState<YearFilter>('All Years');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(vehicles[0]?.vehicleId ?? null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(Boolean(vehicles[0]));
  const [selectedVehicleIds, setSelectedVehicleIds] = useState<string[]>([]);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [modalTargetVehicleIds, setModalTargetVehicleIds] = useState<string[]>([]);
  const [productStatusByVehicle, setProductStatusByVehicle] = useState<Record<string, Record<string, ProductAssignmentStatus>>>(() =>
    buildInitialProductStatusMap(seededVehicles),
  );

  const productCatalog = useMemo(() => {
    return buildProductCatalog(vehicles);
  }, [vehicles]);

  const visibleVehicles = useMemo(() => {
    if (!currentUser) return vehicles;

    return vehicles.filter((vehicle) => userCanViewVehicle(currentUser, vehicle.customerId));
  }, [currentUser, vehicles]);

  const customerOptions = useMemo(
    () => ['All Customers', ...Array.from(new Set(customers.map((customer) => customer.name)))],
    [],
  );
  const makeOptions = useMemo(
    () => ['All Makes', ...Array.from(new Set(vehicles.map((vehicle) => vehicle.make)))],
    [vehicles],
  );
  const modelOptions = useMemo(
    () => ['All Models', ...Array.from(new Set(vehicles.map((vehicle) => vehicle.model)))],
    [vehicles],
  );

  const filteredVehicles = useMemo(() => {
    return visibleVehicles.filter((vehicle) => {
      const customerName = customers.find((customer) => customer.customerId === vehicle.customerId)?.name ?? vehicle.customerId;
      const searchMatches = matchesVehicleSearch(vehicle, searchTerm);
      const customerMatches = customerFilter === 'All Customers' || customerName === customerFilter;
      const makeMatches = makeFilter === 'All Makes' || vehicle.make === makeFilter;
      const modelMatches = modelFilter === 'All Models' || vehicle.model === modelFilter;
      const activityMatches = activityFilter === 'All Activity' || vehicle.activity === activityFilter;
      const yearMatches = yearFilter === 'All Years' || String(vehicle.year) === yearFilter;
      return searchMatches && customerMatches && makeMatches && modelMatches && activityMatches && yearMatches;
    });
  }, [activityFilter, customerFilter, makeFilter, modelFilter, searchTerm, visibleVehicles, yearFilter]);

  const selectedVehicle = useMemo(() => {
    return filteredVehicles.find((vehicle) => vehicle.vehicleId === selectedVehicleId) ?? filteredVehicles[0] ?? null;
  }, [filteredVehicles, selectedVehicleId]);

  const drawerVisible = isDrawerOpen && Boolean(selectedVehicle);
  const visibleColumns = ['Select', 'Vehicle', 'Customer', 'VIN', 'Make', 'Model', 'Year', 'Product Status'];
  const filteredVehicleIds = filteredVehicles.map((vehicle) => vehicle.vehicleId);
  const allVisibleSelected =
    filteredVehicleIds.length > 0 && filteredVehicleIds.every((vehicleId) => selectedVehicleIds.includes(vehicleId));

  useEffect(() => {
    if (!filteredVehicles.length) {
      setSelectedVehicleId(null);
      setIsDrawerOpen(false);
      return;
    }

    if (!selectedVehicleId || !filteredVehicles.some((vehicle) => vehicle.vehicleId === selectedVehicleId)) {
      setSelectedVehicleId(filteredVehicles[0].vehicleId);
      setIsDrawerOpen(true);
    }
  }, [filteredVehicles, selectedVehicleId]);

  useEffect(() => {
    setSelectedVehicleIds((previous) => previous.filter((vehicleId) => filteredVehicleIds.includes(vehicleId)));
  }, [filteredVehicleIds]);

  const handleSelectVehicle = (vehicleId: string) => {
    if (selectedVehicleId === vehicleId && isDrawerOpen) {
      setIsDrawerOpen(false);
      return;
    }

    setSelectedVehicleId(vehicleId);
    setIsDrawerOpen(true);
  };

  const handleToggleVehicleSelection = (vehicleId: string) => {
    setSelectedVehicleIds((previous) =>
      previous.includes(vehicleId)
        ? previous.filter((id) => id !== vehicleId)
        : [...previous, vehicleId],
    );
  };

  const handleToggleSelectAllVisible = () => {
    if (allVisibleSelected) {
      setSelectedVehicleIds((previous) => previous.filter((id) => !filteredVehicleIds.includes(id)));
      return;
    }

    setSelectedVehicleIds((previous) => Array.from(new Set([...previous, ...filteredVehicleIds])));
  };

  const openProductModalForVehicles = (vehicleIds: string[]) => {
    if (!vehicleIds.length) return;
    setModalTargetVehicleIds(vehicleIds);
    setIsProductModalOpen(true);
  };

  const handleApplyProducts = (assignment: ProductAssignmentPayload) => {
    if (!assignment.vehicleIds.length || !assignment.productAbbreviations.length) return;

    const selectedProducts = productCatalog.filter((product) => assignment.productAbbreviations.includes(product.abbreviation));

    setVehicles((previous) =>
      previous.map((vehicle) => {
        if (!assignment.vehicleIds.includes(vehicle.vehicleId)) {
          return vehicle;
        }

        const existing = new Set(vehicle.products.map((product) => product.abbreviation));
        const additions = selectedProducts.filter((product) => !existing.has(product.abbreviation));
        return additions.length ? { ...vehicle, products: [...vehicle.products, ...additions] } : vehicle;
      }),
    );

    setProductStatusByVehicle((previous) => {
      const next = { ...previous };

      assignment.vehicleIds.forEach((vehicleId) => {
        const current = { ...(next[vehicleId] ?? {}) };
        assignment.productAbbreviations.forEach((abbreviation) => {
          current[abbreviation] = assignment.status;
        });
        next[vehicleId] = current;
      });

      return next;
    });

    setIsProductModalOpen(false);
    setModalTargetVehicleIds([]);
  };

  const renderProductStatusTags = (vehicle: Vehicle) => {
    if (!vehicle.products.length) {
      return <span style={{ color: '#9ca3af' }}>No products</span>;
    }

    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
        {vehicle.products.map((product) => {
          const status = productStatusByVehicle[vehicle.vehicleId]?.[product.abbreviation] ?? getDefaultProductStatus(vehicle, product);
          const color = productStatusColors[status];

          return (
            <span
              key={`${vehicle.vehicleId}-${product.abbreviation}`}
              title={`${product.fullName}: ${color.label}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '4px 8px',
                borderRadius: 999,
                border: `1px solid ${color.border}`,
                background: color.bg,
                color: color.text,
                fontSize: 11,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: 0.4,
              }}
            >
              {formatProductShortCode(product.abbreviation)}
            </span>
          );
        })}
      </div>
    );
  };

  return (
    <div style={{ width: '100%', maxWidth: 'none', margin: 0, overflowX: 'hidden' }}>
      <header style={{ marginBottom: 24 }}>
        <p style={{ margin: 0, color: '#6b7280', letterSpacing: 1.2, textTransform: 'uppercase', fontSize: 12 }}>Vehicles</p>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 24, flexWrap: 'wrap' }}>
          <h1 style={{ margin: '8px 0 0', fontSize: 42, lineHeight: 1.1 }}>Available Vehicles</h1>
          <div style={{ color: '#6b7280', fontSize: 13 }}>Showing {filteredVehicles.length} vehicles</div>
        </div>
      </header>

      <div
        style={{
          width: '100%',
          maxWidth: '100%',
          display: 'flex',
          alignItems: 'stretch',
          gap: 0,
          minWidth: 0,
          overflow: 'hidden',
          background: '#fff',
          border: '1px solid #e5e7eb',
          borderRadius: 18,
          boxSizing: 'border-box',
        }}
      >
        <div style={{ flex: '1 1 0', minWidth: 0, overflow: 'hidden' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 16, minWidth: 0, padding: '0 10px', width: '100%' }}>
          <label style={{ display: 'grid', gap: 8, flex: '1 1 220px', minWidth: 0, maxWidth: '100%' }}>
          <span style={{ fontSize: 12, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 1.1 }}>Search</span>
          <input
            type="text"
            placeholder="Search by vehicle, VIN, customer, make, or model"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 10,
              border: '1px solid #d1d5db',
              background: '#fff',
              fontSize: 14,
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          </label>

          <label style={{ display: 'grid', gap: 8, minWidth: 0, flex: '1 1 160px', maxWidth: '100%' }}>
          <span style={{ fontSize: 12, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 1.1 }}>Customer</span>
          <select
            value={customerFilter}
            onChange={(event) => setCustomerFilter(event.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 10,
              border: '1px solid #d1d5db',
              background: '#fff',
              fontSize: 14,
              boxSizing: 'border-box',
            }}
          >
            {customerOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          </label>

          <label style={{ display: 'grid', gap: 8, minWidth: 0, flex: '1 1 140px', maxWidth: '100%' }}>
          <span style={{ fontSize: 12, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 1.1 }}>Make</span>
          <select
            value={makeFilter}
            onChange={(event) => setMakeFilter(event.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 10,
              border: '1px solid #d1d5db',
              background: '#fff',
              fontSize: 14,
              boxSizing: 'border-box',
            }}
          >
            {makeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          </label>

          <label style={{ display: 'grid', gap: 8, minWidth: 0, flex: '1 1 140px', maxWidth: '100%' }}>
          <span style={{ fontSize: 12, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 1.1 }}>Model</span>
          <select
            value={modelFilter}
            onChange={(event) => setModelFilter(event.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 10,
              border: '1px solid #d1d5db',
              background: '#fff',
              fontSize: 14,
              boxSizing: 'border-box',
            }}
          >
            {modelOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          </label>

          <label style={{ display: 'grid', gap: 8, minWidth: 0, flex: '1 1 150px', maxWidth: '100%' }}>
          <span style={{ fontSize: 12, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 1.1 }}>Activity</span>
          <select
            value={activityFilter}
            onChange={(event) => setActivityFilter(event.target.value as ActivityFilter)}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 10,
              border: '1px solid #d1d5db',
              background: '#fff',
              fontSize: 14,
              boxSizing: 'border-box',
            }}
          >
            {activityOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          </label>

          <label style={{ display: 'grid', gap: 8, minWidth: 0, flex: '1 1 130px', maxWidth: '100%' }}>
          <span style={{ fontSize: 12, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 1.1 }}>Year</span>
          <select
            value={yearFilter}
            onChange={(event) => setYearFilter(event.target.value as YearFilter)}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 10,
              border: '1px solid #d1d5db',
              background: '#fff',
              fontSize: 14,
              boxSizing: 'border-box',
            }}
          >
            {yearOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          </label>

          <div style={{ display: 'grid', gap: 2, minWidth: 0, flex: '0 0 auto', alignSelf: 'end', marginBottom: 2 }}>
            <button
              type="button"
              onClick={() => openProductModalForVehicles(selectedVehicleIds)}
              disabled={selectedVehicleIds.length === 0}
              style={{
                padding: '7px 10px',
                borderRadius: 9,
                border: selectedVehicleIds.length ? '1px solid #bfdbfe' : '1px solid #e5e7eb',
                background: selectedVehicleIds.length ? '#eff6ff' : '#f9fafb',
                color: selectedVehicleIds.length ? '#1d4ed8' : '#9ca3af',
                fontSize: 10,
                fontWeight: 700,
                cursor: selectedVehicleIds.length ? 'pointer' : 'not-allowed',
                whiteSpace: 'nowrap',
              }}
            >
              Add products to selected
            </button>
            <div style={{ fontSize: 10, color: '#6b7280', textAlign: 'center' }}>
              {selectedVehicleIds.length > 0 ? `${selectedVehicleIds.length} selected` : '0 selected'}
            </div>
          </div>
        </div>

          <div style={{ position: 'relative', background: '#fff', overflow: 'hidden' }}>
            <div style={{ width: '100%', maxWidth: '100%', minWidth: 0, overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: 0, borderCollapse: 'collapse', tableLayout: 'fixed', fontSize: 12, lineHeight: 1.35 }}>
            <thead style={{ background: '#f9fafb', position: 'sticky', top: 0, zIndex: 1 }}>
              <tr>
                {visibleColumns.map((label) => (
                  <th
                    key={label}
                    style={{
                      textAlign: columnAlignments[label] ?? 'center',
                      padding: label === 'Select' ? '10px 8px' : '10px 10px',
                      fontSize: label === 'VIN' ? 11 : 10,
                      fontWeight: 600,
                      color: '#6b7280',
                      textTransform: 'uppercase',
                      letterSpacing: 0.6,
                      borderBottom: '1px solid #e5e7eb',
                      whiteSpace: 'nowrap',
                      width: label === 'Product Status' ? undefined : columnWidths[label] ?? undefined,
                      verticalAlign: 'middle',
                    }}
                  >
                    {label === 'Select' ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
                        <input
                          type="checkbox"
                          checked={allVisibleSelected}
                          onChange={handleToggleSelectAllVisible}
                          aria-label="Select all visible vehicles"
                        />
                      </span>
                    ) : (
                      label
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredVehicles.length > 0 ? (
                filteredVehicles.map((vehicle) => {
                  const customer = customers.find((entry) => entry.customerId === vehicle.customerId);
                  const isSelected = selectedVehicleId === vehicle.vehicleId;

                  return (
                    <tr
                      key={vehicle.vehicleId}
                      onClick={() => handleSelectVehicle(vehicle.vehicleId)}
                      style={{
                        cursor: 'pointer',
                        background: isSelected ? '#f0f6ff' : 'transparent',
                        transition: 'background 150ms ease',
                      }}
                      onMouseEnter={(event) => {
                        if (!isSelected) {
                          (event.currentTarget as HTMLElement).style.background = '#f9fafb';
                        }
                      }}
                      onMouseLeave={(event) => {
                        (event.currentTarget as HTMLElement).style.background = isSelected ? '#f0f6ff' : 'transparent';
                      }}
                    >
                      <td style={{ padding: '10px 8px', borderTop: '1px solid #e5e7eb', width: 44, textAlign: 'center' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
                          <input
                            type="checkbox"
                            checked={selectedVehicleIds.includes(vehicle.vehicleId)}
                            onChange={() => handleToggleVehicleSelection(vehicle.vehicleId)}
                            onClick={(event) => event.stopPropagation()}
                            aria-label={`Select ${vehicle.name}`}
                          />
                        </span>
                      </td>
                      <td style={{ padding: '10px 10px', borderTop: '1px solid #e5e7eb', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'center' }}>
                        <div style={{ fontWeight: 700, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'center' }} title={vehicle.name}>
                          {vehicle.name}
                        </div>
                      </td>
                      <td style={{ padding: '10px 10px', borderTop: '1px solid #e5e7eb', color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'center' }}>{customer?.name ?? vehicle.customerId}</td>
                      <td style={{ padding: '10px 10px', borderTop: '1px solid #e5e7eb', color: '#6b7280', fontFamily: 'monospace', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'center' }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block', textAlign: 'center' }} title={vehicle.vin}>{vehicle.vin}</span>
                      </td>
                      <td style={{ padding: '10px 10px', borderTop: '1px solid #e5e7eb', color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'center' }}>{vehicle.make}</td>
                      <td style={{ padding: '10px 10px', borderTop: '1px solid #e5e7eb', color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'center' }}>{vehicle.model}</td>
                      <td style={{ padding: '10px 10px', borderTop: '1px solid #e5e7eb', color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'center' }}>{vehicle.year}</td>
                      <td style={{ padding: '10px 10px', borderTop: '1px solid #e5e7eb', minWidth: 168, textAlign: 'center' }}>{renderProductStatusTags(vehicle)}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={visibleColumns.length} style={{ padding: '40px 16px', textAlign: 'center', color: '#6b7280' }}>
                    No vehicles match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
            </div>
          </div>
        </div>

        <div
          style={{
            flex: `0 0 ${drawerVisible ? drawerWidth : 0}px`,
            width: drawerVisible ? drawerWidth : 0,
            minWidth: drawerVisible ? drawerWidth : 0,
            maxWidth: drawerVisible ? drawerWidth : 0,
            borderLeft: drawerVisible ? '1px solid #e5e7eb' : 'none',
            background: '#fff',
            boxShadow: drawerVisible ? '-12px 0 24px rgba(15, 23, 42, 0.06)' : 'none',
            overflow: 'hidden',
            transition: 'width 220ms ease, min-width 220ms ease, max-width 220ms ease, border-left-color 220ms ease',
          }}
        >
          <VehicleDetailDrawer
            vehicle={selectedVehicle}
            isOpen={drawerVisible}
            onAddProducts={(vehicleId) => openProductModalForVehicles([vehicleId])}
          />
        </div>
      </div>

      <ProductAssignmentModal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        sourcePage="vehicles"
        customers={customers}
        vehicles={vehicles}
        products={productCatalog}
        presetVehicleIds={modalTargetVehicleIds}
        title="Assign products to vehicles"
        onConfirm={handleApplyProducts}
      />
    </div>
  );
}
