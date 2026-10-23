#!/usr/bin/env node

import { initializeDatabase } from '../src/library/dbSetup.ts';
import { seedUsers, getUsers } from '../src/library/dbUsers.ts';

async function main() {
  try {
    await initializeDatabase();
    await seedUsers();
    const users = await getUsers();

    console.log('Database seeded successfully. Users inserted:');
    users.forEach((user) => {
      console.log(`- ${user.user_id}: ${user.name} (${user.email})`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Failed to seed users:', error);
    process.exit(1);
  }
}

main();
