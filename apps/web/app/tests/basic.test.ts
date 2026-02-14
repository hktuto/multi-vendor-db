import { describe, it, expect } from 'vitest'

describe('Basic Tests', () => {
  it('should pass a simple test', () => {
    expect(true).toBe(true)
  })

  it('should add numbers correctly', () => {
    expect(1 + 1).toBe(2)
  })
})