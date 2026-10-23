import fs from 'node:fs';
import path from 'node:path';
import sqlite3 from 'sqlite3';

const { Database } = sqlite3.verbose();

const dbDirectory = path.resolve(process.cwd(), 'data');

if (!fs.existsSync(dbDirectory)) {
  fs.mkdirSync(dbDirectory, { recursive: true });
}

export const DB_PATH = path.join(dbDirectory, 'dashboard.db');

export const db = new Database(DB_PATH);

export function runQuery<T = unknown>(query: string, params: unknown[] = []): Promise<T> {
  return new Promise((resolve, reject) => {
    db.all(query, params, (error, rows) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(rows as T);
    });
  });
}

export function closeDatabase(): Promise<void> {
  return new Promise((resolve, reject) => {
    db.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}
