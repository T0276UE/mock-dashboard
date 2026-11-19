import { useEffect, useMemo, useState } from 'react';
import { customers } from '../../../data/customers';
import ProductAssignmentModal from '../../../shared/components/ProductAssignmentModal';
import type { ProductAssignmentPayload, ProductAssignmentStatus } from '../../../shared/components/ProductAssignmentModal';
import type { Vehicle } from '../../../types/customer';
import { useUser } from '../../../context/UserContext';
import { userCanViewVehicle } from '../../management/components/rolePermissions';
import VehicleDetailDrawer from '../VehicleDetailDrawer';
import VehicleUploadQueue, { type VehicleUploadBatch } from '../VehicleUploadQueue';
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
import VinUploadModal, { type CompletedVinUpload } from '../VinUploadModal';
import './VehiclesPage.css';

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
  const [isVinUploadModalOpen, setIsVinUploadModalOpen] = useState(false);
  const [activeView, setActiveView] = useState<'inventory' | 'queue'>('inventory');
  const [uploadBatches, setUploadBatches] = useState<VehicleUploadBatch[]>([]);
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
  const filteredVehicleIds = useMemo(() => filteredVehicles.map((vehicle) => vehicle.vehicleId), [filteredVehicles]);
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
    setSelectedVehicleIds((previous) => {
      const next = previous.filter((vehicleId) => filteredVehicleIds.includes(vehicleId));
      if (next.length === previous.length && next.every((vehicleId, index) => vehicleId === previous[index])) {
        return previous;
      }
      return next;
    });
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

  const handleUploadComplete = (upload: CompletedVinUpload) => {
    const batch: VehicleUploadBatch = {
      id: globalThis.crypto?.randomUUID?.() ?? `upload-${Date.now()}`,
      fileName: upload.fileName,
      uploadedAt: upload.uploadedAt,
      uploaderName: currentUser?.name ?? 'Current user',
      insertedCount: upload.insertedCount,
      records: upload.records,
    };
    setUploadBatches((previous) => [batch, ...previous]);
    setActiveView('queue');
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
    <div className="vehicles-page">
      <header className="vehicles-page-header">
        <div>
          <p className="vehicles-page-eyebrow">Marketplace · Vehicles</p>
          <h1 className="vehicles-page-title">Vehicles</h1>
          <p className="vehicles-page-description">
            {activeView === 'inventory'
              ? 'Monitor vehicle health, assignments, and upload activity.'
              : 'Review uploaded vehicle records before they enter approved inventory.'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsVinUploadModalOpen(true)}
          className="vehicles-primary-button vehicles-page-upload-button"
        >
          Upload vehicles
        </button>
      </header>

      <div className="vehicles-view-tabs">
        {[
          { id: 'inventory' as const, title: 'Vehicle Inventory', detail: `Approved vehicles · ${visibleVehicles.length.toLocaleString()}`, icon: '▦' },
          { id: 'queue' as const, title: 'Upload Queue', detail: uploadBatches.length ? `${uploadBatches.reduce((sum, batch) => sum + batch.records.length, 0).toLocaleString()} uploaded records` : 'No queued uploads', icon: '⇧' },
        ].map((tab) => {
          const active = activeView === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveView(tab.id)}
              className={`vehicles-view-tab${active ? ' active' : ''}`}
            >
              <span className="vehicles-view-tab-icon">{tab.icon}</span>
              <span>
                <span className="vehicles-view-tab-title">{tab.title}</span>
                <span className="vehicles-view-tab-detail">{tab.detail}</span>
              </span>
            </button>
          );
        })}
      </div>

      {activeView === 'inventory' ? (
      <div className="vehicles-inventory-shell">
        <div className="vehicles-inventory-main">
          <div className="vehicles-filter-panel">
            <div className="vehicles-filter-heading-row">
              <div>
                <h2 className="vehicles-filter-title">Filter inventory</h2>
                <div className="vehicles-filter-summary">{filteredVehicles.length.toLocaleString()} of {visibleVehicles.length.toLocaleString()} vehicles shown</div>
              </div>
              <div className="vehicles-bulk-action">
                <span className="vehicles-selection-count">{selectedVehicleIds.length} selected</span>
                <button
                  type="button"
                  onClick={() => openProductModalForVehicles(selectedVehicleIds)}
                  disabled={selectedVehicleIds.length === 0}
                  className="vehicles-bulk-button"
                  style={{
                    border: selectedVehicleIds.length ? '1px solid #bfdbfe' : '1px solid #e0e5eb',
                    background: selectedVehicleIds.length ? '#eff6ff' : '#f5f7f9',
                    color: selectedVehicleIds.length ? '#1d4ed8' : '#98a2b3',
                    cursor: selectedVehicleIds.length ? 'pointer' : 'not-allowed',
                  }}
                >
                  Add products
                </button>
              </div>
            </div>
            <div className="vehicles-filter-grid">
          <label className="vehicles-filter-field">
          <span className="vehicles-filter-label">Search</span>
          <input
            type="text"
            placeholder="Search by vehicle, VIN, customer, make, or model"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="vehicles-filter-control"
          />
          </label>

          <label className="vehicles-filter-field">
          <span className="vehicles-filter-label">Customer</span>
          <select
            value={customerFilter}
            onChange={(event) => setCustomerFilter(event.target.value)}
            className="vehicles-filter-control"
          >
            {customerOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          </label>

          <label className="vehicles-filter-field">
          <span className="vehicles-filter-label">Make</span>
          <select
            value={makeFilter}
            onChange={(event) => setMakeFilter(event.target.value)}
            className="vehicles-filter-control"
          >
            {makeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          </label>

          <label className="vehicles-filter-field">
          <span className="vehicles-filter-label">Model</span>
          <select
            value={modelFilter}
            onChange={(event) => setModelFilter(event.target.value)}
            className="vehicles-filter-control"
          >
            {modelOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          </label>

          <label className="vehicles-filter-field">
          <span className="vehicles-filter-label">Activity</span>
          <select
            value={activityFilter}
            onChange={(event) => setActivityFilter(event.target.value as ActivityFilter)}
            className="vehicles-filter-control"
          >
            {activityOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          </label>

          <label className="vehicles-filter-field">
          <span className="vehicles-filter-label">Year</span>
          <select
            value={yearFilter}
            onChange={(event) => setYearFilter(event.target.value as YearFilter)}
            className="vehicles-filter-control"
          >
            {yearOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          </label>

            </div>
          </div>

          <div className="vehicles-table-region">
            <div className="vehicles-table-surface">
          <table className="vehicles-table">
            <thead>
              <tr>
                {visibleColumns.map((label) => (
                  <th
                    key={label}
                    style={{
                      textAlign: columnAlignments[label] ?? 'center',
                      width: label === 'Product Status' ? undefined : columnWidths[label] ?? undefined,
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
                      className={isSelected ? 'selected' : undefined}
                      style={{ cursor: 'pointer' }}
                    >
                      <td style={{ width: 44, textAlign: 'center' }}>
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
                      <td className="vehicles-table-cell-truncate">
                        <div className="vehicles-table-vehicle vehicles-table-cell-truncate" title={vehicle.name}>
                          {vehicle.name}
                        </div>
                      </td>
                      <td className="vehicles-table-cell-truncate">{customer?.name ?? vehicle.customerId}</td>
                      <td className="vehicles-table-vin vehicles-table-cell-truncate">
                        <span className="vehicles-table-cell-truncate" style={{ display: 'block' }} title={vehicle.vin}>{vehicle.vin}</span>
                      </td>
                      <td className="vehicles-table-cell-truncate">{vehicle.make}</td>
                      <td className="vehicles-table-cell-truncate">{vehicle.model}</td>
                      <td style={{ textAlign: 'center' }}>{vehicle.year}</td>
                      <td style={{ minWidth: 168, textAlign: 'center' }}>{renderProductStatusTags(vehicle)}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={visibleColumns.length} className="vehicles-table-empty">
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
      ) : (
        <VehicleUploadQueue
          batches={uploadBatches}
          onUpload={() => setIsVinUploadModalOpen(true)}
          onRemoveBatch={(batchId) => setUploadBatches((previous) => previous.filter((batch) => batch.id !== batchId))}
        />
      )}

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

      <VinUploadModal
        isOpen={isVinUploadModalOpen}
        onClose={() => setIsVinUploadModalOpen(false)}
        onUploadComplete={handleUploadComplete}
        customers={customers}
      />
    </div>
  );
}
