import 'dotenv/config'; // এটি আপনার .env ফাইলটি রিড করবে
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './migrations',
  dialect: 'turso', // 'sqlite' এর বদলে 'turso' হবে
  dbCredentials: {
    url: process.env.DATABASE_URL!,
    authToken: process.env.DATABASE_AUTH_TOKEN!,
  },
});