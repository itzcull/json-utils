import { describe, it } from 'vitest'
import { coerceToJsonType, sanitizeJson, validateJsonPointerPath } from './validator'

describe(validateJsonPointerPath.name, () => {
  it('should validate existing paths', ({ expect }) => {
    const data = { user: { name: 'John', age: 30 } }
    expect(validateJsonPointerPath(data, '/user/name')).toBe(true)
    expect(validateJsonPointerPath(data, '/user/age')).toBe(true)
    expect(validateJsonPointerPath(data, '/user')).toBe(true)
  })

  it('should return false for non-existent paths', ({ expect }) => {
    const data = { user: { name: 'John' } }
    expect(validateJsonPointerPath(data, '/user/email')).toBe(false)
    expect(validateJsonPointerPath(data, '/nonexistent')).toBe(false)
    expect(validateJsonPointerPath(data, '/user/profile/age')).toBe(false)
  })

  it('should handle array indices', ({ expect }) => {
    const data = { items: ['a', 'b', 'c'] }
    expect(validateJsonPointerPath(data, '/items/0')).toBe(true)
    expect(validateJsonPointerPath(data, '/items/2')).toBe(true)
    expect(validateJsonPointerPath(data, '/items/3')).toBe(false)
    expect(validateJsonPointerPath(data, '/items/-1')).toBe(false)
  })

  it('should handle root path', ({ expect }) => {
    const data = { a: 1 }
    expect(validateJsonPointerPath(data, '')).toBe(true)
    expect(validateJsonPointerPath(data, '/')).toBe(true)
  })

  it('should handle nested arrays and objects', ({ expect }) => {
    const data = {
      users: [
        { id: 1, tags: ['admin'] },
        { id: 2, tags: ['user', 'active'] },
      ],
    }
    expect(validateJsonPointerPath(data, '/users/0/tags/0')).toBe(true)
    expect(validateJsonPointerPath(data, '/users/1/tags/1')).toBe(true)
    expect(validateJsonPointerPath(data, '/users/2')).toBe(false)
    expect(validateJsonPointerPath(data, '/users/0/tags/1')).toBe(false)
  })

  it('should return false for invalid pointers', ({ expect }) => {
    const data = { a: 1 }
    expect(validateJsonPointerPath(data, 'invalid')).toBe(false)
    expect(validateJsonPointerPath(data, 'no/leading/slash')).toBe(false)
  })
})

describe(coerceToJsonType.name, () => {
  it('should coerce strings to numbers when possible', ({ expect }) => {
    expect(coerceToJsonType('42', 'number')).toBe(42)
    expect(coerceToJsonType('3.14', 'number')).toBe(3.14)
    expect(coerceToJsonType('0', 'number')).toBe(0)
    expect(coerceToJsonType('-5', 'number')).toBe(-5)
  })

  it('should coerce strings to booleans when possible', ({ expect }) => {
    expect(coerceToJsonType('true', 'boolean')).toBe(true)
    expect(coerceToJsonType('false', 'boolean')).toBe(false)
    expect(coerceToJsonType('TRUE', 'boolean')).toBe(true)
    expect(coerceToJsonType('FALSE', 'boolean')).toBe(false)
  })

  it('should coerce strings to null when requested', ({ expect }) => {
    expect(coerceToJsonType('null', 'null')).toBe(null)
    expect(coerceToJsonType('NULL', 'null')).toBe(null)
  })

  it('should return null for invalid coercions', ({ expect }) => {
    expect(coerceToJsonType('not-a-number', 'number')).toBe(null)
    expect(coerceToJsonType('maybe', 'boolean')).toBe(null)
    expect(coerceToJsonType('test', 'null')).toBe(null)
  })

  it('should handle already correct types', ({ expect }) => {
    expect(coerceToJsonType(42, 'number')).toBe(42)
    expect(coerceToJsonType(true, 'boolean')).toBe(true)
    expect(coerceToJsonType('hello', 'string')).toBe('hello')
    expect(coerceToJsonType(null, 'null')).toBe(null)
  })

  it('should handle arrays and objects', ({ expect }) => {
    const arr = [1, 2, 3]
    const obj = { a: 1 }
    expect(coerceToJsonType(arr, 'array')).toBe(arr)
    expect(coerceToJsonType(obj, 'object')).toBe(obj)
  })

  it('should return null for type mismatches', ({ expect }) => {
    expect(coerceToJsonType(42, 'string')).toBe(null)
    expect(coerceToJsonType('test', 'number')).toBe(null)
    expect(coerceToJsonType([], 'object')).toBe(null)
    expect(coerceToJsonType({}, 'array')).toBe(null)
  })
})

describe(sanitizeJson.name, () => {
  it('should remove functions', ({ expect }) => {
    const input = {
      name: 'John',
      handler: () => {},
      process() {},
    }
    const result = sanitizeJson(input)
    expect(result).toEqual({ name: 'John' })
  })

  it('should remove undefined values', ({ expect }) => {
    const input = {
      name: 'John',
      email: undefined,
      age: 30,
      temp: undefined,
    }
    const result = sanitizeJson(input)
    expect(result).toEqual({ name: 'John', age: 30 })
  })

  it('should remove symbols', ({ expect }) => {
    const input = {
      name: 'John',
      id: Symbol('id'),
      data: 'test',
    }
    const result = sanitizeJson(input)
    expect(result).toEqual({ name: 'John', data: 'test' })
  })

  it('should handle NaN and Infinity', ({ expect }) => {
    const input = {
      valid: 42,
      invalid1: Number.NaN,
      invalid2: Infinity,
      invalid3: -Infinity,
    }
    const result = sanitizeJson(input)
    expect(result).toEqual({ valid: 42 })
  })

  it('should handle nested objects', ({ expect }) => {
    const input = {
      user: {
        name: 'John',
        handler: () => {},
        profile: {
          age: 30,
          temp: undefined,
          process() {},
        },
      },
      valid: true,
    }
    const result = sanitizeJson(input)
    expect(result).toEqual({
      user: {
        name: 'John',
        profile: {
          age: 30,
        },
      },
      valid: true,
    })
  })

  it('should handle arrays', ({ expect }) => {
    const input = {
      items: [
        1,
        'valid',
        () => {},
        undefined,
        null,
        { name: 'test', handler: () => {} },
      ],
    }
    const result = sanitizeJson(input)
    expect(result).toEqual({
      items: [1, 'valid', null, { name: 'test' }],
    })
  })

  it('should preserve valid JSON values', ({ expect }) => {
    const input = {
      string: 'hello',
      number: 42,
      boolean: true,
      null: null,
      array: [1, 2, 3],
      object: { nested: 'value' },
    }
    const result = sanitizeJson(input)
    expect(result).toEqual(input)
  })

  it('should handle Date objects', ({ expect }) => {
    const input = {
      name: 'John',
      created: new Date('2023-01-01'),
      updated: new Date('2023-12-31'),
    }
    const result = sanitizeJson(input)
    expect(result).toEqual({ name: 'John' })
  })

  it('should handle empty objects and arrays', ({ expect }) => {
    const input = {
      empty: {},
      emptyArray: [],
      handler: () => {},
    }
    const result = sanitizeJson(input)
    expect(result).toEqual({
      empty: {},
      emptyArray: [],
    })
  })

  it('should handle circular references by removing them', ({ expect }) => {
    const obj: any = { name: 'John' }
    obj.self = obj

    const result = sanitizeJson(obj)
    expect(result).toEqual({ name: 'John' })
  })
})
