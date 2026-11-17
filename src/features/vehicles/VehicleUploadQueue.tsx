import { useMemo, useState } from 'react';
import { customers } from '../../data/customers';
import type { LocalVinUploadRecord } from './localVinCsv';

export interface VehicleUploadBatch {
  id: string;
  fileName: string;
  uploadedAt: string;
  uploaderName: string;
  insertedCount: number;
  records: LocalVinUploadRecord[];
}

interface VehicleUploadQueueProps {
  batches: VehicleUploadBatch[];
  onUpload: () => void;
  onRemoveBatch: (batchId: string) => void;
}

const cardStyle = {
  background: '#fff',
  border: '1px solid #dbe3ec',
  borderRadius: 12,
  boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
} as const;

function formatUploadedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

export default function VehicleUploadQueue({ batches, onUpload, onRemoveBatch }: VehicleUploadQueueProps) {
  const [search, setSearch] = useState('');
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(batches[0]?.id ?? null);

  const rows = useMemo(
    () => batches.flatMap((batch) => batch.records.map((record) => ({ batch, record }))),
    [batches],
  );
  const filteredRows = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    if (!normalized) return rows;

    return rows.filter(({ batch, record }) => {
      const customerName = customers.find((customer) => customer.customerId === record.customerId)?.name ?? '';
      return [batch.fileName, batch.uploaderName, record.vehicleId, record.vin, record.customerId, customerName, record.make, record.model]
        .join(' ')
        .toLowerCase()
        .includes(normalized);
    });
  }, [rows, search]);

  const uniqueCustomers = new Set(rows.map(({ record }) => record.customerId)).size;
  const selectedBatch = batches.find((batch) => batch.id === selectedBatchId) ?? null;

  if (batches.length === 0) {
    return (
      <section
        style={{
          ...cardStyle,
          minHeight: 480,
          display: 'grid',
          placeItems: 'center',
          padding: 32,
          textAlign: 'center',
        }}
      >
        <div style={{ maxWidth: 520 }}>
          <div
            aria-hidden="true"
            style={{
              width: 64,
              height: 64,
              margin: '0 auto 18px',
              borderRadius: 18,
              background: '#eff6ff',
              color: '#0563a7',
              display: 'grid',
              placeItems: 'center',
              fontSize: 30,
              border: '1px solid #dbeafe',
            }}
          >
            ⇧
          </div>
          <h2 style={{ margin: 0, color: '#172033', fontSize: 28, letterSpacing: -0.5 }}>No vehicle uploads are queued</h2>
          <p style={{ margin: '10px 0 22px', color: '#667085', fontSize: 14, lineHeight: 1.6 }}>
            Upload a CSV file from your computer. Valid records will be sent securely through Spring Boot and listed here for review.
          </p>
          <button type="button" onClick={onUpload} style={primaryButtonStyle}>
            Upload vehicles
          </button>
          <div style={{ marginTop: 12, color: '#98a2b3', fontSize: 12 }}>Supported: CSV · Known customer assignment required</div>
        </div>
      </section>
    );
  }

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
        {[
          { label: 'Queued uploads', value: batches.length, detail: 'Successfully transported' },
          { label: 'Vehicle records', value: rows.length, detail: 'Across all files' },
          { label: 'Customers', value: uniqueCustomers, detail: 'Known MVP accounts' },
          { label: 'Ready for review', value: rows.length, detail: 'No transport errors' },
        ].map((item) => (
          <div key={item.label} style={{ ...cardStyle, padding: '18px 20px' }}>
            <div style={{ color: '#667085', fontSize: 12, fontWeight: 600 }}>{item.label}</div>
            <div style={{ marginTop: 8, color: '#172033', fontSize: 28, lineHeight: 1, fontWeight: 750 }}>{item.value.toLocaleString()}</div>
            <div style={{ marginTop: 10, color: '#159947', fontSize: 12 }}>{item.detail}</div>
          </div>
        ))}
      </div>

      <div
        style={{
          border: '1px solid #dbeafe',
          borderRadius: 12,
          background: '#eff6ff',
          padding: '14px 18px',
          display: 'flex',
          gap: 12,
          alignItems: 'flex-start',
          color: '#344054',
        }}
      >
        <span style={{ color: '#0563a7', fontWeight: 800 }}>i</span>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700 }}>Uploaded records stay separate from the approved vehicle inventory.</div>
          <div style={{ marginTop: 3, color: '#667085', fontSize: 12 }}>Review each record here before the inventory ingestion workflow is added.</div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 360px', maxWidth: 560 }}>
          <span style={{ position: 'absolute', left: 14, top: 11, color: '#98a2b3' }}>⌕</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search filename, uploader, customer, or VIN..."
            style={{
              width: '100%',
              boxSizing: 'border-box',
              border: '1px solid #d0d9e5',
              borderRadius: 10,
              background: '#fff',
              padding: '11px 14px 11px 38px',
              color: '#172033',
              fontSize: 13,
              outline: 'none',
            }}
          />
        </div>
        <button type="button" onClick={onUpload} style={primaryButtonStyle}>Upload another file</button>
      </div>

      <section style={{ ...cardStyle, overflow: 'hidden' }}>
        <div style={{ padding: '18px 20px 14px', display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ margin: 0, color: '#172033', fontSize: 17 }}>Queued vehicles</h2>
            <p style={{ margin: '5px 0 0', color: '#667085', fontSize: 12 }}>Records successfully accepted by the backend upload endpoint.</p>
          </div>
          <div style={{ color: '#0563a7', fontSize: 12, fontWeight: 700 }}>{batches.length} uploads · {rows.length.toLocaleString()} records</div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: 900, borderCollapse: 'collapse', tableLayout: 'fixed' }}>
            <thead style={{ background: '#eef4fd' }}>
              <tr>
                {['File', 'Vehicle / VIN', 'Customer', 'Make / model', 'Uploaded by', 'Status'].map((label) => (
                  <th key={label} style={{ padding: '10px 14px', color: '#667085', fontSize: 11, fontWeight: 600, textAlign: 'left', borderTop: '1px solid #e4eaf2', borderBottom: '1px solid #e4eaf2' }}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredRows.map(({ batch, record }, index) => {
                const customer = customers.find((entry) => entry.customerId === record.customerId);
                const isSelected = selectedBatchId === batch.id;
                return (
                  <tr
                    key={`${batch.id}-${record.vehicleId}-${index}`}
                    onClick={() => setSelectedBatchId(batch.id)}
                    style={{ background: isSelected ? '#f5f9ff' : '#fff', cursor: 'pointer' }}
                  >
                    <td style={cellStyle}>
                      <div style={{ color: '#0563a7', fontWeight: 650, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={batch.fileName}>{batch.fileName}</div>
                      <div style={{ marginTop: 4, color: '#98a2b3', fontSize: 11 }}>{formatUploadedAt(batch.uploadedAt)}</div>
                    </td>
                    <td style={cellStyle}>
                      <div style={{ fontWeight: 700, color: '#172033' }}>{record.name || record.vehicleId}</div>
                      <div style={{ marginTop: 4, color: '#667085', fontFamily: 'ui-monospace, monospace', fontSize: 11 }}>{record.vin}</div>
                    </td>
                    <td style={cellStyle}>
                      <div style={{ color: '#172033' }}>{customer?.name ?? record.customerId}</div>
                      <div style={{ marginTop: 4, color: '#98a2b3', fontSize: 11 }}>{record.customerId}</div>
                    </td>
                    <td style={cellStyle}>{[record.make, record.model, record.year].filter(Boolean).join(' · ') || 'Not provided'}</td>
                    <td style={cellStyle}>{batch.uploaderName}</td>
                    <td style={cellStyle}>
                      <span style={{ display: 'inline-flex', padding: '5px 9px', borderRadius: 999, background: '#ecfdf3', border: '1px solid #abefc6', color: '#067647', fontSize: 11, fontWeight: 700 }}>Uploaded</span>
                    </td>
                  </tr>
                );
              })}
              {filteredRows.length === 0 && (
                <tr><td colSpan={6} style={{ padding: 36, textAlign: 'center', color: '#667085' }}>No queued vehicles match your search.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div style={{ padding: '14px 18px', borderTop: '1px solid #e4eaf2', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14 }}>
          <div style={{ color: '#667085', fontSize: 12 }}>{filteredRows.length.toLocaleString()} records shown</div>
          <button
            type="button"
            disabled={!selectedBatch}
            onClick={() => selectedBatch && onRemoveBatch(selectedBatch.id)}
            style={{
              padding: '9px 14px',
              borderRadius: 9,
              border: '1px solid #d0d9e5',
              background: '#fff',
              color: selectedBatch ? '#344054' : '#98a2b3',
              fontWeight: 650,
              fontSize: 12,
              cursor: selectedBatch ? 'pointer' : 'not-allowed',
            }}
          >
            Dismiss selected upload
          </button>
        </div>
      </section>
    </div>
  );
}

const primaryButtonStyle = {
  border: '1px solid #0563a7',
  borderRadius: 9,
  background: '#0563a7',
  color: '#fff',
  padding: '11px 20px',
  fontSize: 13,
  fontWeight: 700,
  cursor: 'pointer',
  boxShadow: '0 1px 2px rgba(15, 23, 42, 0.08)',
} as const;

const cellStyle = {
  padding: '14px',
  borderBottom: '1px solid #edf1f6',
  color: '#344054',
  fontSize: 12,
  verticalAlign: 'middle',
  overflow: 'hidden',
} as const;
