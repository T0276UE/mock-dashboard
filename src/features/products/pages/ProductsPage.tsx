import { useMemo, useState } from 'react';
import ProductAssignmentModal from '../../../shared/components/ProductAssignmentModal';
import { customers, vehicles } from '../../../data/customers';
import type { ProductInfo } from '../../../types/customer';
import {
  availabilityOptions,
  creationPrompts,
  featureOptions,
  getSortedProductRows,
  products,
  sampleProductRows,
} from '../productPageData';

export default function ProductsPage() {
  const [modalProductSku, setModalProductSku] = useState<string | null>(null);
  const [selectedProductName, setSelectedProductName] = useState<string | null>(sampleProductRows[0]?.product ?? null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [featureFilter, setFeatureFilter] = useState('All features');
  const [availabilityFilter, setAvailabilityFilter] = useState('All availability');
  const [sortOption, setSortOption] = useState('Most active');

  const modalProduct = products.find((product) => product.sku === modalProductSku) ?? null;

  const productCatalog = useMemo(() => {
    const map = new Map<string, ProductInfo>();
    products.forEach((product) => map.set(product.productInfo.abbreviation, product.productInfo));
    customers.forEach((customer) => {
      customer.products.forEach((product) => map.set(product.abbreviation, product));
    });
    return Array.from(map.values());
  }, []);

  const sortedRows = useMemo(() => {
    return getSortedProductRows(sampleProductRows, searchTerm, featureFilter, availabilityFilter, sortOption);
  }, [availabilityFilter, featureFilter, searchTerm, sortOption]);

  const selectedProductRow = sortedRows.find((row) => row.product === selectedProductName) ?? sortedRows[0] ?? null;

  const openAssignmentModal = (productName?: string) => {
    const productMatch = products.find((product) => product.name === productName) ?? products[0];
    if (!productMatch) return;
    setModalProductSku(productMatch.sku);
  };

  return (
    <div style={{ maxWidth: 1220, margin: '0 auto', display: 'grid', gap: 18 }}>
      <header style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <p style={{ margin: 0, color: '#6b7280', letterSpacing: 1.2, textTransform: 'uppercase', fontSize: 12 }}>Products</p>
          <h1 style={{ margin: '8px 0 0', fontSize: 42, lineHeight: 1.1 }}>Products</h1>
          <div style={{ marginTop: 6, color: '#64748b', fontSize: 16 }}>View available products and create</div>
        </div>
      </header>

      {savedMessage && <p style={{ margin: 0, color: '#166534', fontSize: 13 }}>{savedMessage}</p>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr)) 220px', gap: 14 }}>
        {creationPrompts.map((prompt, index) => (
          <div
            key={prompt}
            style={{
              background: '#f8fafc',
              border: '1px solid #e5e7eb',
              borderRadius: 14,
              minHeight: 116,
              padding: '18px 16px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ fontSize: 12, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1.1, marginBottom: 8 }}>
              Step {index + 1}
            </div>
            <div style={{ fontSize: 14, color: '#475569', lineHeight: 1.5 }}>{prompt}</div>
          </div>
        ))}

        <div
          style={{
            background: '#f8fafc',
            border: '1px solid #dbeafe',
            borderRadius: 14,
            minHeight: 116,
            padding: '18px 16px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ fontSize: 12, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1.1 }}>Create</div>
          <button
            type="button"
            style={{
              width: '100%',
              padding: '14px 12px',
              borderRadius: 10,
              border: 'none',
              background: '#005a9c',
              color: '#fff',
              fontWeight: 700,
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            Create product
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: 18, alignItems: 'start' }}>
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '16px 18px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: 14, color: '#374151', fontWeight: 700 }}>Available products · 127</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search products by name, category, or ID..."
                style={{
                  minWidth: 220,
                  padding: '8px 10px',
                  borderRadius: 8,
                  border: '1px solid #d1d5db',
                  fontSize: 13,
                }}
              />
              <select value={featureFilter} onChange={(event) => setFeatureFilter(event.target.value)} style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 13 }}>
                {featureOptions.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
              <select value={availabilityFilter} onChange={(event) => setAvailabilityFilter(event.target.value)} style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 13 }}>
                {availabilityOptions.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
              <select value={sortOption} onChange={(event) => setSortOption(event.target.value)} style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 13 }}>
                <option>Most active</option>
                <option>Least active</option>
                <option>A-Z</option>
              </select>
            </div>
          </div>

          <div style={{ overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: '#f8fafc' }}>
                <tr>
                  {['Product', 'Category / Delivery', 'Active', 'Paused', 'Disabled'].map((label) => (
                    <th key={label} style={{ textAlign: 'left', padding: '12px 16px', fontSize: 12, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.6, borderBottom: '1px solid #e5e7eb' }}>
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedRows.map((row) => (
                  <tr
                    key={row.product}
                    onClick={() => setSelectedProductName(row.product)}
                    style={{ borderBottom: '1px solid #eef2f7', cursor: 'pointer', background: selectedProductRow?.product === row.product ? '#f0f6ff' : 'transparent' }}
                  >
                    <td style={{ padding: '14px 16px', fontWeight: 600, color: '#1d4ed8' }}>{row.product}</td>
                    <td style={{ padding: '14px 16px', color: '#475569' }}>{row.category} / {row.delivery}</td>
                    <td style={{ padding: '14px 16px', color: '#475569' }}>{row.active}</td>
                    <td style={{ padding: '14px 16px', color: '#475569' }}>{row.paused}</td>
                    <td style={{ padding: '14px 16px', color: '#475569' }}>{row.disabled}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <aside style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h2 style={{ margin: 0, fontSize: 28 }}>Details</h2>
            <button
              type="button"
              onClick={() => openAssignmentModal(selectedProductRow?.product)}
              style={{
                padding: '8px 12px',
                borderRadius: 8,
                border: '1px solid #dbeafe',
                background: '#eff6ff',
                color: '#1d4ed8',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Add to vehicles
            </button>
          </div>

          {selectedProductRow ? (
            <>
              <div style={{ background: '#f8fafc', border: '1px solid #dbeafe', borderRadius: 10, padding: '10px 12px', marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.7 }}>PRD-{selectedProductRow.product.slice(0, 3).toUpperCase()}</div>
                <div style={{ fontWeight: 700, fontSize: 16, marginTop: 6 }}>{selectedProductRow.availability}</div>
              </div>

              <div style={{ marginBottom: 18 }}>
                <h3 style={{ margin: '0 0 10px', fontSize: 16 }}>{selectedProductRow.product}</h3>
                <div style={{ color: '#475569', lineHeight: 1.6 }}>Continuous engine, battery, diagnostic, and health signals for eligible connected vehicles.</div>
              </div>

              <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 14 }}>
                <h3 style={{ margin: '0 0 12px', fontSize: 16 }}>Product Information</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '10px 12px', fontSize: 13, color: '#475569' }}>
                  {[
                    ['Category', selectedProductRow.category],
                    ['Delivery', selectedProductRow.delivery],
                    ['Availability', selectedProductRow.availability],
                    ['Feature', selectedProductRow.feature],
                    ['Updated', 'Oct 9, 2026'],
                  ].map(([label, value]) => (
                    <>
                      <div key={`${label}-label`} style={{ color: '#64748b' }}>{label}</div>
                      <div key={`${label}-value`} style={{ fontWeight: 600, color: '#111827', textAlign: 'right' }}>{value}</div>
                    </>
                  ))}
                </div>
              </div>

              <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 14, marginTop: 16 }}>
                <h3 style={{ margin: '0 0 12px', fontSize: 16 }}>Vehicle Assignments</h3>
                <div style={{ display: 'grid', gap: 10 }}>
                  {[
                    ['Active', selectedProductRow.active, '#22c55e'],
                    ['Paused', selectedProductRow.paused, '#f59e0b'],
                    ['Disabled', selectedProductRow.disabled, '#ef4444'],
                  ].map(([label, count, color]) => (
                    <div key={label as string} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 8, height: 8, borderRadius: 999, background: color }} />
                        {label}
                      </span>
                      <span style={{ fontWeight: 700, color: '#111827' }}>{count}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 14, marginTop: 16 }}>
                <h3 style={{ margin: '0 0 12px', fontSize: 16 }}>Assignment Requirements</h3>
                <div style={{ display: 'grid', gap: 8, color: '#166534', fontSize: 12 }}>
                  {['Customer access', 'Vehicle compatibility', 'Valid consent state'].map((item) => (
                    <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ color: '#22c55e' }}>✓</span>
                      {item}
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => openAssignmentModal(selectedProductRow.product)}
                  style={{
                    marginTop: 16,
                    width: '100%',
                    padding: '11px 12px',
                    borderRadius: 10,
                    border: 'none',
                    background: '#005a9c',
                    color: '#fff',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Add product
                </button>
              </div>

              <button
                type="button"
                onClick={() => openAssignmentModal(selectedProductRow.product)}
                style={{
                  marginTop: 18,
                  width: '100%',
                  padding: '11px 12px',
                  borderRadius: 10,
                  border: 'none',
                  background: '#005a9c',
                  color: '#fff',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Add to vehicles
              </button>
            </>
          ) : (
            <div style={{ color: '#64748b', padding: '20px 6px' }}>Select a product to view details.</div>
          )}
        </aside>
      </div>

      <ProductAssignmentModal
        isOpen={Boolean(modalProduct)}
        onClose={() => setModalProductSku(null)}
        sourcePage="products"
        customers={customers}
        vehicles={vehicles}
        products={productCatalog}
        presetProductAbbreviations={modalProduct ? [modalProduct.productInfo.abbreviation] : []}
        title="Add product to vehicles"
        onConfirm={(assignment) => {
          const productLabel = modalProduct?.name ?? 'Product';
          setSavedMessage(`${productLabel} assigned to ${assignment.vehicleIds.length} vehicle${assignment.vehicleIds.length === 1 ? '' : 's'}.`);
          setModalProductSku(null);
        }}
      />
    </div>
  );
}
