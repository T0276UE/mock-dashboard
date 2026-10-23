#!/usr/bin/env node

import { initializeDatabase } from '../src/library/dbSetup.ts';

try {
  await initializeDatabase();
  console.log('Database created successfully');
  process.exit(0);
} catch (error) {
  console.error('Failed to create database:', error);
  process.exit(1);
}
