import { describe, it, expect } from 'vitest'
import { scoreKpiResult, computeKpiCredit, contractMrc } from './kpi-scoring'

describe('scoreKpiResult', () => {
  it('returns null for empty input', () => {
    expect(scoreKpiResult({ resultType: 'numeric', targetValue: '99', targetOperator: 'gte' }, '')).toBeNull()
    expect(scoreKpiResult({ resultType: 'numeric', targetValue: '99', targetOperator: 'gte' }, null)).toBeNull()
  })

  it('scores binary KPIs', () => {
    expect(scoreKpiResult({ resultType: 'binary' }, '1')).toBe('met')
    expect(scoreKpiResult({ resultType: 'binary' }, '0')).toBe('breach')
  })

  it('returns null for a numeric KPI with no target', () => {
    expect(scoreKpiResult({ resultType: 'numeric', targetValue: null, targetOperator: 'gte' }, '50')).toBeNull()
  })

  it('scores gte: comfortably above target = met', () => {
    // 99.99 vs target 90 is ~11% clear of the threshold => met (not risk)
    expect(scoreKpiResult({ resultType: 'numeric', targetValue: '90', targetOperator: 'gte' }, '99.99')).toBe('met')
  })

  it('scores gte: just above target (within 5%) = risk', () => {
    // target 100, actual 104 => 4% over => risk
    expect(scoreKpiResult({ resultType: 'numeric', targetValue: '100', targetOperator: 'gte' }, '104')).toBe('risk')
  })

  it('scores gte: below target = breach', () => {
    expect(scoreKpiResult({ resultType: 'numeric', targetValue: '99', targetOperator: 'gte' }, '95')).toBe('breach')
  })

  it('scores lte correctly', () => {
    expect(scoreKpiResult({ resultType: 'numeric', targetValue: '15', targetOperator: 'lte' }, '12')).toBe('met')
    expect(scoreKpiResult({ resultType: 'numeric', targetValue: '15', targetOperator: 'lte' }, '20')).toBe('breach')
    // within 5% under the ceiling => risk (target 100, actual 97 => 3%)
    expect(scoreKpiResult({ resultType: 'numeric', targetValue: '100', targetOperator: 'lte' }, '97')).toBe('risk')
  })

  it('scores between correctly', () => {
    const kpi = { resultType: 'numeric', targetValue: '10', targetValueMax: '20', targetOperator: 'between' }
    expect(scoreKpiResult(kpi, '15')).toBe('met')
    expect(scoreKpiResult(kpi, '25')).toBe('breach')
    expect(scoreKpiResult(kpi, '5')).toBe('breach')
  })
})

describe('computeKpiCredit', () => {
  const base = { resultType: 'numeric', targetValue: '99', targetOperator: 'gte' as const }

  it('is zero when not a breach', () => {
    expect(computeKpiCredit({ kpi: { ...base, creditPercentMrc: '5' }, resultStatus: 'met', actualValue: '99', mrc: 10000 })).toBe(0)
    expect(computeKpiCredit({ kpi: { ...base, creditPercentMrc: '5' }, resultStatus: 'risk', actualValue: '99', mrc: 10000 })).toBe(0)
  })

  it('computes percent of MRC', () => {
    expect(computeKpiCredit({ kpi: { ...base, creditPercentMrc: '5' }, resultStatus: 'breach', actualValue: '90', mrc: 10000 })).toBe(500)
  })

  it('yields zero for percent-of-MRC when MRC is unknown', () => {
    expect(computeKpiCredit({ kpi: { ...base, creditPercentMrc: '5' }, resultStatus: 'breach', actualValue: '90', mrc: null })).toBe(0)
  })

  it('computes per-unit for binary (1 unit)', () => {
    expect(computeKpiCredit({ kpi: { resultType: 'binary', creditPerUnit: '500' }, resultStatus: 'breach', actualValue: '0', mrc: null })).toBe(500)
  })

  it('computes per-unit for numeric using shortfall magnitude', () => {
    // target 99, actual 96 => shortfall 3 => 3 * 200 = 600
    expect(computeKpiCredit({ kpi: { ...base, creditPerUnit: '200' }, resultStatus: 'breach', actualValue: '96', mrc: null })).toBe(600)
  })

  it('prefers percent-of-MRC over per-unit when both are present', () => {
    const kpi = { ...base, creditPercentMrc: '5', creditPerUnit: '999' }
    expect(computeKpiCredit({ kpi, resultStatus: 'breach', actualValue: '90', mrc: 10000 })).toBe(500)
  })

  it('applies an absolute cap', () => {
    const kpi = { ...base, creditPercentMrc: '50', creditCapAmount: '1000' }
    expect(computeKpiCredit({ kpi, resultStatus: 'breach', actualValue: '90', mrc: 10000 })).toBe(1000)
  })

  it('applies a percent-of-MRC cap', () => {
    // raw 50% of 10000 = 5000, cap 8% of 10000 = 800
    const kpi = { ...base, creditPercentMrc: '50', creditCapPercent: '8' }
    expect(computeKpiCredit({ kpi, resultStatus: 'breach', actualValue: '90', mrc: 10000 })).toBe(800)
  })

  it('never returns a negative amount', () => {
    expect(computeKpiCredit({ kpi: { ...base, creditPerUnit: '-100' }, resultStatus: 'breach', actualValue: '96', mrc: null })).toBe(0)
  })
})

describe('contractMrc', () => {
  it('prefers the explicit monthly value', () => {
    expect(contractMrc({ monthlyValue: '5000', annualValue: '120000' })).toBe(5000)
  })
  it('falls back to annual / 12', () => {
    expect(contractMrc({ monthlyValue: null, annualValue: '120000' })).toBe(10000)
  })
  it('returns null when neither is set', () => {
    expect(contractMrc({ monthlyValue: null, annualValue: null })).toBeNull()
    expect(contractMrc(null)).toBeNull()
  })
})
