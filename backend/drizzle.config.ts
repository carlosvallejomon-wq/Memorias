import { defineConfig } from 'drizzle-kit';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL no está definida. Copia .env.example a .env y complétala.');
}

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  strict: true,
  verbose: true,
});
