import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

// DATABASE_URL must point to the Supabase transaction pooler
// Format: postgresql://postgres.[project-ref]:[password]@aws-0-ap-southeast-2.pooler.supabase.com:6543/postgres
//
// Lazy initialisation: the client is created on first use (at request time),
// not at module load time, so Next.js builds succeed without DATABASE_URL.

type DrizzleDb = ReturnType<typeof drizzle<typeof schema>>

let _client: postgres.Sql | null = null
let _db: DrizzleDb | null = null

function getDb(): DrizzleDb {
  if (_db) return _db

  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set')
  }

  _client = postgres(connectionString, {
    max: 1, // Serverless: single connection per invocation
    ssl: 'require',
  })
  _db = drizzle(_client, { schema })
  return _db
}

// Proxy so callers write `db.select()...` exactly as before
export const db = new Proxy({} as DrizzleDb, {
  get(_target, prop) {
    return (getDb() as any)[prop]
  },
})

export type DB = DrizzleDb
