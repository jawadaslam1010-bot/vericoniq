import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

// DATABASE_URL must point to the Supabase ap-southeast-2 transaction pooler
// Format: postgresql://postgres.[project-ref]:[password]@aws-0-ap-southeast-2.pooler.supabase.com:6543/postgres
const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set')
}

// Use connection pooling via Supabase transaction pooler
const queryClient = postgres(connectionString, {
  max: 1, // Serverless: single connection per invocation
  ssl: 'require',
})

export const db = drizzle(queryClient, { schema })
export type DB = typeof db
