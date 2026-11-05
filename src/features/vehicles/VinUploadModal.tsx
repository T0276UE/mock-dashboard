import { useMemo, useState } from 'react';
import { parse } from 'csv-parse/browser/esm/sync';
import type { Customer } from '../../types/customer';

interface VinUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
}

interface RejectedRow {
  rowNumber: number;
  issues: string[];
}

interface ValidationSummary {
  totalRows: number;
  acceptedRows: number;
  rejectedRows: number;
}

interface ValidationResult {
  summary: ValidationSummary;
  rejected: RejectedRow[];
}

type ParsedRow = {
  vin?: string;
  customer?: string;
  customerID?: string;
  testVehicle?: string | boolean;
  make?: string;
  model?: string;
  year?: string;
};

function normalizeKey(value: string): string {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function normalizeCustomerName(value: string): string {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function parseBool(value: string | boolean | null | undefined): boolean {
  if (typeof value === 'boolean') return value;

  const normalized = String(value ?? '').trim().toLowerCase();
  if (!normalized) return false;
  if (['true', '1', 'yes', 'y'].includes(normalized)) return true;
  if (['false', '0', 'no', 'n'].includes(normalized)) return false;
  throw new Error(`Invalid boolean value: "${value}"`);
}

function parseHeaderRows(csvText: string): ParsedRow[] {
  const rows = parse(csvText, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true,
    relax_column_count: true,
  }) as Record<string, unknown>[];

  return rows.map((row) => {
    const entries = Object.entries(row);

    const getField = (aliases: string[]) => {
      const match = entries.find(([key]) => aliases.includes(normalizeKey(key)));
      return match ? match[1] : undefined;
    };

    return {
      vin: String(getField(['vin']) ?? ''),
      customer: String(getField(['customer']) ?? ''),
      customerID: String(getField(['customerid']) ?? ''),
      testVehicle: getField(['testvehicle', 'testing', 'test']) as string | boolean | undefined,
      make: String(getField(['make']) ?? ''),
      model: String(getField(['model']) ?? ''),
      year: String(getField(['year']) ?? ''),
    };
  });
}

function parsePositionalRows(csvText: string): ParsedRow[] {
  const rows = parse(csvText, {
    columns: false,
    skip_empty_lines: true,
    trim: true,
    bom: true,
    relax_column_count: true,
  }) as string[][];

  return rows.map((cols, index) => {
    if (!Array.isArray(cols) || cols.length < 1) {
      throw new Error(
        `Row ${index + 1}: expected VIN with optional customer and testVehicle columns.`,
      );
    }

    if (cols.length === 1) {
      return { vin: cols[0], customer: '', testVehicle: false };
    }

    if (cols.length === 2) {
      const maybeBool = String(cols[1] ?? '').trim().toLowerCase();
      if (['true', 'false', '1', '0', 'yes', 'no', 'y', 'n'].includes(maybeBool)) {
        return { vin: cols[0], customer: '', testVehicle: cols[1] };
      }

      return { vin: cols[0], customer: cols[1], testVehicle: false };
    }

    if (cols.length === 3) {
      const secondIsBool = ['true', 'false', '1', '0', 'yes', 'no', 'y', 'n'].includes(
        String(cols[1] ?? '').trim().toLowerCase(),
      );

      if (secondIsBool) {
        return { vin: cols[0], customer: '', testVehicle: cols[1], make: cols[2] };
      }

      return { vin: cols[0], customer: cols[1], testVehicle: cols[2] };
    }

    if (cols.length === 5) {
      return {
        vin: cols[0],
        customer: '',
        testVehicle: cols[1],
        make: cols[2],
        model: cols[3],
        year: cols[4],
      };
    }

    return {
      vin: cols[0],
      customer: cols[1],
      testVehicle: cols[2],
      make: cols[3],
      model: cols[4],
      year: cols[5],
    };
  });
}

function validateCsv(csvText: string, customerNameMap: Map<string, string>): ValidationResult {
  const headerRows = parseHeaderRows(csvText);
  const hasHeader = headerRows.length > 0 && !!headerRows[0].vin;
  const rows = hasHeader ? headerRows : parsePositionalRows(csvText);

  const rejected: RejectedRow[] = [];

  rows.forEach((row, index) => {
    const issues: string[] = [];
    const vin = String(row.vin ?? '').trim().toUpperCase();
    const customerRaw = String(row.customerID ?? row.customer ?? '').trim();

    if (!vin) {
      issues.push('VIN is required.');
    } else if (!/^[A-HJ-NPR-Z0-9]{11,17}$/.test(vin)) {
      issues.push('VIN must be 11-17 characters and exclude I/O/Q.');
    }

    let customerID = customerRaw;
    if (!/^CUST-\d+$/i.test(customerRaw)) {
      customerID = customerNameMap.get(normalizeCustomerName(customerRaw)) ?? '';
    }

    if (customerRaw && !customerID) {
      issues.push('customer/customerID was provided but did not map to a known customer.');
    }

    try {
      parseBool(row.testVehicle);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid testVehicle value.';
      issues.push(message);
    }

    const year = String(row.year ?? '').trim();
    if (year && !/^\d{4}$/.test(year)) {
      issues.push('year must be a 4-digit value when provided.');
    }

    if (issues.length) {
      rejected.push({ rowNumber: index + 1, issues });
    }
  });

  return {
    summary: {
      totalRows: rows.length,
      acceptedRows: rows.length - rejected.length,
      rejectedRows: rejected.length,
    },
    rejected,
  };
}

export default function VinUploadModal({ isOpen, onClose, customers }: VinUploadModalProps) {
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [fatalError, setFatalError] = useState<string | null>(null);

  const customerNameMap = useMemo(() => {
    const map = new Map<string, string>();
    customers.forEach((customer) => {
      map.set(normalizeCustomerName(customer.name), customer.customerId);
    });
    return map;
  }, [customers]);

  if (!isOpen) return null;

  const resetState = () => {
    setSelectedFileName(null);
    setValidationResult(null);
    setFatalError(null);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleFileUpload = async (file: File) => {
    setIsValidating(true);
    setFatalError(null);
    setValidationResult(null);
    setSelectedFileName(file.name);

    try {
      const csvText = await file.text();
      const result = validateCsv(csvText, customerNameMap);
      setValidationResult(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to parse CSV file.';
      setFatalError(message);
    } finally {
      setIsValidating(false);
    }
  };

  const isAccepted = Boolean(validationResult && validationResult.summary.rejectedRows === 0 && validationResult.summary.totalRows > 0);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Upload VIN CSV"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 160,
        padding: 16,
      }}
      onClick={handleClose}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        style={{
          width: 'min(760px, 96vw)',
          maxHeight: '90vh',
          overflow: 'auto',
          background: '#fff',
          border: '1px solid #dbe3ef',
          borderRadius: 12,
          boxShadow: '0 24px 60px rgba(15, 23, 42, 0.28)',
          padding: 20,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 30, lineHeight: 1.1 }}>Upload VIN CSV</h2>
            <p style={{ margin: '8px 0 0', color: '#64748b', fontSize: 13 }}>
              Supported formats: VIN+customer, VIN+customer+testVehicle, VIN+customer+testVehicle+make+model+year.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            style={{ border: 'none', background: 'transparent', fontSize: 28, lineHeight: 1, color: '#64748b', cursor: 'pointer' }}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div style={{ border: '1px dashed #cbd5e1', borderRadius: 10, padding: 18, background: '#f8fafc' }}>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
            <input
              type="file"
              accept=".csv,text/csv"
              style={{ display: 'none' }}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                void handleFileUpload(file);
              }}
            />
            <span
              style={{
                padding: '10px 14px',
                borderRadius: 8,
                border: '1px solid #bfdbfe',
                background: '#eff6ff',
                color: '#1d4ed8',
                fontWeight: 700,
                fontSize: 13,
              }}
            >
              Select CSV File
            </span>
            <span style={{ color: '#475569', fontSize: 13 }}>{selectedFileName ?? 'No file selected'}</span>
          </label>
        </div>

        {isValidating && <p style={{ marginTop: 14, color: '#475569' }}>Validating upload...</p>}

        {fatalError && (
          <div
            style={{
              marginTop: 14,
              padding: '10px 12px',
              borderRadius: 10,
              border: '1px solid #fecaca',
              background: '#fef2f2',
              color: '#991b1b',
              fontSize: 13,
            }}
          >
            {fatalError}
          </div>
        )}

        {validationResult && (
          <div style={{ marginTop: 14, display: 'grid', gap: 12 }}>
            <div
              style={{
                padding: '10px 12px',
                borderRadius: 10,
                border: isAccepted ? '1px solid #86efac' : '1px solid #fecaca',
                background: isAccepted ? '#ecfdf5' : '#fef2f2',
                color: isAccepted ? '#166534' : '#991b1b',
                fontWeight: 600,
              }}
            >
              {isAccepted ? '✔ Upload accepted. CSV validation passed.' : '✖ Upload rejected. Please review and re-upload.'}
              <div style={{ marginTop: 4, fontWeight: 500, fontSize: 12 }}>
                {validationResult.summary.acceptedRows} accepted / {validationResult.summary.rejectedRows} rejected / {validationResult.summary.totalRows} total
              </div>
            </div>

            {validationResult.rejected.length > 0 && (
              <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
                <div style={{ padding: '10px 12px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontWeight: 700, fontSize: 13 }}>
                  Rejection Reasons
                </div>
                <div style={{ maxHeight: 240, overflowY: 'auto' }}>
                  {validationResult.rejected.map((item) => (
                    <div key={`reject-${item.rowNumber}`} style={{ padding: '10px 12px', borderTop: '1px solid #f1f5f9' }}>
                      <div style={{ fontWeight: 700, fontSize: 12, color: '#0f172a' }}>Row {item.rowNumber}</div>
                      <ul style={{ margin: '6px 0 0', paddingLeft: 18, color: '#7f1d1d', fontSize: 12 }}>
                        {item.issues.map((issue) => (
                          <li key={`${item.rowNumber}-${issue}`}>{issue}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
