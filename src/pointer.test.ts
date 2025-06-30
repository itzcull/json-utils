import type { JSONPointers, JSONPrimitive } from './types'
import { describe, expect, expectTypeOf, it } from 'vitest'
import {
  decodePointer,
  encodePointer,
  getAllJsonPointers,
  getJsonPointerSegments,
  getJsonValueAtPointer,
  toJsonPointer,
  toJsonSchemaPointer,
} from './pointer'

// getJsonPointerSegments tests
describe(getJsonPointerSegments.name, () => {
  it('should return an empty array for an empty string', ({ expect }) => {
    expect(getJsonPointerSegments('')).toEqual([])
  })

  it('should return an array with a single empty string for "/"', ({ expect }) => {
    expect(getJsonPointerSegments('/')).toEqual([''])
  })

  it('should handle a single segment', ({ expect }) => {
    expect(getJsonPointerSegments('/properties')).toEqual(['properties'])
  })

  it('should handle a single segment with a property name', ({ expect }) => {
    expect(getJsonPointerSegments('/properties/name/street')).toEqual(['properties', 'name', 'street'])
  })

  it('should handle special characters', ({ expect }) => {
    expect(getJsonPointerSegments('/properties/address/c~0oordinates/lat~1')).toEqual([
      'properties',
      'address',
      'c~oordinates',
      'lat/',
    ])
  })

  it('should handle segments with spaces', ({ expect }) => {
    expect(getJsonPointerSegments('/properties/address/coordinates/lat ')).toEqual([
      'properties',
      'address',
      'coordinates',
      'lat ',
    ])
  })

  it('should handle consecutive slashes', ({ expect }) => {
    expect(getJsonPointerSegments('/properties/address//coordinates/lat')).toEqual([
      'properties',
      'address',
      '',
      'coordinates',
      'lat',
    ])
  })

  it('should handle consecutive tildes', ({ expect }) => {
    expect(getJsonPointerSegments('/properties/address/~1~1~0coordinates/lat')).toEqual([
      'properties',
      'address',
      '//~coordinates',
      'lat',
    ])
  })
})

// toJsonPointer tests
describe(toJsonPointer.name, () => {
  it('converts root pointer', () => {
    expect(toJsonPointer('')).toBe('/')
    expect(toJsonPointer('/')).toBe('/')
  })

  it('converts simple property pointer', () => {
    expect(toJsonPointer('/properties/foo')).toBe('/foo')
  })

  it('converts nested property pointer', () => {
    expect(toJsonPointer('/properties/foo/properties/bar')).toBe('/foo/bar')
  })

  it('converts mixed property and array pointer', () => {
    expect(toJsonPointer('/properties/foo/items/properties/bar')).toBe('/foo/0/bar')
  })

  it('converts complex nested pointer', () => {
    expect(toJsonPointer('/properties/foo/properties/bar/items/properties/baz/items')).toBe('/foo/bar/0/baz/0')
  })

  it('handles empty parts', () => {
    expect(toJsonPointer('/properties//properties/bar')).toBe('//bar')
  })

  it('handles numeric property names', () => {
    expect(toJsonPointer('/properties/123/properties/456')).toBe('/123/456')
  })

  it('handles property names that could be mistaken for array indices', () => {
    expect(toJsonPointer('/properties/0/properties/1')).toBe('/0/1')
  })

  it('handles very long nested pointers', () => {
    const input = '/properties/a/properties/b/properties/c/properties/d/items/properties/e/items/properties/f'
    const expected = '/a/b/c/d/0/e/0/f'
    expect(toJsonPointer(input)).toBe(expected)
  })

  it('handles pointers with only array items', () => {
    expect(toJsonPointer('/items/items/items')).toBe('/0/0/0')
  })

  it('handles pointers starting with array items', () => {
    expect(toJsonPointer('/items/properties/foo/items')).toBe('/0/foo/0')
  })

  it('handles pointers ending with array items', () => {
    expect(toJsonPointer('/properties/foo/properties/bar/items')).toBe('/foo/bar/0')
  })

  it('handles property names with special characters', () => {
    expect(toJsonPointer('/properties/foo!@#$%^&*/properties/bar+=-_')).toBe('/foo!@#$%^&*/bar+=-_')
  })
})

// toJsonSchemaPointer tests
describe(toJsonSchemaPointer.name, () => {
  it('converts root pointer', () => {
    expect(toJsonSchemaPointer('/')).toBe('/')
    expect(toJsonSchemaPointer('')).toBe('/')
  })

  it('converts simple property pointer', () => {
    expect(toJsonSchemaPointer('/foo')).toBe('/properties/foo')
  })

  it('converts nested property pointer', () => {
    expect(toJsonSchemaPointer('/foo/bar')).toBe('/properties/foo/properties/bar')
  })

  it('converts array index pointer', () => {
    expect(toJsonSchemaPointer('/foo/0')).toBe('/properties/foo/items/0')
  })

  it('converts mixed property and array index pointer', () => {
    expect(toJsonSchemaPointer('/foo/0/bar')).toBe('/properties/foo/items/0/properties/bar')
  })

  it('converts pointer with multiple array indices', () => {
    expect(toJsonSchemaPointer('/foo/0/1/2')).toBe('/properties/foo/items/0/items/1/items/2')
  })

  it('handles empty property names', () => {
    expect(toJsonSchemaPointer('/foo//bar')).toBe('/properties/foo/properties//properties/bar')
  })

  it('handles property names with numbers', () => {
    expect(toJsonSchemaPointer('/foo/123bar')).toBe('/properties/foo/properties/123bar')
  })

  it('throws error for invalid JSON Pointer (no leading slash)', () => {
    expect(() => toJsonSchemaPointer('foo/bar')).toThrow('Invalid JSON Pointer')
  })

  it('throws error for non-string input', () => {
    // @ts-expect-error Testing invalid input
    expect(() => toJsonSchemaPointer(123)).toThrow('Invalid JSON Pointer')
  })

  it('handles very long nested pointer', () => {
    const longPointer = '/a/b/c/d/e/f/g/h/i/j/k/l/m/n/o/p'
    const expectedResult = getJsonPointerSegments(longPointer)
      .map(part => `/properties/${part}`)
      .join('')
    expect(toJsonSchemaPointer(longPointer)).toBe(expectedResult)
  })

  it('handles pointer with mixed array indices and properties', () => {
    expect(toJsonSchemaPointer('/foo/0/bar/1/baz/2/qux')).toBe(
      '/properties/foo/items/0/properties/bar/items/1/properties/baz/items/2/properties/qux',
    )
  })

  it('handles pointer ending with array index', () => {
    expect(toJsonSchemaPointer('/foo/bar/0')).toBe('/properties/foo/properties/bar/items/0')
  })

  it('handles pointer with only array indices', () => {
    expect(toJsonSchemaPointer('/0/1/2')).toBe('/items/0/items/1/items/2')
  })
})

// getJsonValueAtPointer tests
describe(getJsonValueAtPointer.name, () => {
  const object = {
    name: 'John Doe',
    age: 30,
    isStudent: false,
    address: {
      street: '123 Main St',
      city: 'Anytown',
      zipCode: '12345',
      coordinates: {
        lat: 40.7128,
        lon: -74.006,
      },
    },
    contacts: [
      { type: 'email', value: 'john@example.com' },
      { type: 'phone', value: '555-1234' },
    ],
    education: {
      degrees: ['Bachelor\'s', 'Master\'s'],
      schools: [
        { name: 'University A', year: 2015 },
        { name: 'University B', year: 2017 },
      ],
    },
    nullProperty: null,
    emptyObject: {},
    emptyArray: [],
  }

  it('should throw if invalid object is passed', ({ expect }) => {
    expect(() => getJsonValueAtPointer(null, '/name')).toThrow()
    expect(() => getJsonValueAtPointer(undefined, '/name')).toThrow()
    expect(() => getJsonValueAtPointer(1, '/name')).toThrow()
    expect(() => getJsonValueAtPointer('string', '/name')).toThrow()
  })

  it('should throw if invalid pointer is passed', ({ expect }) => {
    expect(() => getJsonValueAtPointer(object, null)).toThrow()
    expect(() => getJsonValueAtPointer(object, undefined)).toThrow()
    expect(() => getJsonValueAtPointer(object, 1)).toThrow()
    expect(() => getJsonValueAtPointer(object, 'string')).toThrow()
  })

  it('should return the given object if empty pointer is passed', ({ expect }) => {
    expect(getJsonValueAtPointer(object, '')).toBe(object)
  })

  it('should return correct value for top-level property', ({ expect }) => {
    expect(getJsonValueAtPointer(object, '/name')).toBe('John Doe')
    expect(getJsonValueAtPointer(object, '/age')).toBe(30)
    expect(getJsonValueAtPointer(object, '/isStudent')).toBe(false)
  })

  it('should return correct value for nested object property', ({ expect }) => {
    expect(getJsonValueAtPointer(object, '/address/street')).toBe('123 Main St')
    expect(getJsonValueAtPointer(object, '/address/coordinates/lat')).toBe(40.7128)
  })

  it('should return correct value for array elements', ({ expect }) => {
    expect(getJsonValueAtPointer(object, '/contacts/0/type')).toBe('email')
    expect(getJsonValueAtPointer(object, '/contacts/1/value')).toBe('555-1234')
    expect(getJsonValueAtPointer(object, '/education/degrees/0')).toBe('Bachelor\'s')
  })

  it('should handle nested arrays and objects', ({ expect }) => {
    expect(getJsonValueAtPointer(object, '/education/schools/1/name')).toBe('University B')
    expect(getJsonValueAtPointer(object, '/education/schools/0/year')).toBe(2015)
  })

  it('should return undefined for non-existent paths', ({ expect }) => {
    expect(getJsonValueAtPointer(object, '/nonexistent')).toBeUndefined()
    expect(getJsonValueAtPointer(object, '/address/country')).toBeUndefined()
    expect(getJsonValueAtPointer(object, '/contacts/5')).toBeUndefined()
  })

  it('should handle null values', ({ expect }) => {
    expect(getJsonValueAtPointer(object, '/nullProperty')).toBeNull()
  })

  it('should handle empty objects and arrays', ({ expect }) => {
    expect(getJsonValueAtPointer(object, '/emptyObject')).toEqual({})
    expect(getJsonValueAtPointer(object, '/emptyArray')).toEqual([])
  })

  it('should throw when given invalid pointers', ({ expect }) => {
    expect(() => getJsonValueAtPointer(object, 'invalid ref')).toThrow()
    expect(() => getJsonValueAtPointer(object, undefined)).toThrow()
    expect(() => getJsonValueAtPointer(object, null)).toThrow()
    expect(() => getJsonValueAtPointer(object, '#/properties')).toThrow()
  })

  it('should be case sensitive', ({ expect }) => {
    expect(getJsonValueAtPointer(object, '/NAME')).toBeUndefined()
    expect(getJsonValueAtPointer(object, '/address/CITY')).toBeUndefined()
  })

  const objectWithNumericKeys = { 0: 'zero', 1: 'one' }
  it('should handle numeric keys', ({ expect }) => {
    expect(getJsonValueAtPointer(objectWithNumericKeys, '/0')).toBe('zero')
    expect(getJsonValueAtPointer(objectWithNumericKeys, '/1')).toBe('one')
  })

  const objectWithSpecialChars = { 'special@key': 'special value' }
  it('should handle special characters in keys', ({ expect }) => {
    expect(getJsonValueAtPointer(objectWithSpecialChars, '/special@key')).toBe('special value')
  })

  describe('primtive cases', () => {
    it('should return primitives if root pointer is passed and data is primitive', ({ expect }) => {
      const primitives: JSONPrimitive[] = ['foo', 1, true, null]
      for (const primitive of primitives) {
        expect(getJsonValueAtPointer(primitive, '/')).toBe(primitive)
        expect(getJsonValueAtPointer(primitive, '')).toBe(primitive)
      }
    })

    it('should throw if non-root pointers are passed and data is primitive', ({ expect }) => {
      const primitives: JSONPrimitive[] = ['foo', 1, true, null]
      for (const primitive of primitives) {
        expect(() => getJsonValueAtPointer(primitive, '/name')).toThrow()
      }
    })
  })
})

// getAllJsonPointers runtime function tests
describe(getAllJsonPointers.name, () => {
  it('should generate all JSON pointers for a complex object', ({ expect }) => {
    const testObject = {
      name: 'John Doe',
      age: 30,
      address: {
        street: '123 Main St',
        city: 'Anytown',
        coordinates: {
          lat: 40.7128,
          lng: -74.0060,
        },
      },
      hobbies: ['reading', 'swimming', 'coding'],
      contacts: [
        { type: 'email', value: 'john@example.com' },
        { type: 'phone', value: '555-1234' },
      ],
    }

    const pointers = getAllJsonPointers(testObject)

    expect(pointers).toContain('')
    expect(pointers).toContain('/name')
    expect(pointers).toContain('/age')
    expect(pointers).toContain('/address')
    expect(pointers).toContain('/address/street')
    expect(pointers).toContain('/address/city')
    expect(pointers).toContain('/address/coordinates')
    expect(pointers).toContain('/address/coordinates/lat')
    expect(pointers).toContain('/address/coordinates/lng')
    expect(pointers).toContain('/hobbies')
    expect(pointers).toContain('/hobbies/0')
    expect(pointers).toContain('/hobbies/1')
    expect(pointers).toContain('/hobbies/2')
    expect(pointers).toContain('/contacts')
    expect(pointers).toContain('/contacts/0')
    expect(pointers).toContain('/contacts/0/type')
    expect(pointers).toContain('/contacts/0/value')
    expect(pointers).toContain('/contacts/1')
    expect(pointers).toContain('/contacts/1/type')
    expect(pointers).toContain('/contacts/1/value')

    // Verify pointers are sorted
    const sortedPointers = [...pointers].sort()
    expect(pointers).toEqual(sortedPointers)
  })

  it('should handle empty objects', ({ expect }) => {
    const pointers = getAllJsonPointers({})
    expect(pointers).toEqual([''])
  })

  it('should handle null and undefined', ({ expect }) => {
    expect(getAllJsonPointers(null)).toEqual([''])
    expect(getAllJsonPointers(undefined)).toEqual([''])
  })

  it('should handle primitive values', ({ expect }) => {
    expect(getAllJsonPointers('string')).toEqual([''])
    expect(getAllJsonPointers(42)).toEqual([''])
    expect(getAllJsonPointers(true)).toEqual([''])
  })

  it('should handle arrays', ({ expect }) => {
    const pointers = getAllJsonPointers(['a', 'b', 'c'])
    expect(pointers).toContain('')
    expect(pointers).toContain('/0')
    expect(pointers).toContain('/1')
    expect(pointers).toContain('/2')
  })

  it('should escape special characters in keys', ({ expect }) => {
    const objWithSpecialKeys = {
      'key/with/slash': 'value1',
      'key~with~tilde': 'value2',
    }
    const pointers = getAllJsonPointers(objWithSpecialKeys)
    expect(pointers).toContain('/key~1with~1slash')
    expect(pointers).toContain('/key~0with~0tilde')
  })

  it('should work with nested arrays and objects', ({ expect }) => {
    const complexObject = {
      users: [
        { id: 1, profile: { name: 'Alice', tags: ['admin'] } },
        { id: 2, profile: { name: 'Bob', tags: ['user', 'editor'] } },
      ],
      config: {
        features: {
          auth: true,
          logging: false,
        },
      },
    }

    const pointers = getAllJsonPointers(complexObject)

    expect(pointers).toContain('')
    expect(pointers).toContain('/users')
    expect(pointers).toContain('/users/0')
    expect(pointers).toContain('/users/0/id')
    expect(pointers).toContain('/users/0/profile')
    expect(pointers).toContain('/users/0/profile/name')
    expect(pointers).toContain('/users/0/profile/tags')
    expect(pointers).toContain('/users/0/profile/tags/0')
    expect(pointers).toContain('/users/1')
    expect(pointers).toContain('/users/1/profile/tags/0')
    expect(pointers).toContain('/users/1/profile/tags/1')
    expect(pointers).toContain('/config')
    expect(pointers).toContain('/config/features')
    expect(pointers).toContain('/config/features/auth')
    expect(pointers).toContain('/config/features/logging')
  })

  it('should integrate with getJsonValueAtPointer', ({ expect }) => {
    const testData = {
      server: {
        host: 'localhost',
        port: 3000,
        ssl: {
          enabled: true,
          cert: '/path/to/cert',
        },
      },
      features: ['auth', 'logging'],
    }

    const pointers = getAllJsonPointers(testData)

    // Test that all generated pointers can be used to retrieve values
    pointers.forEach((pointer) => {
      const value = getJsonValueAtPointer(testData, pointer)
      expect(value).toBeDefined()
    })

    // Test specific values
    expect(getJsonValueAtPointer(testData, '/server/host')).toBe('localhost')
    expect(getJsonValueAtPointer(testData, '/server/ssl/enabled')).toBe(true)
    expect(getJsonValueAtPointer(testData, '/features/0')).toBe('auth')
  })

  it('should remove duplicates', ({ expect }) => {
    const objWithDuplicateStructure = {
      a: { x: 1 },
      b: { x: 2 },
    }

    const pointers = getAllJsonPointers(objWithDuplicateStructure)

    // Should not have duplicate pointers
    const uniquePointers = [...new Set(pointers)]
    expect(pointers.length).toBe(uniquePointers.length)
  })
})

// JsonPointers utility type tests
describe('jsonPointers utility type with expectTypeOf', () => {
  describe('simple object type checking', () => {
    it('should generate correct pointer types for simple objects', () => {
      interface SimpleObject {
        readonly name: string
        readonly age: number
        readonly active: boolean
      }

      type SimplePointers = JSONPointers<SimpleObject>

      // Debug: Check what the type actually resolves to
      type _DebugType = SimplePointers

      // Test specific valid pointer literals
      expectTypeOf<''>().toExtend<SimplePointers>()
      expectTypeOf<'/name'>().toExtend<SimplePointers>()
      expectTypeOf<'/age'>().toExtend<SimplePointers>()
      expectTypeOf<'/active'>().toExtend<SimplePointers>()

      // These should cause type errors when uncommented (testing that invalid paths are rejected):
      // expectTypeOf<'/invalid'>().toExtend<SimplePointers>()
      // expectTypeOf<'/name/nested'>().toExtend<SimplePointers>()

      // Test runtime integration
      const simpleObj: SimpleObject = { name: 'test', age: 25, active: true }
      const namePointer: SimplePointers = '/name'
      expect(getJsonValueAtPointer(simpleObj, namePointer)).toBe('test')
    })

    it('should generate correct pointer types for nested objects', () => {
      interface NestedObject {
        readonly user: {
          readonly profile: {
            readonly firstName: string
            readonly lastName: string
          }
          readonly settings: {
            readonly theme: string
            readonly notifications: boolean
          }
        }
        readonly metadata: {
          readonly createdAt: string
          readonly updatedAt: string
        }
      }

      type NestedPointers = JSONPointers<NestedObject>

      // Test valid nested pointer literals
      expectTypeOf<''>().toExtend<NestedPointers>()
      expectTypeOf<'/user'>().toExtend<NestedPointers>()
      expectTypeOf<'/user/profile'>().toExtend<NestedPointers>()
      expectTypeOf<'/user/profile/firstName'>().toExtend<NestedPointers>()
      expectTypeOf<'/user/profile/lastName'>().toExtend<NestedPointers>()
      expectTypeOf<'/user/settings'>().toExtend<NestedPointers>()
      expectTypeOf<'/user/settings/theme'>().toExtend<NestedPointers>()
      expectTypeOf<'/user/settings/notifications'>().toExtend<NestedPointers>()
      expectTypeOf<'/metadata'>().toExtend<NestedPointers>()
      expectTypeOf<'/metadata/createdAt'>().toExtend<NestedPointers>()
      expectTypeOf<'/metadata/updatedAt'>().toExtend<NestedPointers>()

      // Test invalid pointers (these should cause type errors when uncommented):
      // expectTypeOf<'/invalid'>().toExtend<NestedPointers>()
      // expectTypeOf<'/user/invalid'>().toExtend<NestedPointers>()
      // expectTypeOf<'/user/profile/invalid'>().toExtend<NestedPointers>()

      // Test runtime usage
      const nestedObj: NestedObject = {
        user: {
          profile: { firstName: 'John', lastName: 'Doe' },
          settings: { theme: 'dark', notifications: true },
        },
        metadata: { createdAt: '2023-01-01', updatedAt: '2023-01-02' },
      }
      const themePointer: NestedPointers = '/user/settings/theme'
      expect(getJsonValueAtPointer(nestedObj, themePointer)).toBe('dark')
    })

    it('should handle objects with arrays correctly', () => {
      interface ObjectWithArrays {
        readonly items: readonly string[]
        readonly users: readonly {
          readonly id: number
          readonly name: string
          readonly tags: readonly string[]
        }[]
        readonly settings: {
          readonly features: readonly boolean[]
        }
      }

      type ArrayPointers = JSONPointers<ObjectWithArrays>

      // Test root and object pointers
      expectTypeOf<''>().toExtend<ArrayPointers>()
      expectTypeOf<'/items'>().toExtend<ArrayPointers>()
      expectTypeOf<'/users'>().toExtend<ArrayPointers>()
      expectTypeOf<'/settings'>().toExtend<ArrayPointers>()
      expectTypeOf<'/settings/features'>().toExtend<ArrayPointers>()

      // Test array index pointers (arrays generate /0 index paths)
      expectTypeOf<'/items/0'>().toExtend<ArrayPointers>()
      expectTypeOf<'/users/0'>().toExtend<ArrayPointers>()
      expectTypeOf<'/users/0/id'>().toExtend<ArrayPointers>()
      expectTypeOf<'/users/0/name'>().toExtend<ArrayPointers>()
      expectTypeOf<'/users/0/tags'>().toExtend<ArrayPointers>()
      expectTypeOf<'/users/0/tags/0'>().toExtend<ArrayPointers>()
      expectTypeOf<'/settings/features/0'>().toExtend<ArrayPointers>()

      // Test invalid pointers (should cause type errors when uncommented):
      // expectTypeOf<'/items/invalid'>().toExtend<ArrayPointers>()
      // expectTypeOf<'/users/0/invalid'>().toExtend<ArrayPointers>()
      // expectTypeOf<'/settings/invalid'>().toExtend<ArrayPointers>()

      // Test runtime usage
      const arrayObj: ObjectWithArrays = {
        items: ['a', 'b'],
        users: [{ id: 1, name: 'John', tags: ['admin'] }],
        settings: { features: [true, false] },
      }
      const userNamePointer: ArrayPointers = '/users/0/name'
      expect(getJsonValueAtPointer(arrayObj, userNamePointer)).toBe('John')
    })

    it('should work with primitive types', () => {
      type StringPointers = JSONPointers<string>
      type NumberPointers = JSONPointers<number>
      type BooleanPointers = JSONPointers<boolean>
      type NullPointers = JSONPointers<null>

      // Primitives should only have root pointer
      expectTypeOf<StringPointers>().toEqualTypeOf<''>()
      expectTypeOf<NumberPointers>().toEqualTypeOf<''>()
      expectTypeOf<BooleanPointers>().toEqualTypeOf<''>()
      expectTypeOf<NullPointers>().toEqualTypeOf<''>()

      // Test root pointer assignment
      expectTypeOf<''>().toExtend<StringPointers>()
      expectTypeOf<''>().toExtend<NumberPointers>()
      expectTypeOf<''>().toExtend<BooleanPointers>()
      expectTypeOf<''>().toExtend<NullPointers>()

      // Invalid paths should cause type errors (when uncommented):
      // expectTypeOf<'/invalid'>().toExtend<StringPointers>()
      // expectTypeOf<'/invalid'>().toExtend<NumberPointers>()

      // Test runtime usage
      const stringPointer: StringPointers = ''
      expect(getJsonValueAtPointer('hello', stringPointer)).toBe('hello')
    })

    it('should handle optional properties correctly', () => {
      interface OptionalObject {
        readonly required: string
        readonly optional?: string
        readonly nested?: {
          readonly value: number
          readonly optional?: boolean
        }
      }

      type OptionalPointers = JSONPointers<OptionalObject>

      // All properties should be reachable regardless of optionality
      expectTypeOf<''>().toExtend<OptionalPointers>()
      expectTypeOf<'/required'>().toExtend<OptionalPointers>()
      expectTypeOf<'/optional'>().toExtend<OptionalPointers>()
      expectTypeOf<'/nested'>().toExtend<OptionalPointers>()
      expectTypeOf<'/nested/value'>().toExtend<OptionalPointers>()
      expectTypeOf<'/nested/optional'>().toExtend<OptionalPointers>()

      // Invalid paths should cause type errors (when uncommented):
      // expectTypeOf<'/invalid'>().toExtend<OptionalPointers>()
      // expectTypeOf<'/nested/invalid'>().toExtend<OptionalPointers>()

      // Test runtime usage
      const optObj: OptionalObject = { required: 'test', optional: 'value' }
      const requiredPointer: OptionalPointers = '/required'
      expect(getJsonValueAtPointer(optObj, requiredPointer)).toBe('test')
    })

    it('should handle union types correctly', () => {
      interface UnionObject {
        readonly data: string | { readonly value: number }
        readonly config: { readonly type: 'A', readonly a: string } | { readonly type: 'B', readonly b: number }
      }

      type UnionPointers = JSONPointers<UnionObject>

      // Basic paths should work
      expectTypeOf('').toMatchObjectType<UnionPointers>()
      expectTypeOf('/data').toMatchObjectType<UnionPointers>()
      expectTypeOf('/config').toMatchObjectType<UnionPointers>()

      // Union member paths should be accessible
      expectTypeOf('/data/value').toMatchObjectType<UnionPointers>()
      expectTypeOf('/config/type').toMatchObjectType<UnionPointers>()
      expectTypeOf('/config/a').toMatchObjectType<UnionPointers>()
      expectTypeOf('/config/b').toMatchObjectType<UnionPointers>()
    })

    it('should handle complex nested structures with arrays and objects', () => {
      interface ComplexStructure {
        readonly api: {
          readonly endpoints: readonly {
            readonly method: 'GET' | 'POST'
            readonly path: string
            readonly params?: readonly {
              readonly name: string
              readonly type: string
              readonly required: boolean
            }[]
          }[]
          readonly config: {
            readonly baseUrl: string
            readonly timeout: number
            readonly headers: {
              readonly [key: string]: string
            }
          }
        }
        readonly features: readonly string[]
      }

      type ComplexPointers = JSONPointers<ComplexStructure>

      // Test deep nesting paths
      expectTypeOf('').toMatchObjectType<ComplexPointers>()
      expectTypeOf('/api').toMatchObjectType<ComplexPointers>()
      expectTypeOf('/api/endpoints').toMatchObjectType<ComplexPointers>()
      expectTypeOf('/api/endpoints/0').toMatchObjectType<ComplexPointers>()
      expectTypeOf('/api/endpoints/0/method').toMatchObjectType<ComplexPointers>()
      expectTypeOf('/api/endpoints/0/path').toMatchObjectType<ComplexPointers>()
      expectTypeOf('/api/endpoints/0/params').toMatchObjectType<ComplexPointers>()
      expectTypeOf('/api/endpoints/0/params/0').toMatchObjectType<ComplexPointers>()
      expectTypeOf('/api/endpoints/0/params/0/name').toMatchObjectType<ComplexPointers>()
      expectTypeOf('/api/endpoints/0/params/0/type').toMatchObjectType<ComplexPointers>()
      expectTypeOf('/api/endpoints/0/params/0/required').toMatchObjectType<ComplexPointers>()
      expectTypeOf('/api/config').toMatchObjectType<ComplexPointers>()
      expectTypeOf('/api/config/baseUrl').toMatchObjectType<ComplexPointers>()
      expectTypeOf('/api/config/timeout').toMatchObjectType<ComplexPointers>()
      expectTypeOf('/api/config/headers').toMatchObjectType<ComplexPointers>()
      expectTypeOf('/features').toMatchObjectType<ComplexPointers>()
      expectTypeOf('/features/0').toMatchObjectType<ComplexPointers>()

      // Test invalid paths
      expectTypeOf('/api/invalid').not.toMatchObjectType<ComplexPointers>()
      expectTypeOf('/api/endpoints/0/invalid').not.toMatchObjectType<ComplexPointers>()
      expectTypeOf('/api/config/invalid').not.toMatchObjectType<ComplexPointers>()
    })
  })

  describe('integration type checking', () => {
    it('should work seamlessly with getJsonValueAtPointer function', () => {
      interface TestData {
        readonly user: {
          readonly id: number
          readonly profile: {
            readonly name: string
            readonly email: string
          }
        }
        readonly tags: readonly string[]
      }

      const testData: TestData = {
        user: {
          id: 1,
          profile: {
            name: 'John',
            email: 'john@example.com',
          },
        },
        tags: ['admin', 'user'],
      }

      type TestPointers = JSONPointers<TestData>

      // Test that function parameter types work correctly
      expectTypeOf(getJsonValueAtPointer<TestData>).parameter(1).toMatchObjectType<TestPointers>()

      // Test specific pointer usage
      const namePointer: TestPointers = '/user/profile/name'
      const tagsPointer: TestPointers = '/tags'
      const tagPointer: TestPointers = '/tags/0'

      expectTypeOf(namePointer).toMatchObjectType<TestPointers>()
      expectTypeOf(tagsPointer).toMatchObjectType<TestPointers>()
      expectTypeOf(tagPointer).toMatchObjectType<TestPointers>()

      // Verify runtime usage works as expected
      expect(getJsonValueAtPointer(testData, namePointer)).toBe('John')
      expect(getJsonValueAtPointer(testData, tagsPointer)).toEqual(['admin', 'user'])
      expect(getJsonValueAtPointer(testData, tagPointer)).toBe('admin')
    })

    it('should enforce type safety in function calls', () => {
      interface User {
        readonly name: string
        readonly age: number
      }

      const user: User = { name: 'Alice', age: 25 }
      type UserPointers = JSONPointers<User>

      // Valid pointer should be accepted by function
      const validPointer: UserPointers = '/name'
      expectTypeOf(validPointer).toMatchObjectType<UserPointers>()

      // Test that the function accepts our typed pointer
      expectTypeOf(getJsonValueAtPointer<User>).parameter(1).toMatchObjectType<UserPointers>()

      // Verify runtime behavior
      expect(getJsonValueAtPointer(user, validPointer)).toBe('Alice')
    })
  })

  describe('edge cases and boundary conditions', () => {
    it('should handle empty object types', () => {
      interface EmptyObject {}
      type EmptyPointers = JSONPointers<EmptyObject>

      // Empty object should only have root pointer
      expectTypeOf<EmptyPointers>().toEqualTypeOf<''>()
      expectTypeOf('').toMatchObjectType<EmptyPointers>()
      expectTypeOf('/invalid').not.toMatchObjectType<EmptyPointers>()
    })

    it('should handle objects with index signatures', () => {
      interface IndexObject {
        readonly [key: string]: string | number
        readonly fixed: boolean
      }

      type IndexPointers = JSONPointers<IndexObject>

      // Should include fixed properties and generic index access
      expectTypeOf('').toMatchObjectType<IndexPointers>()
      expectTypeOf('/fixed').toMatchObjectType<IndexPointers>()

      // Index signatures make many paths potentially valid
      // The exact behavior depends on the type system's handling of index signatures
    })

    it('should work with readonly array types', () => {
      type ReadonlyArrayType = readonly string[]
      type ArrayPointers = JSONPointers<ReadonlyArrayType>

      // Array should have root and index pointers
      expectTypeOf('').toMatchObjectType<ArrayPointers>()
      expectTypeOf('/0').toMatchObjectType<ArrayPointers>()
    })

    it('should handle deeply nested optional chains', () => {
      interface DeepOptional {
        readonly a?: {
          readonly b?: {
            readonly c?: {
              readonly value: string
            }
          }
        }
      }

      type DeepPointers = JSONPointers<DeepOptional>

      expectTypeOf('').toMatchObjectType<DeepPointers>()
      expectTypeOf('/a').toMatchObjectType<DeepPointers>()
      expectTypeOf('/a/b').toMatchObjectType<DeepPointers>()
      expectTypeOf('/a/b/c').toMatchObjectType<DeepPointers>()
      expectTypeOf('/a/b/c/value').toMatchObjectType<DeepPointers>()
    })
  })
})

// encodeJsonPointer tests
describe(encodePointer.name, () => {
  it('should encode tildes as ~0', ({ expect }) => {
    expect(encodePointer('~')).toBe('~0')
    expect(encodePointer('hello~world')).toBe('hello~0world')
    expect(encodePointer('~start')).toBe('~0start')
    expect(encodePointer('end~')).toBe('end~0')
  })

  it('should encode slashes as ~1', ({ expect }) => {
    expect(encodePointer('/')).toBe('~1')
    expect(encodePointer('hello/world')).toBe('hello~1world')
    expect(encodePointer('/start')).toBe('~1start')
    expect(encodePointer('end/')).toBe('end~1')
  })

  it('should handle multiple tildes and slashes', ({ expect }) => {
    expect(encodePointer('~/')).toBe('~0~1')
    expect(encodePointer('/~')).toBe('~1~0')
    expect(encodePointer('~/~')).toBe('~0~1~0')
    expect(encodePointer('a~/~b')).toBe('a~0~1~0b')
  })

  it('should handle consecutive special characters', ({ expect }) => {
    expect(encodePointer('~~')).toBe('~0~0')
    expect(encodePointer('//')).toBe('~1~1')
    expect(encodePointer('~//')).toBe('~0~1~1')
    expect(encodePointer('//~')).toBe('~1~1~0')
  })

  it('should not modify regular characters', ({ expect }) => {
    expect(encodePointer('hello')).toBe('hello')
    expect(encodePointer('123')).toBe('123')
    expect(encodePointer('hello-world_test')).toBe('hello-world_test')
    expect(encodePointer('')).toBe('')
  })

  it('should handle complex strings with mixed content', ({ expect }) => {
    expect(encodePointer('user/profile~settings')).toBe('user~1profile~0settings')
    expect(encodePointer('api/v1/users/~id')).toBe('api~1v1~1users~1~0id')
    expect(encodePointer('config~database/host')).toBe('config~0database~1host')
  })

  it('should handle strings with special characters that do not need encoding', ({ expect }) => {
    expect(encodePointer('hello@world')).toBe('hello@world')
    expect(encodePointer('test#hash')).toBe('test#hash')
    expect(encodePointer('query?param=value')).toBe('query?param=value')
    expect(encodePointer('path&other')).toBe('path&other')
  })

  it('should handle realistic JSON property names', ({ expect }) => {
    // URL-like paths
    expect(encodePointer('https://api.example.com/users')).toBe('https:~1~1api.example.com~1users')
    expect(encodePointer('api/v1/users/123')).toBe('api~1v1~1users~1123')

    // File paths
    expect(encodePointer('/home/user/.config/app.json')).toBe('~1home~1user~1.config~1app.json')
    expect(encodePointer('C:\\Users\\Documents\\file~backup.txt')).toBe('C:\\Users\\Documents\\file~0backup.txt')

    // Email addresses with special segments
    expect(encodePointer('user@domain.com/inbox')).toBe('user@domain.com~1inbox')
    expect(encodePointer('support~team@company.org')).toBe('support~0team@company.org')

    // Database column names
    expect(encodePointer('user_profile/settings~cache')).toBe('user_profile~1settings~0cache')
    expect(encodePointer('table.column/index')).toBe('table.column~1index')

    // Kubernetes resource names
    expect(encodePointer('namespace/pod-name/containers/0')).toBe('namespace~1pod-name~1containers~10')
    expect(encodePointer('service/load-balancer~external')).toBe('service~1load-balancer~0external')
  })

  it('should handle form field names and UI component paths', ({ expect }) => {
    // Form field names with special characters
    expect(encodePointer('user[profile]/name')).toBe('user[profile]~1name')
    expect(encodePointer('settings/theme~preference')).toBe('settings~1theme~0preference')
    expect(encodePointer('form/address/street~line~1')).toBe('form~1address~1street~0line~01')

    // React component props paths
    expect(encodePointer('props/children/0/props/className')).toBe('props~1children~10~1props~1className')
    expect(encodePointer('state/user~data/profile')).toBe('state~1user~0data~1profile')

    // CSS selector-like paths
    expect(encodePointer('.navbar/ul/li/a')).toBe('.navbar~1ul~1li~1a')
    expect(encodePointer('#sidebar/.content~wrapper')).toBe('#sidebar~1.content~0wrapper')
  })
})

// decodeJsonPointer tests
describe(decodePointer.name, () => {
  it('should decode ~0 as tildes', ({ expect }) => {
    expect(decodePointer('~0')).toBe('~')
    expect(decodePointer('hello~0world')).toBe('hello~world')
    expect(decodePointer('~0start')).toBe('~start')
    expect(decodePointer('end~0')).toBe('end~')
  })

  it('should decode ~1 as slashes', ({ expect }) => {
    expect(decodePointer('~1')).toBe('/')
    expect(decodePointer('hello~1world')).toBe('hello/world')
    expect(decodePointer('~1start')).toBe('/start')
    expect(decodePointer('end~1')).toBe('end/')
  })

  it('should handle multiple encoded sequences', ({ expect }) => {
    expect(decodePointer('~0~1')).toBe('~/')
    expect(decodePointer('~1~0')).toBe('/~')
    expect(decodePointer('~0~1~0')).toBe('~/~')
    expect(decodePointer('a~0~1~0b')).toBe('a~/~b')
  })

  it('should handle consecutive encoded sequences', ({ expect }) => {
    expect(decodePointer('~0~0')).toBe('~~')
    expect(decodePointer('~1~1')).toBe('//')
    expect(decodePointer('~0~1~1')).toBe('~//')
    expect(decodePointer('~1~1~0')).toBe('//~')
  })

  it('should not modify regular characters', ({ expect }) => {
    expect(decodePointer('hello')).toBe('hello')
    expect(decodePointer('123')).toBe('123')
    expect(decodePointer('hello-world_test')).toBe('hello-world_test')
    expect(decodePointer('')).toBe('')
  })

  it('should handle complex encoded strings', ({ expect }) => {
    expect(decodePointer('user~1profile~0settings')).toBe('user/profile~settings')
    expect(decodePointer('api~1v1~1users~1~0id')).toBe('api/v1/users/~id')
    expect(decodePointer('config~0database~1host')).toBe('config~database/host')
  })

  it('should handle strings that do not contain encoded sequences', ({ expect }) => {
    expect(decodePointer('hello@world')).toBe('hello@world')
    expect(decodePointer('test#hash')).toBe('test#hash')
    expect(decodePointer('query?param=value')).toBe('query?param=value')
    expect(decodePointer('path&other')).toBe('path&other')
  })

  it('should decode realistic encoded JSON property names', ({ expect }) => {
    // URL-like paths
    expect(decodePointer('https:~1~1api.example.com~1users')).toBe('https://api.example.com/users')
    expect(decodePointer('api~1v1~1users~1123')).toBe('api/v1/users/123')

    // File paths
    expect(decodePointer('~1home~1user~1.config~1app.json')).toBe('/home/user/.config/app.json')
    expect(decodePointer('C:\\Users\\Documents\\file~0backup.txt')).toBe('C:\\Users\\Documents\\file~backup.txt')

    // Email addresses with special segments
    expect(decodePointer('user@domain.com~1inbox')).toBe('user@domain.com/inbox')
    expect(decodePointer('support~0team@company.org')).toBe('support~team@company.org')

    // Database column names
    expect(decodePointer('user_profile~1settings~0cache')).toBe('user_profile/settings~cache')
    expect(decodePointer('table.column~1index')).toBe('table.column/index')

    // Kubernetes resource names
    expect(decodePointer('namespace~1pod-name~1containers~10')).toBe('namespace/pod-name/containers/0')
    expect(decodePointer('service~1load-balancer~0external')).toBe('service/load-balancer~external')
  })

  it('should decode form field names and UI component paths', ({ expect }) => {
    // Form field names with special characters
    expect(decodePointer('user[profile]~1name')).toBe('user[profile]/name')
    expect(decodePointer('settings~1theme~0preference')).toBe('settings/theme~preference')
    expect(decodePointer('form~1address~1street~0line~01')).toBe('form/address/street~line~1')

    // React component props paths
    expect(decodePointer('props~1children~10~1props~1className')).toBe('props/children/0/props/className')
    expect(decodePointer('state~1user~0data~1profile')).toBe('state/user~data/profile')

    // CSS selector-like paths
    expect(decodePointer('.navbar~1ul~1li~1a')).toBe('.navbar/ul/li/a')
    expect(decodePointer('#sidebar~1.content~0wrapper')).toBe('#sidebar/.content~wrapper')
  })

  it('should handle configuration and API endpoint patterns', ({ expect }) => {
    // Configuration keys that might contain special characters
    expect(decodePointer('config~1database~1connection~0string')).toBe('config/database/connection~string')
    expect(decodePointer('env~1NODE~0ENV~1production')).toBe('env/NODE~ENV/production')
    expect(decodePointer('secrets~1api~0key~1oauth')).toBe('secrets/api~key/oauth')

    // GraphQL field paths
    expect(decodePointer('query~1user~1profile~1address~1street~0address')).toBe('query/user/profile/address/street~address')
    expect(decodePointer('mutation~1createUser~1input~1data')).toBe('mutation/createUser/input/data')

    // Microservice endpoints
    expect(decodePointer('services~1user~0service~1api~1v2~1profile')).toBe('services/user~service/api/v2/profile')
    expect(decodePointer('gateway~1routing~1rules~1auth~0required')).toBe('gateway/routing/rules/auth~required')
  })

  it('should handle partial sequences that are not valid encodings', ({ expect }) => {
    expect(decodePointer('~2')).toBe('~2')
    expect(decodePointer('~')).toBe('~')
    expect(decodePointer('~a')).toBe('~a')
    expect(decodePointer('hello~world')).toBe('hello~world')
  })

  it('should be inverse of encodeJsonPointer', ({ expect }) => {
    const testStrings = [
      'hello/world',
      'test~value',
      '~/test',
      'complex~/~string',
      'api/v1/users/~id',
      'normal-string',
      '',
      '~',
      '/',
      '~/',
      '/~',
      // Realistic examples
      'https://api.example.com/users',
      '/home/user/.config/app.json',
      'user@domain.com/inbox',
      'support~team@company.org',
      'namespace/pod-name/containers/0',
      'props/children/0/props/className',
      'config/database/connection~string',
      'services/user~service/api/v2/profile',
      'form/address/street~line~1',
      '.navbar/ul/li/a',
    ]

    testStrings.forEach((str) => {
      const encoded = encodePointer(str)
      const decoded = decodePointer(encoded)
      expect(decoded).toBe(str)
    })
  })

  it('should work with real-world JSON pointer scenarios', ({ expect }) => {
    // Testing common use cases where encode/decode would be used
    const scenarios = [
      {
        description: 'API endpoint with special characters',
        original: 'api/v1/users/john@doe.com/profile',
        expectedEncoded: 'api~1v1~1users~1john@doe.com~1profile',
      },
      {
        description: 'File path with tilde home directory',
        original: '~/documents/file~backup.json',
        expectedEncoded: '~0~1documents~1file~0backup.json',
      },
      {
        description: 'Configuration key with both special chars',
        original: 'config/app~settings/database/connection~string',
        expectedEncoded: 'config~1app~0settings~1database~1connection~0string',
      },
      {
        description: 'React component path',
        original: 'components/UserProfile/props/user~data/profile',
        expectedEncoded: 'components~1UserProfile~1props~1user~0data~1profile',
      },
      {
        description: 'URL with query parameters',
        original: 'https://api.com/search?q=user~data&sort=name',
        expectedEncoded: 'https:~1~1api.com~1search?q=user~0data&sort=name',
      },
    ]

    scenarios.forEach(({ original, expectedEncoded }) => {
      // Test encoding
      const actualEncoded = encodePointer(original)
      expect(actualEncoded).toBe(expectedEncoded)

      // Test decoding
      const actualDecoded = decodePointer(expectedEncoded)
      expect(actualDecoded).toBe(original)

      // Test round-trip
      const roundTrip = decodePointer(encodePointer(original))
      expect(roundTrip).toBe(original)
    })
  })
})
