import { describe, it } from 'vitest'
import { applyJsonPatch, deepEquals, getJsonDiff } from './compare'

describe(deepEquals.name, () => {
  it('should return true for identical primitives', ({ expect }) => {
    expect(deepEquals(1, 1)).toBe(true)
    expect(deepEquals('hello', 'hello')).toBe(true)
    expect(deepEquals(true, true)).toBe(true)
    expect(deepEquals(null, null)).toBe(true)
  })

  it('should return false for different primitives', ({ expect }) => {
    expect(deepEquals(1, 2)).toBe(false)
    expect(deepEquals('hello', 'world')).toBe(false)
    expect(deepEquals(true, false)).toBe(false)
    expect(deepEquals(null, 0)).toBe(false)
  })

  it('should compare simple objects', ({ expect }) => {
    expect(deepEquals({ a: 1 }, { a: 1 })).toBe(true)
    expect(deepEquals({ a: 1 }, { a: 2 })).toBe(false)
    expect(deepEquals({ a: 1 }, { b: 1 })).toBe(false)
    expect(deepEquals({ a: 1, b: 2 }, { b: 2, a: 1 })).toBe(true) // Order doesn't matter
  })

  it('should compare nested objects', ({ expect }) => {
    const obj1 = { user: { name: 'John', age: 30 } }
    const obj2 = { user: { name: 'John', age: 30 } }
    const obj3 = { user: { name: 'John', age: 31 } }

    expect(deepEquals(obj1, obj2)).toBe(true)
    expect(deepEquals(obj1, obj3)).toBe(false)
  })

  it('should compare arrays', ({ expect }) => {
    expect(deepEquals([1, 2, 3], [1, 2, 3])).toBe(true)
    expect(deepEquals([1, 2, 3], [1, 3, 2])).toBe(false) // Order matters in arrays
    expect(deepEquals([1, 2], [1, 2, 3])).toBe(false)
  })

  it('should compare nested arrays', ({ expect }) => {
    const arr1 = [{ id: 1 }, { id: 2 }]
    const arr2 = [{ id: 1 }, { id: 2 }]
    const arr3 = [{ id: 1 }, { id: 3 }]

    expect(deepEquals(arr1, arr2)).toBe(true)
    expect(deepEquals(arr1, arr3)).toBe(false)
  })

  it('should handle mixed types', ({ expect }) => {
    expect(deepEquals({}, [])).toBe(false)
    expect(deepEquals(null, undefined)).toBe(false)
    expect(deepEquals(0, false)).toBe(false)
    expect(deepEquals('', false)).toBe(false)
  })

  it('should handle complex nested structures', ({ expect }) => {
    const complex1 = {
      users: [
        { id: 1, name: 'Alice', tags: ['admin', 'user'] },
        { id: 2, name: 'Bob', tags: ['user'] },
      ],
      meta: { total: 2, page: 1 },
    }

    const complex2 = {
      users: [
        { id: 1, name: 'Alice', tags: ['admin', 'user'] },
        { id: 2, name: 'Bob', tags: ['user'] },
      ],
      meta: { total: 2, page: 1 },
    }

    const complex3 = {
      users: [
        { id: 1, name: 'Alice', tags: ['admin', 'user'] },
        { id: 2, name: 'Bob', tags: ['admin'] }, // Different tag
      ],
      meta: { total: 2, page: 1 },
    }

    expect(deepEquals(complex1, complex2)).toBe(true)
    expect(deepEquals(complex1, complex3)).toBe(false)
  })
})

describe(getJsonDiff.name, () => {
  it('should return empty array for identical objects', ({ expect }) => {
    const obj1 = { a: 1, b: 2 }
    const obj2 = { a: 1, b: 2 }
    expect(getJsonDiff(obj1, obj2)).toEqual([])
  })

  it('should detect replaced values', ({ expect }) => {
    const obj1 = { a: 1, b: 2 }
    const obj2 = { a: 1, b: 3 }
    const diff = getJsonDiff(obj1, obj2)
    expect(diff).toEqual([
      { op: 'replace', path: '/b', value: 3 },
    ])
  })

  it('should detect added properties', ({ expect }) => {
    const obj1 = { a: 1 }
    const obj2 = { a: 1, b: 2 }
    const diff = getJsonDiff(obj1, obj2)
    expect(diff).toEqual([
      { op: 'add', path: '/b', value: 2 },
    ])
  })

  it('should detect removed properties', ({ expect }) => {
    const obj1 = { a: 1, b: 2 }
    const obj2 = { a: 1 }
    const diff = getJsonDiff(obj1, obj2)
    expect(diff).toEqual([
      { op: 'remove', path: '/b' },
    ])
  })

  it('should handle nested object changes', ({ expect }) => {
    const obj1 = { user: { name: 'John', age: 30 } }
    const obj2 = { user: { name: 'Jane', age: 30 } }
    const diff = getJsonDiff(obj1, obj2)
    expect(diff).toEqual([
      { op: 'replace', path: '/user/name', value: 'Jane' },
    ])
  })

  it('should handle array changes', ({ expect }) => {
    const obj1 = { items: ['a', 'b', 'c'] }
    const obj2 = { items: ['a', 'x', 'c', 'd'] }
    const diff = getJsonDiff(obj1, obj2)
    expect(diff).toContainEqual({ op: 'replace', path: '/items/1', value: 'x' })
    expect(diff).toContainEqual({ op: 'add', path: '/items/3', value: 'd' })
  })

  it('should handle array item removal', ({ expect }) => {
    const obj1 = { items: ['a', 'b', 'c'] }
    const obj2 = { items: ['a', 'c'] }
    const diff = getJsonDiff(obj1, obj2)
    // When items are removed from array, it tracks individual changes
    expect(diff).toEqual([
      { op: 'replace', path: '/items/1', value: 'c' },
      { op: 'remove', path: '/items/2' },
    ])
  })

  it('should handle complete object replacement', ({ expect }) => {
    const obj1 = { data: { type: 'user', name: 'John' } }
    const obj2 = { data: { type: 'admin', role: 'super' } }
    const diff = getJsonDiff(obj1, obj2)
    // Should detect individual changes
    expect(diff).toContainEqual({ op: 'replace', path: '/data/type', value: 'admin' })
    expect(diff).toContainEqual({ op: 'remove', path: '/data/name' })
    expect(diff).toContainEqual({ op: 'add', path: '/data/role', value: 'super' })
  })

  it('should handle null values', ({ expect }) => {
    const obj1 = { a: 1, b: null }
    const obj2 = { a: null, b: 2 }
    const diff = getJsonDiff(obj1, obj2)
    expect(diff).toEqual([
      { op: 'replace', path: '/a', value: null },
      { op: 'replace', path: '/b', value: 2 },
    ])
  })
})

describe(applyJsonPatch.name, () => {
  it('should apply add operations', ({ expect }) => {
    const obj = { a: 1 }
    const result = applyJsonPatch(obj, [
      { op: 'add', path: '/b', value: 2 },
    ])
    expect(result).toEqual({ a: 1, b: 2 })
  })

  it('should apply replace operations', ({ expect }) => {
    const obj = { a: 1, b: 2 }
    const result = applyJsonPatch(obj, [
      { op: 'replace', path: '/b', value: 3 },
    ])
    expect(result).toEqual({ a: 1, b: 3 })
  })

  it('should apply remove operations', ({ expect }) => {
    const obj = { a: 1, b: 2 }
    const result = applyJsonPatch(obj, [
      { op: 'remove', path: '/b' },
    ])
    expect(result).toEqual({ a: 1 })
  })

  it('should apply multiple operations in order', ({ expect }) => {
    const obj = { a: 1 }
    const result = applyJsonPatch(obj, [
      { op: 'add', path: '/b', value: 2 },
      { op: 'add', path: '/c', value: 3 },
      { op: 'replace', path: '/a', value: 10 },
      { op: 'remove', path: '/b' },
    ])
    expect(result).toEqual({ a: 10, c: 3 })
  })

  it('should handle nested operations', ({ expect }) => {
    const obj = { user: { name: 'John' } }
    const result = applyJsonPatch(obj, [
      { op: 'add', path: '/user/age', value: 30 },
      { op: 'replace', path: '/user/name', value: 'Jane' },
    ])
    expect(result).toEqual({ user: { name: 'Jane', age: 30 } })
  })

  it('should handle array operations', ({ expect }) => {
    const obj = { items: ['a', 'b'] }
    const result = applyJsonPatch(obj, [
      { op: 'add', path: '/items/2', value: 'c' },
      { op: 'replace', path: '/items/0', value: 'x' },
    ])
    expect(result).toEqual({ items: ['x', 'b', 'c'] })
  })

  it('should throw for invalid operations', ({ expect }) => {
    const obj = { a: 1 }
    expect(() => applyJsonPatch(obj, [
      { op: 'invalid' as any, path: '/a', value: 2 },
    ])).toThrow()
  })

  it('should throw for non-existent path on replace', ({ expect }) => {
    const obj = { a: 1 }
    expect(() => applyJsonPatch(obj, [
      { op: 'replace', path: '/b', value: 2 },
    ])).toThrow()
  })

  it('should throw for non-existent path on remove', ({ expect }) => {
    const obj = { a: 1 }
    expect(() => applyJsonPatch(obj, [
      { op: 'remove', path: '/b' },
    ])).toThrow()
  })

  it('should create intermediate objects for add', ({ expect }) => {
    const obj = {}
    const result = applyJsonPatch(obj, [
      { op: 'add', path: '/user/profile/name', value: 'John' },
    ])
    expect(result).toEqual({ user: { profile: { name: 'John' } } })
  })

  it('should roundtrip with getJsonDiff', ({ expect }) => {
    const original = {
      user: { name: 'John', age: 30, email: 'john@example.com' },
      settings: { theme: 'light', notifications: true },
    }
    const modified = {
      user: { name: 'Jane', age: 31 },
      settings: { theme: 'dark', notifications: true },
      newField: 'added',
    }

    const diff = getJsonDiff(original, modified)
    const result = applyJsonPatch(original, diff)
    expect(deepEquals(result, modified)).toBe(true)
  })
})
