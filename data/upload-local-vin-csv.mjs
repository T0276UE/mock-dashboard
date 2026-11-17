#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { parse } from 'csv-parse/sync';
import { uploadLocalVinRecords as uploadRecordsThroughSpring } from './upload-local-vin-records.mjs';

const CUSTOMER_NAME_TO_ID = {
  motorq: 'CUST-000124',
  fleetco: 'CUST-000208',
  carvana: 'CUST-000311',
  leaseplan: 'CUST-000415',
  geotab: 'CUST-000509',
  drivenowautomotive: 'CUST-000622',
  supportco: 'CUST-000714',
  autofincorp: 'CUST-000801',
};
const CUSTOMER_IDS = new Set(Object.values(CUSTOMER_NAME_TO_ID));

function optionalEnv(name, fallbackName, defaultValue) {
  const fallback = fallbackName ? process.env[fallbackName] : undefined;
  const value = process.env[name] ?? fallback;
  if (value === undefined || value === null || String(value).trim() === '') return defaultValue;
  return String(value).trim();
}

function normalizeCsvKey(key) {
  return String(key ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function normalizeCustomerName(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function normalizeCustomerId(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return null;

  if (/^CUST-\d+$/i.test(raw)) {
    const customerId = raw.toUpperCase();
    return CUSTOMER_IDS.has(customerId) ? customerId : null;
  }

  const mapped = CUSTOMER_NAME_TO_ID[normalizeCustomerName(raw)];
  return mapped ?? null;
}

function parseBoolean(value) {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (!normalized) return false;
  if (['true', '1', 'yes', 'y'].includes(normalized)) return true;
  if (['false', '0', 'no', 'n'].includes(normalized)) return false;
  throw new Error(`Invalid boolean value for testVehicle: "${value}"`);
}

function makeLicensePlate(vin) {
  const suffix = String(vin).replace(/[^A-Za-z0-9]/g, '').slice(-7).toUpperCase();
  return suffix.padStart(7, '0');
}

function safeOptional(value) {
  const raw = String(value ?? '').trim();
  return raw || null;
}

function buildVehicleId(index, seed) {
  return `LV-${seed}-${String(index + 1).padStart(4, '0')}`;
}

function getFieldFromRow(row, aliases) {
  const entries = Object.entries(row);

  for (const [key, value] of entries) {
    const normalizedKey = normalizeCsvKey(key);
    if (aliases.includes(normalizedKey)) {
      return value;
    }
  }

  return undefined;
}

function parseHeaderCsvRecords(csvText) {
  return parse(csvText, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true,
    relax_column_count: true,
  });
}

function parsePositionalCsvRecords(csvText) {
  return parse(csvText, {
    columns: false,
    skip_empty_lines: true,
    trim: true,
    bom: true,
    relax_column_count: true,
  });
}

function parseRowsToLocalVinRecords(rows, uploaderUserID) {
  const timestamp = new Date().toISOString();
  const vehicleIdSeed = timestamp.replace(/[^0-9]/g, '').slice(0, 14);

  return rows.map((row, index) => {
    const vin = String(row.vin ?? '').trim().toUpperCase();
    if (!vin) {
      throw new Error(`Row ${index + 1}: VIN is required.`);
    }

    const customerID = normalizeCustomerId(row.customerID ?? row.customer);

    return {
      vehicleId: String(row.vehicleId ?? buildVehicleId(index, vehicleIdSeed)),
      customerID,
      pendingCustomerID: null,
      testvehicle: parseBoolean(row.testVehicle),
      vin,
      name: String(row.name ?? makeLicensePlate(vin)),
      make: safeOptional(row.make),
      model: safeOptional(row.model),
      year: safeOptional(row.year),
      timestamp,
      uploaderUserID,
    };
  });
}

function validateRowsToLocalVinRecords(rows, uploaderUserID) {
  const timestamp = new Date().toISOString();
  const vehicleIdSeed = timestamp.replace(/[^0-9]/g, '').slice(0, 14);
  const accepted = [];
  const rejected = [];

  rows.forEach((row, index) => {
    const rowNumber = index + 1;
    const issues = [];

    const vin = String(row.vin ?? '').trim().toUpperCase();
    if (!vin) {
      issues.push('VIN is required.');
    } else if (!/^[A-HJ-NPR-Z0-9]{11,17}$/.test(vin)) {
      issues.push('VIN must be 11-17 chars and exclude I/O/Q.');
    }

    const rawCustomer = String(row.customerID ?? row.customer ?? '').trim();
    const customerID = normalizeCustomerId(rawCustomer);
    if (!rawCustomer) {
      issues.push('customer/customerID is required.');
    } else if (!customerID) {
      issues.push('customer/customerID was provided but did not map to a valid customer ID.');
    }

    let parsedTestVehicle = false;
    try {
      parsedTestVehicle = parseBoolean(row.testVehicle);
    } catch (error) {
      issues.push(error instanceof Error ? error.message : 'Invalid testVehicle value.');
    }

    const normalizedYear = safeOptional(row.year);
    if (normalizedYear && !/^\d{4}$/.test(normalizedYear)) {
      issues.push('year must be a 4-digit value when provided.');
    }

    if (issues.length) {
      rejected.push({
        rowNumber,
        issues,
        raw: row,
      });
      return;
    }

    accepted.push({
      vehicleId: String(row.vehicleId ?? buildVehicleId(index, vehicleIdSeed)),
      customerID,
      pendingCustomerID: null,
      testvehicle: parsedTestVehicle,
      vin,
      name: String(row.name ?? makeLicensePlate(vin)),
      make: safeOptional(row.make),
      model: safeOptional(row.model),
      year: normalizedYear,
      timestamp,
      uploaderUserID,
    });
  });

  return {
    records: accepted,
    rejected,
    summary: {
      totalRows: rows.length,
      acceptedRows: accepted.length,
      rejectedRows: rejected.length,
    },
  };
}

function normalizeHeaderRecords(records) {
  return records.map((record) => ({
    vin: getFieldFromRow(record, ['vin']),
    customer: getFieldFromRow(record, ['customer']),
    customerID: getFieldFromRow(record, ['customerid']),
    testVehicle: getFieldFromRow(record, ['testvehicle', 'testing', 'test']),
    make: getFieldFromRow(record, ['make']),
    model: getFieldFromRow(record, ['model']),
    year: getFieldFromRow(record, ['year']),
    vehicleId: getFieldFromRow(record, ['vehicleid']),
    name: getFieldFromRow(record, ['name', 'licenseplate', 'plate']),
  }));
}

function normalizePositionalRecords(records) {
  return records.map((cols, index) => {
    if (!Array.isArray(cols)) {
      throw new Error(`Row ${index + 1}: invalid CSV row format.`);
    }

    if (cols.length < 1) {
      throw new Error(
        `Row ${index + 1}: unsupported CSV format. Expected VIN with optional customer and testVehicle columns.`,
      );
    }

    if (cols.length === 1) {
      return {
        vin: cols[0],
        customer: null,
        testVehicle: false,
        make: null,
        model: null,
        year: null,
      };
    }

    if (cols.length === 2) {
      const maybeBoolean = String(cols[1] ?? '').trim().toLowerCase();
      if (['true', 'false', '1', '0', 'yes', 'no', 'y', 'n'].includes(maybeBoolean)) {
        return {
          vin: cols[0],
          customer: null,
          testVehicle: cols[1],
          make: null,
          model: null,
          year: null,
        };
      }

      return {
        vin: cols[0],
        customer: cols[1],
        testVehicle: false,
        make: null,
        model: null,
        year: null,
      };
    }

    if (cols.length === 3) {
      const secondIsBool = ['true', 'false', '1', '0', 'yes', 'no', 'y', 'n'].includes(
        String(cols[1] ?? '').trim().toLowerCase(),
      );

      if (secondIsBool) {
        return {
          vin: cols[0],
          customer: null,
          testVehicle: cols[1],
          make: cols[2],
          model: null,
          year: null,
        };
      }

      return {
        vin: cols[0],
        customer: cols[1],
        testVehicle: cols[2],
        make: null,
        model: null,
        year: null,
      };
    }

    if (cols.length === 5) {
      return {
        vin: cols[0],
        customer: null,
        testVehicle: cols[1],
        make: cols[2],
        model: cols[3],
        year: cols[4],
      };
    }

    if (cols.length >= 6) {
      return {
        vin: cols[0],
        customer: cols[1],
        testVehicle: cols[2],
        make: cols[3],
        model: cols[4],
        year: cols[5],
      };
    }

    throw new Error(
      `Row ${index + 1}: unsupported CSV format. Expected 1, 2, 3, 5, or at least 6 columns.`,
    );
  });
}

export function parseLocalVinCsv(csvText, options = {}) {
  const uploaderUserID = String(options.uploaderUserID ?? optionalEnv('DATABRICKS_UPLOAD_USER_ID', undefined, 'SYSTEM_UPLOAD'));

  const headerRecords = parseHeaderCsvRecords(csvText);
  const hasHeaderFields =
    headerRecords.length > 0 &&
    Object.keys(headerRecords[0]).some((key) => ['vin', 'customer', 'customerid'].includes(normalizeCsvKey(key)));

  const normalizedRows = hasHeaderFields
    ? normalizeHeaderRecords(headerRecords)
    : normalizePositionalRecords(parsePositionalCsvRecords(csvText));

  return parseRowsToLocalVinRecords(normalizedRows, uploaderUserID);
}

export function validateLocalVinCsv(csvText, options = {}) {
  const uploaderUserID = String(options.uploaderUserID ?? optionalEnv('DATABRICKS_UPLOAD_USER_ID', undefined, 'SYSTEM_UPLOAD'));

  const headerRecords = parseHeaderCsvRecords(csvText);
  const hasHeaderFields =
    headerRecords.length > 0 &&
    Object.keys(headerRecords[0]).some((key) => ['vin', 'customer', 'customerid'].includes(normalizeCsvKey(key)));

  const normalizedRows = hasHeaderFields
    ? normalizeHeaderRecords(headerRecords)
    : normalizePositionalRecords(parsePositionalCsvRecords(csvText));

  return validateRowsToLocalVinRecords(normalizedRows, uploaderUserID);
}

function csvEscape(value) {
  const raw = String(value ?? '');
  const escaped = raw.replace(/"/g, '""');
  return `"${escaped}"`;
}

function rejectedRowsToCsv(rejectedRows) {
  const header = [
    'rowNumber',
    'issues',
    'vin',
    'customer',
    'customerID',
    'testVehicle',
    'make',
    'model',
    'year',
    'vehicleId',
    'name',
  ];

  const lines = [header.join(',')];

  rejectedRows.forEach((rejected) => {
    const row = rejected.raw ?? {};
    const values = [
      rejected.rowNumber,
      rejected.issues.join(' | '),
      row.vin ?? '',
      row.customer ?? '',
      row.customerID ?? '',
      row.testVehicle ?? '',
      row.make ?? '',
      row.model ?? '',
      row.year ?? '',
      row.vehicleId ?? '',
      row.name ?? '',
    ];

    lines.push(values.map((value) => csvEscape(value)).join(','));
  });

  return `${lines.join('\n')}\n`;
}

export async function writeValidationArtifacts(validationResult, options = {}) {
  const reportFile = options.reportFile ?? 'data/databricks/local_vin_upload_validation_report.json';
  const rejectedFile = options.rejectedFile ?? 'data/databricks/local_vin_rejected_rows.csv';

  const reportPath = path.resolve(process.cwd(), reportFile);
  const rejectedPath = path.resolve(process.cwd(), rejectedFile);

  const reportPayload = {
    generatedAt: new Date().toISOString(),
    sourceFile: options.sourceFile ?? null,
    summary: validationResult.summary,
    rejectedRows: validationResult.rejected,
  };

  await fs.mkdir(path.dirname(reportPath), { recursive: true });
  await fs.writeFile(reportPath, `${JSON.stringify(reportPayload, null, 2)}\n`, 'utf8');

  await fs.mkdir(path.dirname(rejectedPath), { recursive: true });
  await fs.writeFile(rejectedPath, rejectedRowsToCsv(validationResult.rejected), 'utf8');

  return {
    reportPath,
    rejectedPath,
  };
}

export async function uploadLocalVinRecords(records, options = {}) {
  const apiRecords = records.map((record) => ({
    vehicleId: record.vehicleId,
    customerId: record.customerID,
    pendingCustomerId: record.pendingCustomerID,
    testvehicle: record.testvehicle,
    vin: record.vin,
    name: record.name,
    make: record.make,
    model: record.model,
    year: record.year,
    timestamp: record.timestamp,
    uploaderUserId: record.uploaderUserID,
  }));

  const result = await uploadRecordsThroughSpring(apiRecords, {
    apiBaseUrl: options.apiBaseUrl,
    sessionCookie: options.sessionCookie,
    sessionUserId: options.sessionUserId ?? options.uploaderUserID,
  });

  return {
    endpoint: `${result.apiBaseUrl}${result.path}`,
    uploadedCount: result.insertedCount,
  };
}

export async function uploadLocalVinCsvFile(csvFilePath, options = {}) {
  const csvText = await fs.readFile(path.resolve(process.cwd(), csvFilePath), 'utf8');
  const records = parseLocalVinCsv(csvText, options);
  return uploadLocalVinRecords(records, {
    ...options,
    sessionUserId: options.sessionUserId ?? options.uploaderUserID,
  });
}

function parseArgs(argv) {
  const args = {
    file: null,
    uploader: optionalEnv('BACKEND_DEV_USER_ID', 'DATABRICKS_UPLOAD_USER_ID', ''),
    apiBaseUrl: optionalEnv('BACKEND_API_BASE_URL', 'VITE_BACKEND_API_BASE_URL', 'http://localhost:8080'),
    sessionCookie: optionalEnv('BACKEND_SESSION_COOKIE', undefined, ''),
    dryRun: false,
    validateOnly: false,
    strictReport: false,
    reportFile: 'data/databricks/local_vin_upload_validation_report.json',
    rejectedFile: 'data/databricks/local_vin_rejected_rows.csv',
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === '--file' && argv[i + 1]) {
      args.file = argv[i + 1];
      i += 1;
      continue;
    }

    if (arg === '--uploader' && argv[i + 1]) {
      args.uploader = argv[i + 1];
      i += 1;
      continue;
    }

    if (arg === '--api-base-url' && argv[i + 1]) {
      args.apiBaseUrl = argv[i + 1];
      i += 1;
      continue;
    }

    if (arg === '--session-cookie' && argv[i + 1]) {
      args.sessionCookie = argv[i + 1];
      i += 1;
      continue;
    }

    if (arg === '--dry-run') {
      args.dryRun = true;
    }

    if (arg === '--validate-only') {
      args.validateOnly = true;
    }

    if (arg === '--strict-report') {
      args.strictReport = true;
    }

    if (arg === '--report-file' && argv[i + 1]) {
      args.reportFile = argv[i + 1];
      i += 1;
      continue;
    }

    if (arg === '--rejected-file' && argv[i + 1]) {
      args.rejectedFile = argv[i + 1];
      i += 1;
      continue;
    }
  }

  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!args.file) {
    throw new Error('Missing required --file argument. Example: npm run databricks:upload-local-vin -- --file data/databricks/sample.csv');
  }

  if (!args.validateOnly && !args.dryRun && !args.uploader && !args.sessionCookie) {
    throw new Error('Missing backend session identity. Set BACKEND_DEV_USER_ID, pass --uploader <Neon user UUID>, or pass --session-cookie <JSESSIONID=...>.');
  }

  const csvText = await fs.readFile(path.resolve(process.cwd(), args.file), 'utf8');
  const validation = validateLocalVinCsv(csvText, { uploaderUserID: args.uploader });

  const shouldWriteArtifacts = args.validateOnly || args.strictReport || validation.summary.rejectedRows > 0;
  if (shouldWriteArtifacts) {
    const artifactPaths = await writeValidationArtifacts(validation, {
      sourceFile: args.file,
      reportFile: args.reportFile,
      rejectedFile: args.rejectedFile,
    });

    console.log(`Validation report written to ${artifactPaths.reportPath}`);
    console.log(`Rejected rows CSV written to ${artifactPaths.rejectedPath}`);
  }

  if (args.validateOnly) {
    console.log(
      `Validated ${validation.summary.totalRows} rows: ${validation.summary.acceptedRows} accepted, ${validation.summary.rejectedRows} rejected.`,
    );
    return;
  }

  if (args.strictReport && validation.summary.rejectedRows > 0) {
    throw new Error(`Strict validation failed: ${validation.summary.rejectedRows} row(s) rejected. Upload aborted.`);
  }

  if (validation.summary.rejectedRows > 0) {
    throw new Error(`Validation failed: ${validation.summary.rejectedRows} row(s) rejected. Use --validate-only or --strict-report for artifacts.`);
  }

  const records = validation.records;

  if (args.dryRun) {
    console.log(`Parsed ${records.length} records (dry-run).`);
    console.table(records.slice(0, 10));
    return;
  }

  const result = await uploadLocalVinRecords(records, {
    apiBaseUrl: args.apiBaseUrl,
    sessionCookie: args.sessionCookie || undefined,
    sessionUserId: args.uploader || undefined,
  });
  console.log(`Uploaded ${result.uploadedCount} records through ${result.endpoint}.`);
}

if (process.argv[1] && process.argv[1].includes('upload-local-vin-csv.mjs')) {
  main().catch((error) => {
    console.error('Local VIN CSV upload failed:', error);
    process.exit(1);
  });
}
