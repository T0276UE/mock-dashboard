#!/bin/bash

cd "$(dirname "$0")/.."

node -e "
import { initializeDatabase } from './src/library/dbSetup.ts';

initializeDatabase()
  .then(() => {
    console.log('Database created successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed to create database:', error);
    process.exit(1);
  });
" --input-type=module
