import { useMemo, useRef, useState } from 'react';
import { uploadLocalVinRecords } from '../../services/backendApi';
import type { Customer } from '../../types/customer';
import { parseLocalVinCsv, type LocalVinCsvResult } from './localVinCsv';

export interface CompletedVinUpload {
  fileName: string;
  uploadedAt: string;
  insertedCount: number;
  records: LocalVinCsvResult['records'];
}

interface VinUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadComplete: (upload: CompletedVinUpload) => void;
  customers: Customer[];
}

export default function VinUploadModal({ isOpen, onClose, onUploadComplete, customers }: VinUploadModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [selectedFileSize, setSelectedFileSize] = useState<number | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [validationResult, setValidationResult] = useState<LocalVinCsvResult | null>(null);
  const [fatalError, setFatalError] = useState<string | null>(null);
  const [uploadComplete, setUploadComplete] = useState<number | null>(null);

  const uploadCustomers = useMemo(
    () => customers.map(({ customerId, name }) => ({ customerId, name })),
    [customers],
  );

  if (!isOpen) return null;

  const resetState = () => {
    setSelectedFileName(null);
    setSelectedFileSize(null);
    setValidationResult(null);
    setFatalError(null);
    setUploadComplete(null);
    setIsUploading(false);
  };

  const handleClose = () => {
    if (isUploading) return;
    resetState();
    onClose();
  };

  const handleFileUpload = async (file: File) => {
    setIsValidating(true);
    setFatalError(null);
    setValidationResult(null);
    setUploadComplete(null);
    setSelectedFileName(file.name);
    setSelectedFileSize(file.size);

    try {
      const csvText = await file.text();
      setValidationResult(parseLocalVinCsv(csvText, uploadCustomers));
    } catch (error) {
      setFatalError(error instanceof Error ? error.message : 'Unable to parse CSV file.');
    } finally {
      setIsValidating(false);
    }
  };

  const handleTransport = async () => {
    if (!validationResult || validationResult.records.length === 0 || validationResult.rejected.length > 0 || !selectedFileName) return;

    setIsUploading(true);
    setFatalError(null);
    try {
      const response = await uploadLocalVinRecords(validationResult.records);
      setUploadComplete(response.insertedCount);
      onUploadComplete({
        fileName: selectedFileName,
        uploadedAt: new Date().toISOString(),
        insertedCount: response.insertedCount,
        records: validationResult.records,
      });
    } catch (error) {
      setFatalError(error instanceof Error ? error.message : 'The upload could not be completed.');
    } finally {
      setIsUploading(false);
    }
  };

  const isReady = Boolean(validationResult && validationResult.rejected.length === 0 && validationResult.records.length > 0);
  const previewRecords = validationResult?.records.slice(0, 5) ?? [];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Upload vehicle CSV"
      onClick={handleClose}
      style={{ position: 'fixed', inset: 0, zIndex: 160, display: 'grid', placeItems: 'center', padding: 20, background: 'rgba(15, 23, 42, 0.52)', backdropFilter: 'blur(2px)' }}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        style={{ width: 'min(820px, 96vw)', maxHeight: '92vh', overflow: 'auto', border: '1px solid #d9e2ec', borderRadius: 16, background: '#fff', boxShadow: '0 28px 72px rgba(15, 23, 42, 0.28)' }}
      >
        <div style={{ padding: '22px 24px 18px', borderBottom: '1px solid #e7edf4', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 20 }}>
          <div>
            <div style={{ color: '#0563a7', fontSize: 11, fontWeight: 750, letterSpacing: 1.2, textTransform: 'uppercase' }}>Vehicle upload</div>
            <h2 style={{ margin: '6px 0 0', color: '#172033', fontSize: 26, letterSpacing: -0.4 }}>Upload vehicle records</h2>
            <p style={{ margin: '7px 0 0', color: '#667085', fontSize: 13 }}>Select a CSV, review validation results, then securely transport the records through Spring Boot.</p>
          </div>
          <button type="button" onClick={handleClose} disabled={isUploading} aria-label="Close upload modal" style={{ width: 34, height: 34, flex: '0 0 auto', borderRadius: 9, border: '1px solid #e1e7ef', background: '#fff', color: '#667085', fontSize: 22, lineHeight: 1, cursor: isUploading ? 'not-allowed' : 'pointer' }}>×</button>
        </div>

        <div style={{ padding: 24, display: 'grid', gap: 18 }}>
          {uploadComplete !== null ? (
            <div style={{ minHeight: 360, display: 'grid', placeItems: 'center', textAlign: 'center' }}>
              <div style={{ maxWidth: 480 }}>
                <div style={{ width: 66, height: 66, margin: '0 auto 18px', display: 'grid', placeItems: 'center', borderRadius: 999, background: '#ecfdf3', border: '1px solid #abefc6', color: '#067647', fontSize: 30 }}>✓</div>
                <h3 style={{ margin: 0, color: '#172033', fontSize: 25 }}>Upload completed</h3>
                <p style={{ margin: '10px 0 0', color: '#667085', lineHeight: 1.6, fontSize: 14 }}><strong>{uploadComplete.toLocaleString()}</strong> vehicle records from <strong>{selectedFileName}</strong> were accepted and added to the upload queue.</p>
                <button type="button" onClick={handleClose} style={{ ...primaryButtonStyle, marginTop: 24 }}>View upload queue</button>
              </div>
            </div>
          ) : (
            <>
              <div
                onClick={() => !isUploading && fileInputRef.current?.click()}
                style={{ border: '1.5px dashed #9fb9d4', borderRadius: 14, background: selectedFileName ? '#f7fbff' : '#fbfdff', padding: '24px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 18, cursor: 'pointer' }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  style={{ display: 'none' }}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void handleFileUpload(file);
                    event.target.value = '';
                  }}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: 15, minWidth: 0 }}>
                  <div style={{ width: 48, height: 48, flex: '0 0 auto', display: 'grid', placeItems: 'center', borderRadius: 12, background: '#eaf4ff', color: '#0563a7', fontSize: 24 }}>⇧</div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ color: '#172033', fontSize: 14, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedFileName ?? 'Choose a vehicle CSV file'}</div>
                    <div style={{ marginTop: 5, color: '#667085', fontSize: 12 }}>{selectedFileSize === null ? 'CSV file · Customer assignment required' : `${(selectedFileSize / 1024).toFixed(1)} KB · Click to replace`}</div>
                  </div>
                </div>
                <span style={{ flex: '0 0 auto', border: '1px solid #c9d7e6', borderRadius: 9, background: '#fff', padding: '9px 13px', color: '#344054', fontSize: 12, fontWeight: 700 }}>Browse files</span>
              </div>

              {isValidating && <StatusBanner tone="info" title="Validating CSV" detail="Checking VIN format, customer assignments, and optional vehicle fields…" />}
              {fatalError && <StatusBanner tone="error" title="Upload could not be completed" detail={fatalError} />}

              {validationResult && (
                <>
                  <StatusBanner tone={isReady ? 'success' : 'error'} title={isReady ? 'CSV passed validation' : 'CSV needs attention'} detail={`${validationResult.summary.acceptedRows} accepted · ${validationResult.summary.rejectedRows} rejected · ${validationResult.summary.totalRows} total`} />

                  {previewRecords.length > 0 && (
                    <div style={{ border: '1px solid #dfe6ee', borderRadius: 12, overflow: 'hidden' }}>
                      <div style={{ padding: '12px 14px', borderBottom: '1px solid #e7edf4', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                        <span style={{ color: '#344054', fontSize: 12, fontWeight: 750 }}>Record preview</span>
                        <span style={{ color: '#667085', fontSize: 11 }}>Showing {previewRecords.length} of {validationResult.records.length}</span>
                      </div>
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', minWidth: 620, borderCollapse: 'collapse', fontSize: 12 }}>
                          <thead><tr style={{ background: '#eef4fd' }}>{['Vehicle', 'VIN', 'Customer', 'Make / model', 'Year'].map((label) => <th key={label} style={headerCellStyle}>{label}</th>)}</tr></thead>
                          <tbody>{previewRecords.map((record) => {
                            const customer = customers.find((entry) => entry.customerId === record.customerId);
                            return <tr key={record.vehicleId}>
                              <td style={previewCellStyle}>{record.name}</td>
                              <td style={{ ...previewCellStyle, fontFamily: 'ui-monospace, monospace' }}>{record.vin}</td>
                              <td style={previewCellStyle}>{customer?.name ?? record.customerId}</td>
                              <td style={previewCellStyle}>{[record.make, record.model].filter(Boolean).join(' ') || '—'}</td>
                              <td style={previewCellStyle}>{record.year ?? '—'}</td>
                            </tr>;
                          })}</tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {validationResult.rejected.length > 0 && (
                    <div style={{ border: '1px solid #fecdca', borderRadius: 12, overflow: 'hidden' }}>
                      <div style={{ padding: '11px 14px', background: '#fff4f2', color: '#b42318', fontSize: 12, fontWeight: 750 }}>Rejected rows</div>
                      <div style={{ maxHeight: 160, overflowY: 'auto' }}>
                        {validationResult.rejected.map((item) => <div key={item.rowNumber} style={{ padding: '10px 14px', borderTop: '1px solid #fee4e2', color: '#7a271a', fontSize: 12 }}><strong>Row {item.rowNumber}:</strong> {item.issues.join(' ')}</div>)}
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>

        {uploadComplete === null && (
          <div style={{ padding: '16px 24px', borderTop: '1px solid #e7edf4', background: '#fbfcfe', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14 }}>
            <div style={{ color: '#667085', fontSize: 12 }}>{isReady ? `${validationResult?.records.length ?? 0} records ready for transport` : 'Select a valid CSV to continue'}</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" onClick={handleClose} disabled={isUploading} style={secondaryButtonStyle}>Cancel</button>
              <button type="button" onClick={() => void handleTransport()} disabled={!isReady || isUploading} style={{ ...primaryButtonStyle, opacity: !isReady || isUploading ? 0.5 : 1, cursor: !isReady || isUploading ? 'not-allowed' : 'pointer' }}>
                {isUploading ? 'Uploading…' : `Upload ${validationResult?.records.length ?? 0} vehicles`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBanner({ tone, title, detail }: { tone: 'info' | 'success' | 'error'; title: string; detail: string }) {
  const colors = tone === 'success'
    ? { border: '#abefc6', bg: '#ecfdf3', title: '#067647', dot: '#17b26a' }
    : tone === 'error'
      ? { border: '#fecdca', bg: '#fff4f2', title: '#b42318', dot: '#f04438' }
      : { border: '#b2ddff', bg: '#eff8ff', title: '#175cd3', dot: '#2e90fa' };
  return <div style={{ border: `1px solid ${colors.border}`, borderRadius: 11, background: colors.bg, padding: '12px 14px', display: 'flex', gap: 10, alignItems: 'flex-start' }}><span style={{ marginTop: 4, width: 8, height: 8, borderRadius: 999, background: colors.dot, flex: '0 0 auto' }} /><div><div style={{ color: colors.title, fontSize: 13, fontWeight: 750 }}>{title}</div><div style={{ marginTop: 3, color: '#667085', fontSize: 12 }}>{detail}</div></div></div>;
}

const primaryButtonStyle = { border: '1px solid #0563a7', borderRadius: 9, background: '#0563a7', color: '#fff', padding: '10px 16px', fontSize: 12, fontWeight: 750, cursor: 'pointer' } as const;
const secondaryButtonStyle = { border: '1px solid #d0d9e5', borderRadius: 9, background: '#fff', color: '#344054', padding: '10px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer' } as const;
const headerCellStyle = { padding: '9px 12px', color: '#667085', fontSize: 10, fontWeight: 650, textAlign: 'left', borderBottom: '1px solid #dfe6ee' } as const;
const previewCellStyle = { padding: '10px 12px', color: '#344054', borderBottom: '1px solid #edf1f6', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } as const;
