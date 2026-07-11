import { describe, it, expect } from 'vitest'

// Lock down the icon registry used in our legal-of-brand-restricted lucide-react environment.
// lucide-react >=1.x dropped brand icons (Github, Twitter, Linkedin) per their trademark policy.
// We substitute non-brand icons and rely on aria-label / title for screen readers.

const REQUIRED_LUCIDE_ICONS = [
  "ShieldCheck",
  "X",
  "Code2",
  "Briefcase",
  "Globe",
  "Cpu",
  "Database",
  "Server",
] as const

describe('footer icon registry (lucide-react v1+ compatibility)', () => {
  it.each(REQUIRED_LUCIDE_ICONS)(
    'lucide-react exports %s (brand-icon substitute)',
    (name) => {
      // Dynamically require lucide-react to assert presence in current node_modules
      // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
      const lib = require('lucide-react')
      expect(typeof lib[name]).toBe('object')
    }
  )

  it('does NOT export removed brand icons', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
    const lib = require('lucide-react')
    // These were removed in lucide-react v1+; we must use substitutes instead
    expect(lib.Github).toBeUndefined?.()
    expect(lib.Twitter).toBeUndefined?.()
    expect(lib.Linkedin).toBeUndefined?.()
  })
})
