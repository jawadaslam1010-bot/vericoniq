import { router } from '../trpc'
import { vendorsRouter } from './vendors'
import { contractsRouter } from './contracts'
import { kpisRouter } from './kpis'
import { keyTermsRouter } from './keyTerms'
import { submissionsRouter } from './submissions'
import { teamRouter } from './team'

export const appRouter = router({
  vendors: vendorsRouter,
  contracts: contractsRouter,
  kpis: kpisRouter,
  keyTerms: keyTermsRouter,
  submissions: submissionsRouter,
  team: teamRouter,
})

export type AppRouter = typeof appRouter
