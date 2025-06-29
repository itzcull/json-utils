import { describe, expect, it } from 'vitest'
import {
  createJsonSchema,
  deleteUndefinedKeys,
  generatePointersFromJsonSchema,
} from './schema'

// createJsonSchema tests

describe(createJsonSchema.name, () => {
  it('handles primitive types', ({ expect }) => {
    expect(createJsonSchema('hello')).toEqual({ type: 'string' })
    expect(createJsonSchema(42)).toEqual({ type: 'number' })
    expect(createJsonSchema(true)).toEqual({ type: 'boolean' })
    expect(createJsonSchema(null)).toEqual({ type: 'null' })
  })

  it('handles arrays', ({ expect }) => {
    const input = [1, 2, 3]
    expect(createJsonSchema(input)).toEqual({
      type: 'array',
      items: { type: 'number' },
    })

    const emptyArray: any[] = []
    expect(createJsonSchema(emptyArray)).toEqual({
      type: 'array',
      items: {},
    })
  })

  it('handles nested objects', ({ expect }) => {
    const input = {
      name: 'John',
      age: 30,
      address: {
        street: '123 Main St',
        city: 'Boston',
      },
    }

    expect(createJsonSchema(input)).toEqual({
      type: 'object',
      properties: {
        name: { type: 'string' },
        age: { type: 'number' },
        address: {
          type: 'object',
          properties: {
            street: { type: 'string' },
            city: { type: 'string' },
          },
          required: ['street', 'city'],
        },
      },
      required: ['name', 'age', 'address'],
    })
  })

  it('handles complex nested structures', ({ expect }) => {
    const input = {
      users: [
        {
          id: 1,
          active: true,
          tags: ['admin', 'user'],
        },
      ],
    }

    expect(createJsonSchema(input)).toEqual({
      type: 'object',
      properties: {
        users: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'number' },
              active: { type: 'boolean' },
              tags: {
                type: 'array',
                items: { type: 'string' },
              },
            },
            required: ['id', 'active', 'tags'],
          },
        },
      },
      required: ['users'],
    })
  })
})

// deleteUndefinedKeys tests

describe(deleteUndefinedKeys.name, () => {
  it('should return primitives as-is', ({ expect }) => {
    expect(deleteUndefinedKeys(null)).toBeNull()
    expect(deleteUndefinedKeys('string')).toBe('string')
    expect(deleteUndefinedKeys(123)).toBe(123)
    expect(deleteUndefinedKeys(true)).toBe(true)
  })

  it('should remove undefined keys from simple objects', ({ expect }) => {
    const input = {
      a: 1,
      b: undefined,
      c: 'test',
      d: undefined,
    }

    const expected = {
      a: 1,
      c: 'test',
    }

    const result = deleteUndefinedKeys(input)
    expect(result).toEqual(expected)
    expect(result).toBe(input)
  })

  it('should handle nested objects', ({ expect }) => {
    const input = {
      a: 1,
      b: {
        x: undefined,
        y: 'test',
        z: {
          deep: undefined,
          valid: true,
        },
      },
      c: undefined,
    }

    const expected = {
      a: 1,
      b: {
        y: 'test',
        z: {
          valid: true,
        },
      },
    }

    expect(deleteUndefinedKeys(input)).toEqual(expected)
  })

  it('should handle arrays', ({ expect }) => {
    const input = [1, undefined, 'test', undefined, true]
    const result = deleteUndefinedKeys(input)
    expect(result).toEqual([1, undefined, 'test', undefined, true])
    expect(result).toBe(input)
  })

  it('should process objects within arrays', ({ expect }) => {
    const input = [{ a: 1, b: undefined }, { c: undefined, d: 'test' }, undefined, { e: { f: undefined, g: 2 } }]
    const expected = [{ a: 1 }, { d: 'test' }, undefined, { e: { g: 2 } }]
    expect(deleteUndefinedKeys(input)).toEqual(expected)
  })

  it('should handle complex nested structures', ({ expect }) => {
    const input = {
      a: [{ x: 1, y: undefined }, { z: undefined }],
      b: {
        c: [undefined, { d: undefined, e: 3 }],
        f: undefined,
      },
    }

    const expected = {
      a: [{ x: 1 }, {}],
      b: {
        c: [undefined, { e: 3 }],
      },
    }

    expect(deleteUndefinedKeys(input)).toEqual(expected)
  })

  it('should handle empty objects and arrays', ({ expect }) => {
    expect(deleteUndefinedKeys({})).toEqual({})
    expect(deleteUndefinedKeys([])).toEqual([])
  })
})

// generatePointersFromJsonSchema tests

describe(generatePointersFromJsonSchema.name, () => {
  it('simple object schema', () => {
    const schema = {
      type: 'object',
      properties: {
        name: { type: 'string' },
        age: { type: 'number' },
      },
    }
    expect(generatePointersFromJsonSchema(schema)).toEqual(['/name', '/age'])
  })

  it('nested object schema', () => {
    const schema = {
      type: 'object',
      properties: {
        person: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            age: { type: 'number' },
          },
        },
      },
    }
    expect(generatePointersFromJsonSchema(schema)).toEqual(['/person', '/person/name', '/person/age'])
  })

  it('array schema with simple items', () => {
    const schema = {
      type: 'array',
      items: { type: 'string' },
    }
    expect(generatePointersFromJsonSchema(schema)).toEqual(['/0'])
  })

  it('array schema with object items', () => {
    const schema = {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          age: { type: 'number' },
        },
      },
    }
    expect(generatePointersFromJsonSchema(schema)).toEqual(['/0', '/0/name', '/0/age'])
  })

  it('complex nested schema', () => {
    const schema = {
      type: 'object',
      properties: {
        id: { type: 'string' },
        user: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            email: { type: 'string' },
            addresses: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  street: { type: 'string' },
                  city: { type: 'string' },
                  country: { type: 'string' },
                },
              },
            },
          },
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
        },
      },
    }
    expect(generatePointersFromJsonSchema(schema)).toEqual([
      '/id',
      '/user',
      '/user/name',
      '/user/email',
      '/user/addresses',
      '/user/addresses/0',
      '/user/addresses/0/street',
      '/user/addresses/0/city',
      '/user/addresses/0/country',
      '/tags',
      '/tags/0',
    ])
  })

  it('empty schema', () => {
    const schema = {}
    expect(generatePointersFromJsonSchema(schema)).toEqual([])
  })

  it('schema with additional properties', () => {
    const schema = {
      type: 'object',
      properties: {
        name: { type: 'string' },
      },
      additionalProperties: true,
    }
    expect(generatePointersFromJsonSchema(schema)).toEqual(['/name'])
  })

  it('schema with pattern properties', () => {
    const schema = {
      type: 'object',
      patternProperties: {
        '^S_': { type: 'string' },
        '^I_': { type: 'integer' },
      },
    }
    expect(generatePointersFromJsonSchema(schema)).toEqual([])
  })

  it('schema with oneOf', () => {
    const schema = {
      type: 'object',
      oneOf: [
        {
          properties: {
            name: { type: 'string' },
          },
        },
        {
          properties: {
            id: { type: 'number' },
          },
        },
      ],
    }
    expect(generatePointersFromJsonSchema(schema)).toEqual([])
  })

  it('variable schemas in array items', () => {
    const schema = {
      type: 'array',
      items: [
        {
          type: 'object',
          properties: {
            name: { type: 'string' },
            age: { type: 'number' },
          },
        },
        {
          type: 'object',
          properties: {
            foo: { type: 'string' },
            bar: { type: 'number' },
          },
        },
      ],
    }
    expect(generatePointersFromJsonSchema(schema)).toEqual(['/0', '/0/name', '/0/age', '/1', '/1/foo', '/1/bar'])
  })
})
