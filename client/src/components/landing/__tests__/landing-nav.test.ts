import { describe, it, expect } from 'vitest'

import { groupNavItems, NAV_ITEMS, type NavItem } from '@/components/landing/landing-nav'

describe('landing-nav', () => {
  describe('groupNavItems', () => {
    it('always exposes primary items', () => {
      const { primary } = groupNavItems(NAV_ITEMS)
      const primaryTitles = primary.map((n) => n.title)
      expect(primaryTitles).toContain('Sign In')
      expect(primaryTitles.every((t) => typeof t === "string")).toBe(true)
    })

    it('moves secondary items into overflow beyond maxPrimary', () => {
      const inflated: NavItem[] = [
        { title: "A", href: "#a" },
        { title: "B", href: "#b" },
        { title: "C", href: "#c" },
        { title: "D", href: "#d" },
        { title: "E", href: "#e" },
      ]
      const { primary, overflow } = groupNavItems(inflated, { maxPrimary: 2 })
      expect(primary.length).toBe(2)
      expect(overflow.length).toBe(3)
    })

    it('keeps everything in primary when list is short', () => {
      const short: NavItem[] = [
        { title: "Home", href: "/" },
        { title: "Docs", href: "/docs" },
      ]
      const { primary, overflow } = groupNavItems(short)
      expect(primary.length).toBe(2)
      expect(overflow.length).toBe(0)
    })

    it('returns empty overflow when no items', () => {
      const { primary, overflow } = groupNavItems([])
      expect(primary).toEqual([])
      expect(overflow).toEqual([])
    })
  })
})
