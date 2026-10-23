import { db } from './db';

export function createSchema(): Promise<void> {
  return new Promise((resolve, reject) => {
    db.exec(
      `
        PRAGMA foreign_keys = ON;

        CREATE TABLE IF NOT EXISTS users (
          user_id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          email TEXT NOT NULL UNIQUE,
          manager_user_id TEXT,
          role TEXT NOT NULL DEFAULT 'user',
          permissions TEXT NOT NULL DEFAULT '[]',
          status TEXT NOT NULL DEFAULT 'active',
          last_login TEXT,
          is_active INTEGER NOT NULL DEFAULT 1,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY(manager_user_id) REFERENCES users(user_id)
        );

        CREATE TABLE IF NOT EXISTS customers (
          customer_id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          email TEXT NOT NULL,
          address TEXT,
          joined_at TEXT NOT NULL,
          owner_user_id TEXT NOT NULL,
          FOREIGN KEY(owner_user_id) REFERENCES users(user_id)
        );

        CREATE TABLE IF NOT EXISTS vehicles (
          vin TEXT PRIMARY KEY,
          make TEXT,
          model TEXT,
          year INTEGER
        );

        CREATE TABLE IF NOT EXISTS customer_access (
          user_id TEXT NOT NULL,
          customer_id TEXT NOT NULL,
          granted_by TEXT NOT NULL,
          PRIMARY KEY (user_id, customer_id),
          FOREIGN KEY(user_id) REFERENCES users(user_id),
          FOREIGN KEY(customer_id) REFERENCES customers(customer_id),
          FOREIGN KEY(granted_by) REFERENCES users(user_id)
        );

        CREATE TABLE IF NOT EXISTS products (
          product_id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS resources (
          resource_id TEXT PRIMARY KEY,
          resource_type TEXT NOT NULL,
          resource_arn TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS product_access (
          product_id TEXT NOT NULL,
          vin TEXT NOT NULL,
          resource_type TEXT,
          resource_arn TEXT,
          PRIMARY KEY (product_id, vin),
          FOREIGN KEY(product_id) REFERENCES products(product_id),
          FOREIGN KEY(vin) REFERENCES vehicles(vin)
        );
      `,
      (error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      },
    );
  });
}
