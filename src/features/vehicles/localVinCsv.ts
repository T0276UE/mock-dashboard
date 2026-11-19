import { parse } from 'csv-parse/browser/esm/sync';
import type { Customer } from '../../types/customer';

export interface LocalVinUploadRecord {
  vehicleId: string;
  customerId: string;
  pendingCustomerId: null;
  testvehicle: boolean;
  vin: string;
  name: string;
  make: string | null;
  model: string | null;
  year: string | null;
  timestamp: string;
  uploaderUserId: string | null;
}

export interface RejectedVinRow {
  rowNumber: number;
  issues: string[];
}

export interface LocalVinCsvResult {
  records: LocalVinUploadRecord[];
  rejected: RejectedVinRow[];
  summary: {
    totalRows: number;
    acceptedRows: number;
    rejectedRows: number;
  };
}

type ParsedRow = {
  vehicleId?: string;
  vin?: string;
  customer?: string;
  customerId?: string;
  testVehicle?: string | boolean;
  name?: string;
  make?: string;
  model?: string;
  year?: string;
};

function normalizeKey(value: string): string {
  return String(value ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function normalizeCustomerName(value: string): string {
  return String(value ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function parseBoolean(value: string | boolean | null | undefined): boolean {
  if (typeof value === 'boolean') return value;

  const normalized = String(value ?? '').trim().toLowerCase();
  if (!normalized) return false;
  if (['true', '1', 'yes', 'y'].includes(normalized)) return true;
  if (['false', '0', 'no', 'n'].includes(normalized)) return false;
  throw new Error(`Invalid boolean value: "${value}"`);
}

function optionalValue(value: unknown): string | null {
  const normalized = String(value ?? '').trim();
  return normalized || null;
}

function generatedVehicleName(vin: string): string {
  return vin.replace(/[^A-Z0-9]/g, '').slice(-7).padStart(7, '0');
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
    const getField = (aliases: string[]) =>
      entries.find(([key]) => aliases.includes(normalizeKey(key)))?.[1];

    return {
      vehicleId: String(getField(['vehicleid']) ?? ''),
      vin: String(getField(['vin']) ?? ''),
      customer: String(getField(['customer']) ?? ''),
      customerId: String(getField(['customerid']) ?? ''),
      testVehicle: getField(['testvehicle', 'testing', 'test']) as string | boolean | undefined,
      name: String(getField(['name', 'licenseplate', 'plate']) ?? ''),
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

  return rows.map((columns, index) => {
    if (!Array.isArray(columns) || columns.length < 1) {
      throw new Error(`Row ${index + 1}: expected VIN, customer, and optional vehicle fields.`);
    }

    if (columns.length === 1) return { vin: columns[0] };

    if (columns.length === 2) {
      const second = String(columns[1] ?? '').trim().toLowerCase();
      if (['true', 'false', '1', '0', 'yes', 'no', 'y', 'n'].includes(second)) {
        return { vin: columns[0], testVehicle: columns[1] };
      }
      return { vin: columns[0], customer: columns[1] };
    }

    if (columns.length === 3) {
      const second = String(columns[1] ?? '').trim().toLowerCase();
      if (['true', 'false', '1', '0', 'yes', 'no', 'y', 'n'].includes(second)) {
        return { vin: columns[0], testVehicle: columns[1], make: columns[2] };
      }
      return { vin: columns[0], customer: columns[1], testVehicle: columns[2] };
    }

    if (columns.length === 5) {
      return {
        vin: columns[0],
        testVehicle: columns[1],
        make: columns[2],
        model: columns[3],
        year: columns[4],
      };
    }

    return {
      vin: columns[0],
      customer: columns[1],
      testVehicle: columns[2],
      make: columns[3],
      model: columns[4],
      year: columns[5],
    };
  });
}

function hasCsvHeader(csvText: string): boolean {
  const firstRecord = parse(csvText, {
    columns: false,
    skip_empty_lines: true,
    trim: true,
    bom: true,
    to_line: 1,
  }) as string[][];

  return (firstRecord[0] ?? []).some((value) =>
    ['vin', 'customer', 'customerid', 'testvehicle', 'vehicleid'].includes(normalizeKey(value)),
  );
}

export function parseLocalVinCsv(
  csvText: string,
  customers: Pick<Customer, 'customerId' | 'name'>[],
  options: { uploaderUserId?: string | null; now?: Date } = {},
): LocalVinCsvResult {
  const rows = hasCsvHeader(csvText) ? parseHeaderRows(csvText) : parsePositionalRows(csvText);
  const customerNameToId = new Map(
    customers.map((customer) => [normalizeCustomerName(customer.name), customer.customerId.toUpperCase()]),
  );
  const knownCustomerIds = new Set(customers.map((customer) => customer.customerId.toUpperCase()));
  const timestamp = (options.now ?? new Date()).toISOString();
  const vehicleIdSeed = timestamp.replace(/[^0-9]/g, '').slice(0, 17);
  const records: LocalVinUploadRecord[] = [];
  const rejected: RejectedVinRow[] = [];

  rows.forEach((row, index) => {
    const issues: string[] = [];
    const vin = String(row.vin ?? '').trim().toUpperCase();
    const customerInput = String(row.customerId ?? row.customer ?? '').trim();
    const customerId = /^CUST-\d+$/i.test(customerInput)
      ? customerInput.toUpperCase()
      : customerNameToId.get(normalizeCustomerName(customerInput)) ?? '';

    if (!vin) issues.push('VIN is required.');
    else if (!/^[A-HJ-NPR-Z0-9]{11,17}$/.test(vin)) {
      issues.push('VIN must be 11-17 characters and exclude I/O/Q.');
    }

    if (!customerInput) issues.push('customer/customerID is required.');
    else if (!customerId || !knownCustomerIds.has(customerId)) {
      issues.push('customer/customerID did not map to a known customer.');
    }

    let testvehicle = false;
    try {
      testvehicle = parseBoolean(row.testVehicle);
    } catch (error) {
      issues.push(error instanceof Error ? error.message : 'Invalid testVehicle value.');
    }

    const year = optionalValue(row.year);
    if (year && !/^\d{4}$/.test(year)) issues.push('year must be a 4-digit value when provided.');

    if (issues.length > 0) {
      rejected.push({ rowNumber: index + 1, issues });
      return;
    }

    records.push({
      vehicleId: String(row.vehicleId ?? '').trim() || `LV-${vehicleIdSeed}-${String(index + 1).padStart(4, '0')}`,
      customerId,
      pendingCustomerId: null,
      testvehicle,
      vin,
      name: String(row.name ?? '').trim() || generatedVehicleName(vin),
      make: optionalValue(row.make),
      model: optionalValue(row.model),
      year,
      timestamp,
      uploaderUserId: options.uploaderUserId ?? null,
    });
  });

  return {
    records,
    rejected,
    summary: {
      totalRows: rows.length,
      acceptedRows: records.length,
      rejectedRows: rejected.length,
    },
  };
}
