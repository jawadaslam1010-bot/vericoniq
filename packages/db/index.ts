export { db } from './client'
export type { DB } from './client'
export * from './schema'

// Re-export drizzle-orm operators so workspace packages don't need a direct dep
export { eq, and, or, not, isNull, isNotNull, desc, asc, count, ne, gte, lte, gt, lt, inArray, notInArray, like, ilike, sql } from 'drizzle-orm'
