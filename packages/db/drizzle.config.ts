import type { Config } from 'drizzle-kit'

export default {
  schema: './schema/index.ts',
  out: './migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  // ap-southeast-2 — never change this
  verbose: true,
  strict: true,
} satisfies Config
