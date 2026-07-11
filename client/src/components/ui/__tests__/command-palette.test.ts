import { describe, it, expect } from 'vitest'

import { parseSearchCommand, formatShortcut, getRecentCommands } from '@/components/ui/command-palette'

describe('command-palette', () => {
  describe('parseSearchCommand', () => {
    it('returns empty results for empty query', () => {
      const result = parseSearchCommand('')
      expect(result).toEqual([])
    })

    it('matches commands by title (case-insensitive)', () => {
      const result = parseSearchCommand('dashboard')
      expect(result.length).toBeGreaterThan(0)
      expect(result[0].id).toContain('dashboard')
    })

    it('matches commands by keyword', () => {
      const result = parseSearchCommand('audit')
      expect(result.length).toBeGreaterThan(0)
    })

    it('respects the category prefix filter (>:)', () => {
      const result = parseSearchCommand('>:navigation')
      expect(result.every((c: any) => c.category === 'Navigation')).toBe(true)
    })

    it('keeps the first token visible at the top of the list', () => {
      const result = parseSearchCommand('settings')
      expect(result[0]?.title.toLowerCase()).toContain('settings')
    })
  })

  describe('formatShortcut', () => {
    it('formats single modifier shortcut', () => {
      const result = formatShortcut('Ctrl+K')
      expect(result).toBe('Ctrl+K')
    })

    it('normalizes Cmd to Ctrl on Windows', () => {
      const result = formatShortcut('Cmd+K', 'win')
      expect(result).toBe('Ctrl+K')
    })

    it('preserves Cmd on macOS', () => {
      const result = formatShortcut('Cmd+K', 'mac')
      expect(result).toBe('Cmd+K')
    })

    it('returns input unchanged when platform unknown', () => {
      const result = formatShortcut('Alt+X')
      expect(result).toBe('Alt+X')
    })
  })

  describe('getRecentCommands', () => {
    it('returns at most n items', () => {
      const history = [{ id: 'cmd-1' }, { id: 'cmd-2' }, { id: 'cmd-3' }]
      const result = getRecentCommands(history, 2)
      expect(result.length).toBe(2)
    })

    it('returns full list when n >= length', () => {
      const history = [{ id: 'cmd-1' }]
      const result = getRecentCommands(history, 5)
      expect(result.length).toBe(1)
    })

    it('returns empty array for empty history', () => {
      const result = getRecentCommands([], 5)
      expect(result).toEqual([])
    })

    it('preserves order from history', () => {
      const history = [{ id: 'cmd-1' }, { id: 'cmd-2' }, { id: 'cmd-3' }]
      const result = getRecentCommands(history, 5)
      expect(result.map((r: any) => r.id)).toEqual(['cmd-1', 'cmd-2', 'cmd-3'])
    })
  })
})
