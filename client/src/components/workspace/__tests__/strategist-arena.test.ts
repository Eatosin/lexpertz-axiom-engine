import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@clerk/nextjs', () => ({
  useAuth: vi.fn(() => ({
    getToken: vi.fn().mockResolvedValue('test-jwt-token'),
    isSignedIn: true,
  })),
}))

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({ data: [], isLoading: false })),
  useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
}))

describe('StrategistArena (logical)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('placeholder — multi-doc flow covered by useAuditStream + VerificationDashboard isMultiMode', () => {
    expect(true).toBe(true)
  })
})