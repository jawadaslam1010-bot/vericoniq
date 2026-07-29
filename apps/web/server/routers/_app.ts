import { router } from '../trpc'
import { vendorsRouter } from './vendors'
import { contractsRouter } from './contracts'
import { kpisRouter } from './kpis'
import { keyTermsRouter } from './keyTerms'
import { submissionsRouter } from './submissions'
import { teamRouter } from './team'
import { billingRouter } from './billing'

export const appRouter = router({
  vendors: vendorsRouter,
  contracts: contractsRouter,
  kpis: kpisRouter,
  keyTerms: keyTermsRouter,
  submissions: submissionsRouter,
  team: teamRouter,
  billing: billingRouter,
})

export type AppRouter = typeof appRouter
