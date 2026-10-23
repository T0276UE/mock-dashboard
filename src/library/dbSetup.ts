import { closeDatabase, db } from './db.ts';
import { createSchema } from './schema.ts';

export async function initializeDatabase() {
  await createSchema();
  return db;
}

export async function shutdownDatabase() {
  await closeDatabase();
}
