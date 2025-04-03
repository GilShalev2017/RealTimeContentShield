import * as dotenv from 'dotenv';
dotenv.config();

// Make sure DATABASE_URL exists
if (!process.env.DATABASE_URL) {
  console.error('Missing DATABASE_URL environment variable');
  console.log('Current environment variables:', process.env);
}