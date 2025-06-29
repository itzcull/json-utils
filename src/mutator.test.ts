import { describe, it } from 'vitest'
import { removeJsonValueAtPointer, setJsonValueAtPointer } from './mutator'

describe(setJsonValueAtPointer.name, () => {
  it('should throw for invalid pointer', ({ expect }) => {
    expect(() => setJsonValueAtPointer({}, 'invalid', 1)).toThrow()
  })

  it('should throw an error for invalid objects', ({ expect }) => {
    const ref = '/a'
    const obj: any = null
    expect(() => setJsonValueAtPointer(obj, ref, 1)).toThrow(
      `Invalid JSON object: ${JSON.stringify(obj)}`,
    )
    const obj2: any = undefined
    expect(() => setJsonValueAtPointer(obj2, ref, 1)).toThrow(
      `Invalid JSON object: ${JSON.stringify(obj2)}`,
    )
    const obj3: any = 1
    expect(() => setJsonValueAtPointer(obj3, ref, 1)).toThrow(
      `Invalid JSON object: ${JSON.stringify(obj3)}`,
    )
    const obj4: any = 'string'
    expect(() => setJsonValueAtPointer(obj4, ref, 1)).toThrow(
      `Invalid JSON object: ${JSON.stringify(obj4)}`,
    )
    const obj5: any = true
    expect(() => setJsonValueAtPointer(obj5, ref, 1)).toThrow(
      `Invalid JSON object: ${JSON.stringify(obj5)}`,
    )
    const obj6: any = Symbol('symbol')
    expect(() => setJsonValueAtPointer(obj6, ref, 1)).toThrow(
      `Invalid JSON object: ${JSON.stringify(obj6)}`,
    )
  })

  it('should set a value in an empty object', ({ expect }) => {
    const obj = {}
    setJsonValueAtPointer(obj, '/a', 1)
    expect(obj).toEqual({ a: 1 })
  })

  it('should set a nested value', ({ expect }) => {
    const obj = { a: {} }
    setJsonValueAtPointer(obj, '/a/b/c', 2)
    expect(obj).toEqual({ a: { b: { c: 2 } } })
  })

  it('should overwrite an existing value', ({ expect }) => {
    const obj = { a: 1 }
    setJsonValueAtPointer(obj, '/a', 2)
    expect(obj).toEqual({ a: 2 })
  })

  it('should handle array indices', ({ expect }) => {
    const obj: any = { arr: [] }
    setJsonValueAtPointer(obj, '/arr/0', 'first')
    expect(obj).toEqual({ arr: ['first'] })
  })

  it('should handle multiple array indices', ({ expect }) => {
    const obj: any = { arr: [[]] }
    setJsonValueAtPointer(obj, '/arr/0/0', 'nested')
    expect(obj).toEqual({ arr: [['nested']] })
  })

  it('should work with keys containing special characters', ({ expect }) => {
    const obj = {}
    setJsonValueAtPointer(obj, '/a~1b', 'slash')
    expect(obj).toEqual({ 'a/b': 'slash' })
  })

  it('should handle empty string keys', ({ expect }) => {
    const obj = {}
    setJsonValueAtPointer(obj, '/', 'root')
    expect(obj).toEqual({ '': 'root' })
  })

  it('should work with numeric keys', ({ expect }) => {
    const obj = {}
    setJsonValueAtPointer(obj, '/123', 'numeric key')
    expect(obj).toEqual({ 123: 'numeric key' })
  })

  it('should handle very deep nesting', ({ expect }) => {
    const obj = {}
    setJsonValueAtPointer(obj, '/a/b/c/d/e/f/g/h/i/j', 'deep')
    expect(obj.a.b.c.d.e.f.g.h.i.j).toBe('deep')
  })

  it('should set a value in an existing nested structure', ({ expect }) => {
    const obj = { a: { b: { c: 1 } } }
    setJsonValueAtPointer(obj, '/a/b/d', 2)
    expect(obj).toEqual({ a: { b: { c: 1, d: 2 } } })
  })

  it('should throw error when setting undefined', ({ expect }) => {
    const obj = {}
    expect(() => setJsonValueAtPointer(obj, '/a', undefined)).toThrow()
  })

  it('should throw error when setting Date', ({ expect }) => {
    const obj = {}
    expect(() => setJsonValueAtPointer(obj, '/a', new Date())).toThrow()
  })

  it('should handle setting null', ({ expect }) => {
    const obj = {}
    setJsonValueAtPointer(obj, '/a', null)
    expect(obj).toEqual({ a: null })
  })

  it('should handle setting complex objects', ({ expect }) => {
    const obj = {}
    const complexValue = { x: 1, y: [2, 3], z: { w: 4 } }
    setJsonValueAtPointer(obj, '/complex', complexValue)
    expect(obj).toEqual({ complex: complexValue })
  })

  it('should handle references with no leading #', ({ expect }) => {
    const obj = {}
    setJsonValueAtPointer(obj, '/a', 1)
    expect(obj).toEqual({ a: 1 })
  })

  it('should create array if using numbered property', ({ expect }) => {
    const obj = {}
    setJsonValueAtPointer(obj, '/test/0', 1)
    expect(obj).toEqual({ test: [1] })
  })

  it('should throw an error for invalid JSON pointers', ({ expect }) => {
    const obj = {}
    expect(() => setJsonValueAtPointer(obj, 'invalid', 1)).toThrow()
  })

  it('should do nothing when trying to set a value on a non-object', ({ expect }) => {
    const obj: any = { a: 1 }
    setJsonValueAtPointer(obj, '/a/b', 2)
    expect(obj).toEqual({ a: 1 })
    setJsonValueAtPointer(obj, '/a/b/c', 'value')
    expect(obj).toEqual({ a: 1 })
    setJsonValueAtPointer(obj, '/a/0', 'value')
    expect(obj).toEqual({ a: 1 })
  })

  it('should throw if a cyclic reference is detected', ({ expect }) => {
    const obj: any = {}
    obj.self = obj
    expect(() => setJsonValueAtPointer(obj, '/self/a', 1)).toThrow()
  })
})

// removeJsonValueAtPointer tests
describe(removeJsonValueAtPointer.name, () => {
  it('should remove a value from a simple object', ({ expect }) => {
    const obj = { a: 1, b: 2, c: 3 }
    removeJsonValueAtPointer(obj, '/b')
    expect(obj).toEqual({ a: 1, c: 3 })
  })

  it('should remove a value from a nested object', ({ expect }) => {
    const obj = { a: { b: { c: 1, d: 2 } } }
    removeJsonValueAtPointer(obj, '/a/b/c')
    expect(obj).toEqual({ a: { b: { d: 2 } } })
  })

  it('should remove an element from an array', ({ expect }) => {
    const obj = { arr: [1, 2, 3, 4] }
    removeJsonValueAtPointer(obj, '/arr/1')
    expect(obj).toEqual({ arr: [1, 3, 4] })
  })

  it('should handle empty objects', ({ expect }) => {
    const obj = {}
    removeJsonValueAtPointer(obj, '/nonexistent')
    expect(obj).toEqual({})
  })

  it('should handle empty arrays', ({ expect }) => {
    const obj = { arr: [] }
    removeJsonValueAtPointer(obj, '/arr/0')
    expect(obj).toEqual({ arr: [] })
  })

  it('should handle root pointer', ({ expect }) => {
    const obj = { a: 1 }
    expect(() => removeJsonValueAtPointer(obj, '')).toThrow()
  })

  it('should handle non-existent paths', ({ expect }) => {
    const obj = { a: 1 }
    removeJsonValueAtPointer(obj, '/b/c')
    expect(obj).toEqual({ a: 1 })
  })

  it('should handle escaped characters in pointer', ({ expect }) => {
    const obj = { 'a/b': { 'c~d': 1 } }
    removeJsonValueAtPointer(obj, '/a~1b/c~0d')
    expect(obj).toEqual({ 'a/b': {} })
  })

  it('should throw an error for invalid JSON', ({ expect }) => {
    const invalidObj = 'not an object'
    // @ts-expect-error: Testing invalid input
    expect(() => removeJsonValueAtPointer(invalidObj, '/a')).toThrow()
  })

  it('should throw an error for invalid pointer', ({ expect }) => {
    const obj = { a: 1 }
    expect(() => removeJsonValueAtPointer(obj, 'invalid')).toThrow()
  })

  it('should handle complex nested structures', ({ expect }) => {
    const obj = {
      a: {
        b: [{ c: 1 }, { d: [1, 2, { e: 3 }] }],
      },
    }
    removeJsonValueAtPointer(obj, '/a/b/1/d/2/e')
    expect(obj).toEqual({
      a: {
        b: [{ c: 1 }, { d: [1, 2, {}] }],
      },
    })
  })

  it('should handle removal of last element in array', ({ expect }) => {
    const obj = { arr: [1, 2, 3] }
    removeJsonValueAtPointer(obj, '/arr/2')
    expect(obj).toEqual({ arr: [1, 2] })
  })

  it('should handle removal of first element in array', ({ expect }) => {
    const obj = { arr: [1, 2, 3] }
    removeJsonValueAtPointer(obj, '/arr/0')
    expect(obj).toEqual({ arr: [2, 3] })
  })

  it('should not modify object when removing non-existent array index', ({ expect }) => {
    const obj = { arr: [1, 2, 3] }
    removeJsonValueAtPointer(obj, '/arr/5')
    expect(obj).toEqual({ arr: [1, 2, 3] })
  })

  it('should handle nested arrays', ({ expect }) => {
    const obj = {
      arr: [
        [1, 2],
        [3, 4],
      ],
    }
    removeJsonValueAtPointer(obj, '/arr/1/0')
    expect(obj).toEqual({ arr: [[1, 2], [4]] })
  })

  it('should handle removal of entire nested structure', ({ expect }) => {
    const obj = { a: { b: { c: 1 } }, d: 2 }
    removeJsonValueAtPointer(obj, '/a')
    expect(obj).toEqual({ d: 2 })
  })

  it('should handle nested null values', ({ expect }) => {
    const obj = { a: { b: null } }
    removeJsonValueAtPointer(obj, '/a/b')
    expect(obj).toEqual({ a: {} })
  })
})
