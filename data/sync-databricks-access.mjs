#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { DBSQLClient } from '@databricks/sql';

function requiredEnv(name, fallbackName) {
  const fallback = fallbackName ? process.env[fallbackName] : undefined;
  const value = process.env[name] ?? fallback;

  if (!value || !String(value).trim()) {
    const aliasText = fallbackName ? ` (or ${fallbackName})` : '';
    throw new Error(`Missing required environment variable: ${name}${aliasText}`);
  }

  return String(value).trim();
}

function optionalEnv(name, fallbackName, defaultValue) {
  const fallback = fallbackName ? process.env[fallbackName] : undefined;
  const value = process.env[name] ?? fallback;
  if (value === undefined || value === null || String(value).trim() === '') return defaultValue;
  return String(value).trim();
}

function normalizeHost(value) {
  return value.replace(/^https?:\/\//, '').replace(/\/$/, '');
}

function normalizeHttpPath(value) {
  const trimmed = value.trim();
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

function quoteIdentifier(value) {
  return `\`${value.replace(/`/g, '``')}\``;
}

function buildTableName(tableKey) {
  const catalog = optionalEnv('DATABRICKS_CATALOG', undefined, '');
  const schema = optionalEnv('DATABRICKS_SCHEMA', undefined, 'default');
  const table = optionalEnv(tableKey, undefined, tableKey === 'DATABRICKS_USERS_TABLE' ? 'users' : 'customer_access');

  const parts = [catalog, schema, table].filter(Boolean).map(quoteIdentifier);
  return parts.join('.');
}

function readField(row, ...keys) {
  const keyMap = new Map(Object.keys(row).map((key) => [key.toLowerCase(), key]));

  for (const key of keys) {
    const actual = keyMap.get(key.toLowerCase());
    if (actual) return row[actual];
  }

  return undefined;
}

function normalizeRole(value) {
  if (value === 'admin' || value === 'sysadmin' || value === 'user') return value;
  return 'user';
}

function normalizeStatus(value) {
  if (value === 'pending' || value === 'inactive' || value === 'active') return value;
  return 'active';
}

function normalizePermissions(value) {
  if (Array.isArray(value)) return JSON.stringify(value);
  if (value === null || value === undefined || String(value).trim() === '') return '[]';

  const stringValue = String(value).trim();
  if (stringValue.startsWith('[')) return stringValue;

  return JSON.stringify(
    stringValue
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
  );
}

function mapUsers(rows) {
  return rows.map((row) => {
    const role = normalizeRole(String(readField(row, 'role') ?? 'user').toLowerCase());

    return {
      user_id: String(readField(row, 'user_id')),
      name: String(readField(row, 'name') ?? ''),
      email: String(readField(row, 'email') ?? ''),
      manager_user_id: readField(row, 'manager_user_id') ?? null,
      role,
      permissions: normalizePermissions(readField(row, 'permissions')),
      status: normalizeStatus(String(readField(row, 'status') ?? 'active').toLowerCase()),
      last_login: readField(row, 'last_login') ?? null,
      is_active: Number(readField(row, 'is_active') ?? 1),
      created_at: String(readField(row, 'created_at') ?? new Date().toISOString()),
      updated_at: String(readField(row, 'updated_at') ?? new Date().toISOString()),
    };
  });
}

function mapCustomerAccess(rows) {
  return rows.map((row) => ({
    user_id: String(readField(row, 'user_id')),
    customer_id: String(readField(row, 'customer_id')),
    granted_by: String(readField(row, 'granted_by') ?? readField(row, 'user_id')),
  }));
}

async function runQuery(session, statement) {
  const operation = await session.executeStatement(statement, {
    runAsync: true,
    maxRows: 10000,
  });

  try {
    return await operation.fetchAll();
  } finally {
    await operation.close();
  }
}

async function main() {
  const isDiscoverMode = process.argv.includes('--discover');
  const host = normalizeHost(requiredEnv('DATABRICKS_SERVER_URL', 'VITE_DATABRICKS_SERVER_URL'));
  const httpPath = normalizeHttpPath(requiredEnv('DATABRICKS_HTTP_PATH', 'VITE_DATABRICKS_HTTP_PATH'));
  const token = requiredEnv('DATABRICKS_PERSONAL_ACCESS_TOKEN', undefined);

  const usersTable = buildTableName('DATABRICKS_USERS_TABLE');
  const customerAccessTable = buildTableName('DATABRICKS_CUSTOMER_ACCESS_TABLE');

  const usersQuery = `SELECT * FROM ${usersTable}`;
  const customerAccessQuery = `SELECT * FROM ${customerAccessTable}`;

  const client = new DBSQLClient();
  let session;

  try {
    await client.connect({
      host,
      path: httpPath,
      token,
    });

    session = await client.openSession();

    if (isDiscoverMode) {
      const configuredCatalog = optionalEnv('DATABRICKS_CATALOG', undefined, '');
      const configuredSchema = optionalEnv('DATABRICKS_SCHEMA', undefined, '');
      const namespaceRows = await runQuery(session, 'SELECT current_catalog() AS catalog_name, current_schema() AS schema_name');
      const tablesRows = await runQuery(session, 'SHOW TABLES');

      console.log('Current namespace:');
      console.table(namespaceRows);
      console.log(`Tables visible in current schema: ${tablesRows.length}`);
      console.table(tablesRows);

      if (configuredCatalog && configuredSchema) {
        const configuredNamespace = `${quoteIdentifier(configuredCatalog)}.${quoteIdentifier(configuredSchema)}`;

        try {
          const configuredTables = await runQuery(session, `SHOW TABLES IN ${configuredNamespace}`);
          console.log(`Tables visible in configured schema ${configuredCatalog}.${configuredSchema}: ${configuredTables.length}`);
          console.table(configuredTables);
        } catch (error) {
          console.error(`Failed to list tables for configured schema ${configuredCatalog}.${configuredSchema}:`, error);
        }
      }

      return;
    }

    const [usersRows, customerAccessRows] = await Promise.all([
      runQuery(session, usersQuery),
      runQuery(session, customerAccessQuery),
    ]);

    const users = mapUsers(usersRows);
    const customerAccess = mapCustomerAccess(customerAccessRows);

    const outputDir = path.resolve(process.cwd(), 'data', 'databricks');
    await fs.mkdir(outputDir, { recursive: true });

    await fs.writeFile(path.join(outputDir, 'users.json'), `${JSON.stringify(users, null, 2)}\n`, 'utf8');
    await fs.writeFile(path.join(outputDir, 'customer_access.json'), `${JSON.stringify(customerAccess, null, 2)}\n`, 'utf8');

    console.log(`Synced ${users.length} users and ${customerAccess.length} customer_access records from Databricks.`);
  } finally {
    if (session) {
      await session.close();
    }
    await client.close();
  }
}

main().catch((error) => {
  console.error('Databricks sync failed:', error);
  process.exit(1);
});
