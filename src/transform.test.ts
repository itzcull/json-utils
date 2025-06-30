import { describe, it } from 'vitest'
import { deepMergeJson, filterJsonByPaths, flattenJson, mapJsonValues, unflattenJson } from './transform'

describe(deepMergeJson.name, () => {
  it('should merge two simple objects', ({ expect }) => {
    const obj1 = { a: 1, b: 2 }
    const obj2 = { b: 3, c: 4 }
    const result = deepMergeJson(obj1, obj2)
    expect(result).toEqual({ a: 1, b: 3, c: 4 })
  })

  it('should deep merge nested objects', ({ expect }) => {
    const obj1 = { user: { name: 'John', age: 30 } }
    const obj2 = { user: { age: 31, email: 'john@example.com' } }
    const result = deepMergeJson(obj1, obj2)
    expect(result).toEqual({
      user: { name: 'John', age: 31, email: 'john@example.com' },
    })
  })

  it('should handle arrays by replacing them', ({ expect }) => {
    const obj1 = { items: [1, 2, 3] }
    const obj2 = { items: [4, 5] }
    const result = deepMergeJson(obj1, obj2)
    expect(result).toEqual({ items: [4, 5] })
  })

  it('should handle null values', ({ expect }) => {
    const obj1 = { a: 1, b: null }
    const obj2 = { b: 2, c: null }
    const result = deepMergeJson(obj1, obj2)
    expect(result).toEqual({ a: 1, b: 2, c: null })
  })

  it('should merge multiple objects', ({ expect }) => {
    const obj1 = { a: 1 }
    const obj2 = { b: 2 }
    const obj3 = { c: 3 }
    const result = deepMergeJson(obj1, obj2, obj3)
    expect(result).toEqual({ a: 1, b: 2, c: 3 })
  })

  it('should handle empty objects', ({ expect }) => {
    const obj1 = {}
    const obj2 = { a: 1 }
    const result = deepMergeJson(obj1, obj2)
    expect(result).toEqual({ a: 1 })
  })

  it('should use custom merge strategy for arrays', ({ expect }) => {
    const obj1 = { items: [1, 2] }
    const obj2 = { items: [3, 4] }
    const result = deepMergeJson(obj1, obj2, {
      arrayMergeStrategy: 'concat',
    })
    expect(result).toEqual({ items: [1, 2, 3, 4] })
  })

  it('should throw for non-object arguments', ({ expect }) => {
    expect(() => deepMergeJson('string' as any, {})).toThrow()
    expect(() => deepMergeJson({}, 123 as any)).toThrow()
  })
})

describe(flattenJson.name, () => {
  it('should flatten a simple object', ({ expect }) => {
    const obj = { a: 1, b: 2 }
    const result = flattenJson(obj)
    expect(result).toEqual({ '/a': 1, '/b': 2 })
  })

  it('should flatten nested objects', ({ expect }) => {
    const obj = {
      user: {
        name: 'John',
        profile: {
          age: 30,
          email: 'john@example.com',
        },
      },
    }
    const result = flattenJson(obj)
    expect(result).toEqual({
      '/user': { name: 'John', profile: { age: 30, email: 'john@example.com' } },
      '/user/name': 'John',
      '/user/profile': { age: 30, email: 'john@example.com' },
      '/user/profile/age': 30,
      '/user/profile/email': 'john@example.com',
    })
  })

  it('should flatten arrays', ({ expect }) => {
    const obj = {
      items: ['apple', 'banana'],
      nested: {
        tags: ['red', 'green'],
      },
    }
    const result = flattenJson(obj)
    expect(result).toEqual({
      '/items': ['apple', 'banana'],
      '/items/0': 'apple',
      '/items/1': 'banana',
      '/nested': { tags: ['red', 'green'] },
      '/nested/tags': ['red', 'green'],
      '/nested/tags/0': 'red',
      '/nested/tags/1': 'green',
    })
  })

  it('should handle null and primitive values', ({ expect }) => {
    const obj = {
      a: null,
      b: true,
      c: 'string',
      d: 123,
    }
    const result = flattenJson(obj)
    expect(result).toEqual({
      '/a': null,
      '/b': true,
      '/c': 'string',
      '/d': 123,
    })
  })

  it('should handle empty objects and arrays', ({ expect }) => {
    const obj = {
      empty: {},
      emptyArray: [],
    }
    const result = flattenJson(obj)
    expect(result).toEqual({
      '/empty': {},
      '/emptyArray': [],
    })
  })

  it('should escape special characters in keys', ({ expect }) => {
    const obj = {
      'key/with/slashes': 1,
      'key~with~tildes': 2,
    }
    const result = flattenJson(obj)
    expect(result).toEqual({
      '/key~1with~1slashes': 1,
      '/key~0with~0tildes': 2,
    })
  })

  it('should handle complex nested structures', ({ expect }) => {
    const obj = {
      data: {
        users: [
          { id: 1, name: 'Alice' },
          { id: 2, name: 'Bob' },
        ],
      },
    }
    const result = flattenJson(obj)
    expect(result).toEqual({
      '/data': { users: [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }] },
      '/data/users': [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }],
      '/data/users/0': { id: 1, name: 'Alice' },
      '/data/users/0/id': 1,
      '/data/users/0/name': 'Alice',
      '/data/users/1': { id: 2, name: 'Bob' },
      '/data/users/1/id': 2,
      '/data/users/1/name': 'Bob',
    })
  })
})

describe(unflattenJson.name, () => {
  it('should unflatten a simple object', ({ expect }) => {
    const flat = { '/a': 1, '/b': 2 }
    const result = unflattenJson(flat)
    expect(result).toEqual({ a: 1, b: 2 })
  })

  it('should unflatten nested objects', ({ expect }) => {
    const flat = {
      '/user/name': 'John',
      '/user/profile/age': 30,
      '/user/profile/email': 'john@example.com',
    }
    const result = unflattenJson(flat)
    expect(result).toEqual({
      user: {
        name: 'John',
        profile: {
          age: 30,
          email: 'john@example.com',
        },
      },
    })
  })

  it('should unflatten arrays', ({ expect }) => {
    const flat = {
      '/items/0': 'apple',
      '/items/1': 'banana',
      '/nested/tags/0': 'red',
      '/nested/tags/1': 'green',
    }
    const result = unflattenJson(flat)
    expect(result).toEqual({
      items: ['apple', 'banana'],
      nested: {
        tags: ['red', 'green'],
      },
    })
  })

  it('should handle escaped characters', ({ expect }) => {
    const flat = {
      '/key~1with~1slashes': 1,
      '/key~0with~0tildes': 2,
    }
    const result = unflattenJson(flat)
    expect(result).toEqual({
      'key/with/slashes': 1,
      'key~with~tildes': 2,
    })
  })

  it('should handle mixed types', ({ expect }) => {
    const flat = {
      '/a': null,
      '/b': true,
      '/c': 'string',
      '/d': 123,
      '/e/0': 'item',
    }
    const result = unflattenJson(flat)
    expect(result).toEqual({
      a: null,
      b: true,
      c: 'string',
      d: 123,
      e: ['item'],
    })
  })

  it('should roundtrip with flattenJson', ({ expect }) => {
    const original = {
      user: {
        name: 'John',
        tags: ['admin', 'user'],
        settings: {
          theme: 'dark',
          notifications: true,
        },
      },
    }
    const flattened = flattenJson(original)
    const unflattened = unflattenJson(flattened)
    expect(unflattened).toEqual(original)
  })

  it('should throw for invalid JSON pointer keys', ({ expect }) => {
    const flat = { 'invalid-key': 1 }
    expect(() => unflattenJson(flat)).toThrow()
  })
})

describe(mapJsonValues.name, () => {
  it('should map values in a simple object', ({ expect }) => {
    const obj = { a: 1, b: 2 }
    const result = mapJsonValues(obj, value => (typeof value === 'number' ? value * 2 : value))
    expect(result).toEqual({ a: 2, b: 4 })
  })

  it('should map values in nested objects', ({ expect }) => {
    const obj = {
      user: {
        name: 'john',
        age: 30,
      },
    }
    const result = mapJsonValues(obj, value => (typeof value === 'string' ? value.toUpperCase() : value))
    expect(result).toEqual({
      user: {
        name: 'JOHN',
        age: 30,
      },
    })
  })

  it('should map values in arrays', ({ expect }) => {
    const obj = {
      items: [1, 2, 3],
      nested: {
        values: [4, 5],
      },
    }
    const result = mapJsonValues(obj, value => (typeof value === 'number' ? value + 10 : value))
    expect(result).toEqual({
      items: [11, 12, 13],
      nested: {
        values: [14, 15],
      },
    })
  })

  it('should provide path context to mapper function', ({ expect }) => {
    const obj = {
      user: {
        name: 'john',
        profile: {
          name: 'john doe',
        },
      },
    }
    const result = mapJsonValues(obj, (value, path) => {
      if (path === '/user/profile/name' && typeof value === 'string') {
        return value.toUpperCase()
      }
      return value
    })
    expect(result).toEqual({
      user: {
        name: 'john',
        profile: {
          name: 'JOHN DOE',
        },
      },
    })
  })

  it('should handle null values', ({ expect }) => {
    const obj = { a: null, b: 1 }
    const result = mapJsonValues(obj, value => (value === null ? 'NULL' : value))
    expect(result).toEqual({ a: 'NULL', b: 1 })
  })

  it('should handle mixed types', ({ expect }) => {
    const obj = {
      str: 'hello',
      num: 42,
      bool: true,
      nil: null,
      arr: [1, 'two'],
    }
    const result = mapJsonValues(obj, (value) => {
      if (typeof value === 'string')
        return `[${value}]`
      if (typeof value === 'number')
        return value * 2
      if (typeof value === 'boolean')
        return !value
      return value
    })
    expect(result).toEqual({
      str: '[hello]',
      num: 84,
      bool: false,
      nil: null,
      arr: [2, '[two]'],
    })
  })
})

describe(filterJsonByPaths.name, () => {
  it('should filter by single path', ({ expect }) => {
    const obj = { a: 1, b: 2, c: 3 }
    const result = filterJsonByPaths(obj, ['/a'])
    expect(result).toEqual({ a: 1 })
  })

  it('should filter by multiple paths', ({ expect }) => {
    const obj = { a: 1, b: 2, c: 3 }
    const result = filterJsonByPaths(obj, ['/a', '/c'])
    expect(result).toEqual({ a: 1, c: 3 })
  })

  it('should filter nested paths', ({ expect }) => {
    const obj = {
      user: {
        name: 'John',
        age: 30,
        email: 'john@example.com',
      },
      meta: {
        created: '2023-01-01',
      },
    }
    const result = filterJsonByPaths(obj, ['/user/name', '/user/email'])
    expect(result).toEqual({
      user: {
        name: 'John',
        email: 'john@example.com',
      },
    })
  })

  it('should filter array elements', ({ expect }) => {
    const obj = {
      items: [
        { id: 1, name: 'A' },
        { id: 2, name: 'B' },
      ],
    }
    const result = filterJsonByPaths(obj, ['/items/0/name', '/items/1/id'])
    expect(result).toEqual({
      items: [{ name: 'A' }, { id: 2 }],
    })
  })

  it('should handle non-existent paths', ({ expect }) => {
    const obj = { a: 1, b: 2 }
    const result = filterJsonByPaths(obj, ['/a', '/nonexistent'])
    expect(result).toEqual({ a: 1 })
  })

  it('should return empty object for no matching paths', ({ expect }) => {
    const obj = { a: 1, b: 2 }
    const result = filterJsonByPaths(obj, ['/x', '/y'])
    expect(result).toEqual({})
  })

  it('should preserve nested structure', ({ expect }) => {
    const obj = {
      level1: {
        level2: {
          level3: {
            value: 'deep',
          },
        },
      },
    }
    const result = filterJsonByPaths(obj, ['/level1/level2/level3/value'])
    expect(result).toEqual({
      level1: {
        level2: {
          level3: {
            value: 'deep',
          },
        },
      },
    })
  })

  it('should handle parent and child paths', ({ expect }) => {
    const obj = {
      user: {
        name: 'John',
        profile: {
          age: 30,
        },
      },
    }
    // Including both parent and child paths
    const result = filterJsonByPaths(obj, ['/user', '/user/profile/age'])
    expect(result).toEqual(obj)
  })
})
