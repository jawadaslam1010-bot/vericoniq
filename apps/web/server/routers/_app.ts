import { router } from '../trpc'
import { vendorsRouter } from './vendors'
import { contractsRouter } from './contracts'
import { kpisRouter } from './kpis'
import { keyTermsRouter } from './keyTerms'
import { submissionsRouter } from './submissions'

export const appRouter = router({
  vendors: vendorsRouter,
  contracts: contractsRouter,
  kpis: kpisRouter,
  keyTerms: keyTermsRouter,
  submissions: submissionsRouter,
})

export type AppRouter = typeof appRouter
