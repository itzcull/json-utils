import { describe, expect, it } from 'vitest'
import {
  isJsonArray,
  isJsonObject,
  isJsonPointer,
  isJsonValue,
  isJsonValueType,
  VALID_JSON_TYPE_NAMES,
} from './predicate'

// isJsonObject tests

describe(isJsonObject.name, () => {
  it('should return true for an empty object', ({ expect }) => {
    expect(isJsonObject({})).toBe(true)
  })

  it('should return true for a non-empty object', ({ expect }) => {
    expect(isJsonObject({ a: 1 })).toBe(true)
  })

  it('should return false for null', ({ expect }) => {
    expect(isJsonObject(null)).toBe(false)
  })

  it('should return false for undefined', ({ expect }) => {
    expect(isJsonObject(undefined)).toBe(false)
  })

  it('should return false for a string', ({ expect }) => {
    expect(isJsonObject('string')).toBe(false)
  })

  it('should return false for a number', ({ expect }) => {
    expect(isJsonObject(1)).toBe(false)
  })

  it('should return false for a boolean', ({ expect }) => {
    expect(isJsonObject(true)).toBe(false)
  })

  it('should return false for an array', ({ expect }) => {
    expect(isJsonObject([])).toBe(false)
  })
})

// isJsonArray tests

describe(isJsonArray.name, () => {
  it('should return true for an empty array', ({ expect }) => {
    expect(isJsonArray([])).toBe(true)
  })

  it('should return true for a non-empty array', ({ expect }) => {
    expect(isJsonArray([1, 2, 3])).toBe(true)
  })

  it('should return true for complex json arrays', ({ expect }) => {
    expect(isJsonArray([1, { a: 2 }, [3, 4]])).toBe(true)
  })

  it('should return false for null', ({ expect }) => {
    expect(isJsonArray(null)).toBe(false)
  })

  it('should return false for undefined', ({ expect }) => {
    expect(isJsonArray(undefined)).toBe(false)
  })

  it('should return false for a string', ({ expect }) => {
    expect(isJsonArray('string')).toBe(false)
  })

  it('should return false for a number', ({ expect }) => {
    expect(isJsonArray(1)).toBe(false)
  })

  it('should return false for a boolean', ({ expect }) => {
    expect(isJsonArray(true)).toBe(false)
  })

  it('should return false for an object', ({ expect }) => {
    expect(isJsonArray({})).toBe(false)
  })
})

// isJsonPointer tests

describe(isJsonPointer.name, () => {
  // Valid JSON Schema Refs
  it.each([
    '/',
    '/nested',
    '/items/0',
    '/definitions/positiveInteger',
    '/$defs/address',
    '/complex~1path',
    '/with~0tilde',
    '/$ref/3/4/2',
    '/with-dash',
    '/with_underscore',
    '//with space',
    '//with:colon///and-some-slashes/f/',
  ])('should return true for valid JSON Schema Ref: %s', (input) => {
    expect(isJsonPointer(input)).toBe(true)
  })

  // Invalid JSON Schema Refs
  it.each(['invalid', '#invalid', '#/', '#//', '#properties'])(
    'should return false for invalid JSON Schema Ref: %s',
    (input) => {
      expect(isJsonPointer(input)).toBe(false)
    },
  )

  it('should handle very long refs', () => {
    const longRef = `/${'a'.repeat(1000)}`
    expect(isJsonPointer(longRef)).toBe(true)
  })

  it('should allow segments starting with numbers', () => {
    expect(isJsonPointer('//1property')).toBe(true)
  })

  // Special character tests
  it('should allow underscores and dashes', () => {
    expect(isJsonPointer('//with_underscore-and-dash')).toBe(true)
  })

  it('should return true for empty pointer', () => {
    expect(isJsonPointer('')).toBe(true)
  })
})

// isJsonValue tests

describe(isJsonValue.name, () => {
  // Test valid JSON types
  it('null is a valid JSON type', () => {
    expect(isJsonValue(null)).toBe(true)
  })

  it('boolean values are valid JSON types', () => {
    expect(isJsonValue(true)).toBe(true)
    expect(isJsonValue(false)).toBe(true)
  })

  it('finite numbers are valid JSON types', () => {
    expect(isJsonValue(0)).toBe(true)
    expect(isJsonValue(42)).toBe(true)
    expect(isJsonValue(-1)).toBe(true)
    expect(isJsonValue(3.14)).toBe(true)
  })

  it('strings are valid JSON types', () => {
    expect(isJsonValue('')).toBe(true)
    expect(isJsonValue('hello')).toBe(true)
    expect(isJsonValue('{"key": "value"}')).toBe(true) // Note: This is a string, not an object.
  })

  it('arrays of valid JSON types are valid JSON types', () => {
    expect(isJsonValue([])).toBe(true)
    expect(isJsonValue([1, 'two', true, null])).toBe(true)
    expect(isJsonValue([1, ['two', [true]], [null]])).toBe(true)
  })

  it('objects with valid JSON type values are valid JSON types', () => {
    expect(isJsonValue({})).toBe(true)
    expect(isJsonValue({ a: 1, b: 'two', c: true, d: null })).toBe(true)
    expect(isJsonValue({ a: 1, b: { c: 'three', d: [true, null] } })).toBe(true)
  })

  // Test invalid JSON types
  it('undefined is not a valid JSON type', () => {
    expect(isJsonValue(undefined)).toBe(false)
  })

  it('functions are not valid JSON types', () => {
    expect(isJsonValue(() => {})).toBe(false)
  })

  it('symbols are not valid JSON types', () => {
    expect(isJsonValue(Symbol('test'))).toBe(false)
  })

  it('naN is not a valid JSON type', () => {
    expect(isJsonValue(Number.NaN)).toBe(false)
  })

  it('infinity is not a valid JSON type', () => {
    expect(isJsonValue(Infinity)).toBe(false)
    expect(isJsonValue(-Infinity)).toBe(false)
  })

  it('date object is not a valid JSON type', () => {
    expect(isJsonValue(new Date())).toBe(false)
  })

  // Test objects with non-JSON values
  it('object with undefined value is not a valid JSON type', () => {
    expect(isJsonValue({ a: 1, b: undefined })).toBe(false)
  })

  it('array with undefined value is not a valid JSON type', () => {
    expect(isJsonValue([1, undefined, 3])).toBe(false)
  })

  // Test other non-JSON types
  it('regExp is not a valid JSON type', () => {
    expect(isJsonValue(/test/)).toBe(false)
  })

  it('map is not a valid JSON type', () => {
    expect(isJsonValue(new Map())).toBe(false)
  })

  it('set is not a valid JSON type', () => {
    expect(isJsonValue(new Set())).toBe(false)
  })

  // Complex nested structures
  it('complex nested structure with only valid JSON types', () => {
    const complexObj = {
      a: 1,
      b: 'string',
      c: [true, null, { d: [1, 2, 3] }],
      e: { f: { g: 'nested' } },
    }
    expect(isJsonValue(complexObj)).toBe(true)
  })

  it('complex nested structure with an invalid JSON type', () => {
    const complexObj = {
      a: 1,
      b: 'string',
      c: [true, null, { d: [1, 2, 3] }],
      e: { f: { g: new Date() } },
    }
    expect(isJsonValue(complexObj)).toBe(false)
  })
})

// isJsonValueType tests

describe(isJsonValueType.name, () => {
  it('should return true for valid JSON schema type names', () => {
    VALID_JSON_TYPE_NAMES.forEach((type) => {
      expect(isJsonValueType(type)).toBe(true)
    })
  })

  it('should return false for invalid string values', () => {
    const invalidTypes = [
      'Array',
      'Boolean',
      'INT',
      'Number',
      'Null',
      'Object',
      'String',
      'date',
      'float',
      'any',
      'undefined',
    ]

    invalidTypes.forEach((type) => {
      expect(isJsonValueType(type)).toBe(false)
    })
  })

  it('should return false for non-string values', () => {
    const nonStringValues = [null, undefined, 123, true, false, [], {}, () => {}]

    nonStringValues.forEach((value) => {
      expect(isJsonValueType(value)).toBe(false)
    })
  })

  it('should handle empty string', () => {
    expect(isJsonValueType('')).toBe(false)
  })

  it('should handle case sensitivity', () => {
    expect(isJsonValueType('STRING')).toBe(false)
    expect(isJsonValueType('Array')).toBe(false)
  })
})
