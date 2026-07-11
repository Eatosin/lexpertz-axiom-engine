import { describe, it, expect } from 'vitest'

import { parseSseEvent, SseEventType } from '@/lib/api'

describe('api.ts', () => {
  describe('parseSseEvent', () => {
    it('parses a node_update event correctly', () => {
      const raw = 'event: node_update\ndata: {"node":"Librarian","status":"active"}\n\n'
      const result = parseSseEvent(raw)
      expect(result.type).toBe(SseEventType.node_update)
      expect(result.data).toEqual({ node: 'Librarian', status: 'active' })
    })

    it('parses a token event correctly', () => {
      const raw = 'event: token\ndata: {"text":"Hello world"}\n\n'
      const result = parseSseEvent(raw)
      expect(result.type).toBe(SseEventType.token)
      expect(result.data).toEqual({ text: 'Hello world' })
    })

    it('parses a clear event correctly', () => {
      const raw = 'event: clear\ndata: {"message":"retry_triggered"}\n\n'
      const result = parseSseEvent(raw)
      expect(result.type).toBe(SseEventType.clear)
      expect(result.data).toEqual({ message: 'retry_triggered' })
    })

    it('parses an audit_complete event with metrics', () => {
      const raw =
        'event: audit_complete\ndata: {"answer":"Verified","metrics":{"faithfulness":0.95,"relevance":0.88,"precision":0.92}}\n\n'
      const result = parseSseEvent(raw)
      expect(result.type).toBe(SseEventType.audit_complete)
      expect(result.data).toEqual({
        answer: 'Verified',
        metrics: { faithfulness: 0.95, relevance: 0.88, precision: 0.92 },
      })
    })

    it('parses an error event', () => {
      const raw = 'event: error\ndata: {"detail":"Backend Engine Disconnected"}\n\n'
      const result = parseSseEvent(raw)
      expect(result.type).toBe(SseEventType.error)
      expect(result.data).toEqual({ detail: 'Backend Engine Disconnected' })
    })

    it('parses a connected event (backend flush)', () => {
      const raw = 'event: connected\ndata: {"status":"established"}\n\n'
      const result = parseSseEvent(raw)
      expect(result.type).toBe(SseEventType.connected)
      expect(result.data).toEqual({ status: 'established' })
    })

    it('handles multi-line data fields', () => {
      const raw = 'event: token\ndata: {"text":"line1"}\ndata: {"text":"line2"}\n\n'
      const result = parseSseEvent(raw)
      expect(result.type).toBe(SseEventType.token)
      expect(result.data).toEqual({ text: 'line2' })
    })

    it('handles invalid JSON gracefully as plain text token', () => {
      const raw = 'event: token\ndata: plain text chunk\n\n'
      const result = parseSseEvent(raw)
      expect(result.type).toBe(SseEventType.token)
      expect(result.data).toEqual({ text: 'plain text chunk' })
    })

    it('handles empty chunk gracefully', () => {
      const result = parseSseEvent('')
      expect(result.type).toBe(SseEventType.unknown)
      expect(result.data).toEqual({})
    })

    it('returns unknown for unrecognized event types', () => {
      const raw = 'event: custom_thing\ndata: {"foo":"bar"}\n\n'
      const result = parseSseEvent(raw)
      expect(result.type).toBe(SseEventType.unknown)
    })
  })
})