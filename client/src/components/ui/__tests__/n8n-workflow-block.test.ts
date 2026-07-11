import { describe, it, expect } from 'vitest'

import {
  buildAgentSeedGraph,
  buildUtilitySeedGraph,
  defaultConnections,
  type WorkflowNode,
} from '@/components/ui/n8n-workflow-block'

describe('n8n-workflow-block (logic)', () => {
  describe('buildAgentSeedGraph', () => {
    it('returns 5 nodes (5-node MoE)', () => {
      const nodes = buildAgentSeedGraph()
      expect(nodes.length).toBe(5)
    })

    it('includes the canonical agent sequence', () => {
      const nodes = buildAgentSeedGraph()
      const titles = nodes.map((n: any) => n.title)
      expect(titles).toContain('Librarian')
      expect(titles).toContain('Editor')
      expect(titles).toContain('Strategist')
      expect(titles).toContain('Architect')
      expect(titles).toContain('Prosecutor')
    })

    it('lays out nodes left-to-right with consistent spacing', () => {
      const nodes = buildAgentSeedGraph()
      const positions = nodes.map((n: any) => n.position.x)
      const sortedAsc = [...positions].sort((a, b) => a - b)
      expect(positions).toEqual(sortedAsc)
      const unique = new Set(positions)
      expect(unique.size).toBe(5)
    })
  })

  describe('buildUtilitySeedGraph', () => {
    it('returns at least 3 utility nodes when no overrides', () => {
      const nodes = buildUtilitySeedGraph()
      expect(nodes.length).toBeGreaterThanOrEqual(3)
    })
  })

  describe('defaultConnections', () => {
    it('connects N nodes with N-1 edges (linear chain)', () => {
      const nodes: WorkflowNode[] = [
        { id: 'a', type: 'trigger', title: 'A', description: '', icon: undefined as any, color: 'emerald', position: { x: 0, y: 0 } },
        { id: 'b', type: 'action', title: 'B', description: '', icon: undefined as any, color: 'blue', position: { x: 100, y: 0 } },
        { id: 'c', type: 'condition', title: 'C', description: '', icon: undefined as any, color: 'amber', position: { x: 200, y: 0 } },
      ]
      const edges = defaultConnections(nodes)
      expect(edges).toEqual([
        { from: 'a', to: 'b' },
        { from: 'b', to: 'c' },
      ])
    })

    it('returns empty array for 0/1 nodes', () => {
      expect(defaultConnections([])).toEqual([])
      const single: WorkflowNode[] = [
        { id: 'a', type: 'trigger', title: 'A', description: '', icon: undefined as any, color: 'emerald', position: { x: 0, y: 0 } },
      ]
      expect(defaultConnections(single)).toEqual([])
    })
  })
})
