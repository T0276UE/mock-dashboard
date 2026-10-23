#!/bin/bash

DB_PATH="$(dirname "$0")/dashboard.db"

if [ -f "$DB_PATH" ]; then
  rm "$DB_PATH"
  echo "Database deleted: $DB_PATH"
else
  echo "Database file not found: $DB_PATH"
fi
