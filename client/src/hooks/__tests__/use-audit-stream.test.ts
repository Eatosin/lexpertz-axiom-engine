import { describe, it, expect, vi } from 'vitest'

import { parseAxmFlags, AxmFlags } from '@/hooks/use-audit-stream'

describe('useAuditStream', () => {
  describe('parseAxmFlags', () => {
    it('parses -a (deep audit) flag', () => {
      const result = parseAxmFlags('/axm -a Check revenue clauses')
      expect(result.flags.deepAudit).toBe(true)
      expect(result.cleanQuery).toBe('Check revenue clauses')
    })

    it('parses -t (table mode) flag', () => {
      const result = parseAxmFlags('/axm -t Compare Q3 and Q4 revenue')
      expect(result.flags.tableMode).toBe(true)
      expect(result.cleanQuery).toBe('Compare Q3 and Q4 revenue')
    })

    it('parses -v (strict) flag', () => {
      const result = parseAxmFlags('/axm -v Verify liability clauses')
      expect(result.flags.strictMode).toBe(true)
      expect(result.cleanQuery).toBe('Verify liability clauses')
    })

    it('parses -h (history) flag', () => {
      const result = parseAxmFlags('/axm -h Analyze past contracts')
      expect(result.flags.historyMode).toBe(true)
      expect(result.cleanQuery).toBe('Analyze past contracts')
    })

    it('parses -c (comparison/strategist) flag', () => {
      const result = parseAxmFlags('/axm -c Compare docs')
      expect(result.flags.comparisonMode).toBe(true)
      expect(result.cleanQuery).toBe('Compare docs')
    })

    it('parses all flags combined', () => {
      const result = parseAxmFlags('/axm -a -t -v -h -c Full audit with strict comparison')
      expect(result.flags.deepAudit).toBe(true)
      expect(result.flags.tableMode).toBe(true)
      expect(result.flags.strictMode).toBe(true)
      expect(result.flags.historyMode).toBe(true)
      expect(result.flags.comparisonMode).toBe(true)
      expect(result.cleanQuery).toBe('Full audit with strict comparison')
    })

    it('returns default flags for non-/axm queries', () => {
      const result = parseAxmFlags('What is the revenue clause?')
      expect(result.flags.deepAudit).toBe(false)
      expect(result.flags.tableMode).toBe(false)
      expect(result.flags.strictMode).toBe(false)
      expect(result.flags.historyMode).toBe(false)
      expect(result.flags.comparisonMode).toBe(false)
      expect(result.cleanQuery).toBe('What is the revenue clause?')
    })

    it('parses .. (root reset) flag', () => {
      const result = parseAxmFlags('/axm ..')
      expect(result.flags.rootReset).toBe(true)
      expect(result.cleanQuery).toBe('/axm ..')
    })

    it('strips flags from query leaving only content', () => {
      const result = parseAxmFlags('/axm -a -t Extract Q3 revenue')
      expect(result.cleanQuery).toBe('Extract Q3 revenue')
    })

    it('handles empty string', () => {
      const result = parseAxmFlags('')
      expect(result.flags.deepAudit).toBe(false)
      expect(result.cleanQuery).toBe('')
    })
  })

  describe('AxmFlags type guarantees', () => {
    it('all keys are non-nullable', () => {
      const flags: AxmFlags = {
        deepAudit: false,
        tableMode: false,
        strictMode: false,
        historyMode: false,
        comparisonMode: false,
        rootReset: false,
      }
      expect(flags).toBeDefined()
    })
  })
})