import { describe, it } from 'vitest'
import { extractJsonSubset, queryJsonByPattern, selectJsonValues } from './query'

describe(selectJsonValues.name, () => {
  it('should select single value', ({ expect }) => {
    const data = { a: 1, b: 2, c: 3 }
    const result = selectJsonValues(data, ['/a'])
    expect(result).toEqual([1])
  })

  it('should select multiple values', ({ expect }) => {
    const data = { a: 1, b: 2, c: 3 }
    const result = selectJsonValues(data, ['/a', '/c'])
    expect(result).toEqual([1, 3])
  })

  it('should handle nested paths', ({ expect }) => {
    const data = {
      user: { name: 'John', age: 30 },
      config: { theme: 'dark' },
    }
    const result = selectJsonValues(data, ['/user/name', '/config/theme'])
    expect(result).toEqual(['John', 'dark'])
  })

  it('should handle array indices', ({ expect }) => {
    const data = {
      items: ['apple', 'banana', 'cherry'],
      nested: { tags: ['red', 'blue'] },
    }
    const result = selectJsonValues(data, ['/items/0', '/items/2', '/nested/tags/1'])
    expect(result).toEqual(['apple', 'cherry', 'blue'])
  })

  it('should return undefined for non-existent paths', ({ expect }) => {
    const data = { a: 1, b: 2 }
    const result = selectJsonValues(data, ['/a', '/nonexistent', '/b'])
    expect(result).toEqual([1, undefined, 2])
  })

  it('should handle empty path list', ({ expect }) => {
    const data = { a: 1, b: 2 }
    const result = selectJsonValues(data, [])
    expect(result).toEqual([])
  })

  it('should handle complex nested structures', ({ expect }) => {
    const data = {
      api: {
        users: [
          { id: 1, name: 'Alice', profile: { email: 'alice@example.com' } },
          { id: 2, name: 'Bob', profile: { email: 'bob@example.com' } },
        ],
      },
      meta: { total: 2 },
    }
    const result = selectJsonValues(data, [
      '/api/users/0/name',
      '/api/users/1/profile/email',
      '/meta/total',
    ])
    expect(result).toEqual(['Alice', 'bob@example.com', 2])
  })
})

describe(queryJsonByPattern.name, () => {
  it('should match simple wildcard patterns', ({ expect }) => {
    const data = {
      user1: { name: 'Alice' },
      user2: { name: 'Bob' },
      admin: { name: 'Charlie' },
    }
    const result = queryJsonByPattern(data, '/user*/name')
    expect(result).toEqual([
      { path: '/user1/name', value: 'Alice' },
      { path: '/user2/name', value: 'Bob' },
    ])
  })

  it('should match array wildcard patterns', ({ expect }) => {
    const data = {
      items: [
        { id: 1, name: 'Item 1' },
        { id: 2, name: 'Item 2' },
        { id: 3, name: 'Item 3' },
      ],
    }
    const result = queryJsonByPattern(data, '/items/*/id')
    expect(result).toEqual([
      { path: '/items/0/id', value: 1 },
      { path: '/items/1/id', value: 2 },
      { path: '/items/2/id', value: 3 },
    ])
  })

  it('should match nested wildcard patterns', ({ expect }) => {
    const data = {
      users: {
        alice: { profile: { age: 30 } },
        bob: { profile: { age: 25 } },
      },
    }
    const result = queryJsonByPattern(data, '/users/*/profile/age')
    expect(result).toEqual([
      { path: '/users/alice/profile/age', value: 30 },
      { path: '/users/bob/profile/age', value: 25 },
    ])
  })

  it('should match double wildcard patterns', ({ expect }) => {
    const data = {
      level1: {
        level2a: { value: 'a' },
        level2b: { value: 'b' },
      },
      other: {
        level2c: { value: 'c' },
      },
    }
    const result = queryJsonByPattern(data, '/**/value')
    expect(result).toEqual([
      { path: '/level1/level2a/value', value: 'a' },
      { path: '/level1/level2b/value', value: 'b' },
      { path: '/other/level2c/value', value: 'c' },
    ])
  })

  it('should handle multiple wildcards in pattern', ({ expect }) => {
    const data = {
      groups: [
        {
          users: [
            { name: 'Alice', active: true },
            { name: 'Bob', active: false },
          ],
        },
        {
          users: [
            { name: 'Charlie', active: true },
          ],
        },
      ],
    }
    const result = queryJsonByPattern(data, '/groups/*/users/*/name')
    expect(result).toEqual([
      { path: '/groups/0/users/0/name', value: 'Alice' },
      { path: '/groups/0/users/1/name', value: 'Bob' },
      { path: '/groups/1/users/0/name', value: 'Charlie' },
    ])
  })

  it('should return empty array for no matches', ({ expect }) => {
    const data = { a: 1, b: 2 }
    const result = queryJsonByPattern(data, '/nonexistent/*/value')
    expect(result).toEqual([])
  })

  it('should handle edge cases', ({ expect }) => {
    const data = {
      empty: {},
      emptyArray: [],
      nullValue: null,
      falseValue: false,
    }
    const result = queryJsonByPattern(data, '/*/value')
    expect(result).toEqual([])
  })

  it('should match exact paths without wildcards', ({ expect }) => {
    const data = { user: { name: 'John' } }
    const result = queryJsonByPattern(data, '/user/name')
    expect(result).toEqual([
      { path: '/user/name', value: 'John' },
    ])
  })
})

describe(extractJsonSubset.name, () => {
  it('should extract subset by paths', ({ expect }) => {
    const data = {
      user: { name: 'John', age: 30, email: 'john@example.com' },
      config: { theme: 'dark', lang: 'en' },
    }
    const result = extractJsonSubset(data, ['/user/name', '/config/theme'])
    expect(result).toEqual({
      user: { name: 'John' },
      config: { theme: 'dark' },
    })
  })

  it('should extract subset with array elements', ({ expect }) => {
    const data = {
      items: [
        { id: 1, name: 'Item 1', secret: 'hidden' },
        { id: 2, name: 'Item 2', secret: 'hidden' },
      ],
      meta: { total: 2, debug: 'info' },
    }
    const result = extractJsonSubset(data, ['/items/0/id', '/items/0/name', '/items/1/id', '/meta/total'])
    expect(result).toEqual({
      items: [
        { id: 1, name: 'Item 1' },
        { id: 2 },
      ],
      meta: { total: 2 },
    })
  })

  it('should handle nested extraction', ({ expect }) => {
    const data = {
      api: {
        v1: {
          users: {
            endpoints: ['list', 'create', 'update'],
            auth: { required: true, method: 'jwt' },
          },
        },
        v2: {
          users: {
            endpoints: ['list', 'create'],
          },
        },
      },
    }
    const result = extractJsonSubset(data, [
      '/api/v1/users/endpoints/0',
      '/api/v1/users/auth/required',
      '/api/v2/users/endpoints',
    ])
    expect(result).toEqual({
      api: {
        v1: {
          users: {
            endpoints: ['list'],
            auth: { required: true },
          },
        },
        v2: {
          users: {
            endpoints: ['list', 'create'],
          },
        },
      },
    })
  })

  it('should handle non-existent paths gracefully', ({ expect }) => {
    const data = { a: 1, b: 2 }
    const result = extractJsonSubset(data, ['/a', '/nonexistent', '/c'])
    expect(result).toEqual({ a: 1 })
  })

  it('should handle empty paths array', ({ expect }) => {
    const data = { a: 1, b: 2 }
    const result = extractJsonSubset(data, [])
    expect(result).toEqual({})
  })

  it('should handle root-level extraction', ({ expect }) => {
    const data = { a: 1, b: 2, c: 3 }
    const result = extractJsonSubset(data, ['/a', '/c'])
    expect(result).toEqual({ a: 1, c: 3 })
  })

  it('should preserve object structure', ({ expect }) => {
    const data = {
      level1: {
        level2: {
          level3: {
            value: 'deep',
            other: 'value',
          },
        },
      },
    }
    const result = extractJsonSubset(data, ['/level1/level2/level3/value'])
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

  it('should extract subset with pattern-based paths', ({ expect }) => {
    const data = {
      users: [
        { id: 1, name: 'Alice', role: 'admin' },
        { id: 2, name: 'Bob', role: 'user' },
      ],
    }

    // Using queryJsonByPattern to get paths, then extract subset
    const namePaths = queryJsonByPattern(data, '/users/*/name').map(match => match.path)
    const result = extractJsonSubset(data, namePaths)

    expect(result).toEqual({
      users: [
        { name: 'Alice' },
        { name: 'Bob' },
      ],
    })
  })
})
