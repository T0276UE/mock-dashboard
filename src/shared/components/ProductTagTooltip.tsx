import { useState } from 'react';

export interface ProductInfo {
  abbreviation: string;
  fullName: string;
}

interface ProductTagTooltipProps {
  products: ProductInfo[];
  columnCount?: number;
}

export function formatProductShortCode(value: string) {
  const normalized = value.trim().toUpperCase();
  if (!normalized) return '';

  const segments = normalized.split('-').filter(Boolean);
  if (segments.length >= 3) {
    return `${segments[1]}-${segments[2]}`;
  }

  return normalized;
}

export function ProductTagTooltip({ products, columnCount = 2 }: ProductTagTooltipProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  if (!products.length) {
    return <span style={{ color: '#9ca3af' }}>—</span>;
  }

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <div
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        style={{ display: 'flex', gap: 4, flexWrap: 'wrap', cursor: 'help' }}
      >
        {products.map((product) => (
          <span
            key={product.abbreviation}
            style={{
              padding: '3px 6px',
              borderRadius: 4,
              background: '#e0f2fe',
              color: '#0284c7',
              fontSize: 11,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
              cursor: 'inherit',
            }}
          >
            {formatProductShortCode(product.abbreviation)}
          </span>
        ))}
      </div>

      {showTooltip && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            marginTop: 8,
            background: '#fff',
            border: '1px solid #d1d5db',
            borderRadius: 10,
            padding: 12,
            boxShadow: '0 8px 16px rgba(0, 0, 0, 0.1)',
            zIndex: 50,
            minWidth: 220,
            display: 'grid',
            gridTemplateColumns: `repeat(${columnCount}, 1fr)`,
            gap: 8,
          }}
        >
          {products.map((product) => (
            <div key={product.abbreviation} style={{ fontSize: 12, color: '#374151' }}>
              <div style={{ fontWeight: 600, color: '#111827' }}>{formatProductShortCode(product.abbreviation)}</div>
              <div style={{ marginTop: 2, fontSize: 11, color: '#6b7280' }}>{product.fullName}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ProductTagTooltip;
