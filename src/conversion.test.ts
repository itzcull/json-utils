import type {
  InferFromSchema,
  JsonPointers,
  JSONSchemaArray,
  JSONSchemaObject,
  MakeSchemaOptional,
  MergeSchemas,
  OmitSchemaProperties,
  PartialSchema,
  PickSchemaProperties,
} from './types'
import { describe, expectTypeOf, it } from 'vitest'
import {
  createSchemaAccessor,
  jsonPointerToSchemaPointer,
  schemaPointerToJsonPointer,
  schemasCompatible,
  transformSchemaData,
  validateDataAgainstSchemaType,
} from './conversion'

// Test schemas for validation
const userSchema = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    age: { type: 'number' },
    isActive: { type: 'boolean' },
    tags: {
      type: 'array',
      items: { type: 'string' },
    },
  },
  required: ['name', 'age'],
} as const satisfies JSONSchemaObject

const profileSchema = {
  type: 'object',
  properties: {
    user: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        settings: {
          type: 'object',
          properties: {
            theme: { type: 'string' },
          },
        },
      },
      required: ['name'],
    },
  },
} as const satisfies JSONSchemaObject

const arraySchema = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      id: { type: 'number' },
      name: { type: 'string' },
    },
    required: ['id'],
  },
} as const satisfies JSONSchemaArray

describe('validateDataAgainstSchemaType', () => {
  it('should validate object data against schema', ({ expect }) => {
    const validData = { name: 'John', age: 30, isActive: true, tags: ['admin'] }
    const invalidData = { name: 'John' } // missing required age

    expect(validateDataAgainstSchemaType(validData, userSchema)).toBe(true)
    expect(validateDataAgainstSchemaType(invalidData, userSchema)).toBe(false)
  })

  it('should provide correct type inference', ({ expect }) => {
    const data: unknown = { name: 'John', age: 30, isActive: true }

    if (validateDataAgainstSchemaType(data, userSchema)) {
      // TypeScript should infer the correct type here
      expectTypeOf(data).toMatchTypeOf<{
        name: string
        age: number
        isActive?: boolean
        tags?: string[]
      }>()

      expect(data.name).toBe('John')
      expect(data.age).toBe(30)
    }
  })

  it('should validate primitive types', ({ expect }) => {
    const stringSchema = { type: 'string' } as const
    const numberSchema = { type: 'number' } as const
    const booleanSchema = { type: 'boolean' } as const
    const nullSchema = { type: 'null' } as const

    expect(validateDataAgainstSchemaType('hello', stringSchema)).toBe(true)
    expect(validateDataAgainstSchemaType(42, stringSchema)).toBe(false)

    expect(validateDataAgainstSchemaType(42, numberSchema)).toBe(true)
    expect(validateDataAgainstSchemaType('42', numberSchema)).toBe(false)

    expect(validateDataAgainstSchemaType(true, booleanSchema)).toBe(true)
    expect(validateDataAgainstSchemaType('true', booleanSchema)).toBe(false)

    expect(validateDataAgainstSchemaType(null, nullSchema)).toBe(true)
    expect(validateDataAgainstSchemaType(undefined, nullSchema)).toBe(false)
  })

  it('should validate array schemas', ({ expect }) => {
    const validArray = [{ id: 1, name: 'Alice' }, { id: 2 }]
    const invalidArray = [{ name: 'Alice' }] // missing required id

    expect(validateDataAgainstSchemaType(validArray, arraySchema)).toBe(true)
    expect(validateDataAgainstSchemaType(invalidArray, arraySchema)).toBe(false)
  })

  it('should validate nested object schemas', ({ expect }) => {
    const validNested = {
      user: {
        name: 'John',
        settings: {
          theme: 'dark',
        },
      },
    }
    const invalidNested = {
      user: {
        settings: {
          theme: 'dark',
        },
      },
    } // missing user.name

    expect(validateDataAgainstSchemaType(validNested, profileSchema)).toBe(true)
    expect(validateDataAgainstSchemaType(invalidNested, profileSchema)).toBe(false)
  })

  it('should handle optional properties correctly', ({ expect }) => {
    const dataWithOptional = { name: 'John', age: 30, isActive: true }
    const dataWithoutOptional = { name: 'John', age: 30 }

    expect(validateDataAgainstSchemaType(dataWithOptional, userSchema)).toBe(true)
    expect(validateDataAgainstSchemaType(dataWithoutOptional, userSchema)).toBe(true)
  })
})

describe('jsonPointerToSchemaPointer', () => {
  it('should convert data pointers to schema pointers', ({ expect }) => {
    expect(jsonPointerToSchemaPointer('/user/name')).toBe('/properties/user/properties/name')
    expect(jsonPointerToSchemaPointer('/users/0/id')).toBe('/properties/users/items/properties/id')
    expect(jsonPointerToSchemaPointer('/tags/1')).toBe('/properties/tags/items')
    expect(jsonPointerToSchemaPointer('/config/0/enabled')).toBe('/properties/config/items/properties/enabled')
  })

  it('should handle root pointer', ({ expect }) => {
    expect(jsonPointerToSchemaPointer('')).toBe('/')
    expect(jsonPointerToSchemaPointer('/')).toBe('/')
  })

  it('should handle simple property paths', ({ expect }) => {
    expect(jsonPointerToSchemaPointer('/name')).toBe('/properties/name')
    expect(jsonPointerToSchemaPointer('/age')).toBe('/properties/age')
  })

  it('should handle nested properties', ({ expect }) => {
    expect(jsonPointerToSchemaPointer('/user/profile/name')).toBe('/properties/user/properties/profile/properties/name')
  })

  it('should handle mixed array and object paths', ({ expect }) => {
    expect(jsonPointerToSchemaPointer('/users/0/profile/settings/0')).toBe('/properties/users/items/properties/profile/properties/settings/items')
  })
})

describe('schemaPointerToJsonPointer', () => {
  it('should convert schema pointers to data pointers', ({ expect }) => {
    expect(schemaPointerToJsonPointer('/properties/user/properties/name')).toBe('/user/name')
    expect(schemaPointerToJsonPointer('/properties/users/items/properties/id')).toBe('/users/0/id')
    expect(schemaPointerToJsonPointer('/properties/tags/items')).toBe('/tags/0')
  })

  it('should handle root pointer', ({ expect }) => {
    expect(schemaPointerToJsonPointer('')).toBe('/')
    expect(schemaPointerToJsonPointer('/')).toBe('/')
  })

  it('should handle complex nested paths', ({ expect }) => {
    expect(schemaPointerToJsonPointer('/properties/api/properties/users/items/properties/profile/properties/name'))
      .toBe('/api/users/0/profile/name')
  })

  it('should be inverse of jsonPointerToSchemaPointer', ({ expect }) => {
    const testPointers = [
      '/user/name',
      '/users/0/id',
      '/config/settings/theme',
      '/data/0/nested/0/value',
    ]

    testPointers.forEach((pointer) => {
      const schemaPointer = jsonPointerToSchemaPointer(pointer)
      const backToDataPointer = schemaPointerToJsonPointer(schemaPointer)
      expect(backToDataPointer).toBe(pointer)
    })
  })
})

describe('schemasCompatible', () => {
  it('should detect compatible object schemas', ({ expect }) => {
    const baseSchema = {
      type: 'object',
      properties: {
        name: { type: 'string' },
        age: { type: 'number' },
      },
      required: ['name', 'age'],
    } as const satisfies JSONSchemaObject

    const extendedSchema = {
      type: 'object',
      properties: {
        name: { type: 'string' },
        age: { type: 'number' },
        email: { type: 'string' },
      },
      required: ['name', 'age'],
    } as const satisfies JSONSchemaObject

    expect(schemasCompatible(baseSchema, extendedSchema)).toBe(true)
    expect(schemasCompatible(extendedSchema, baseSchema)).toBe(true)
  })

  it('should detect incompatible schemas with different required fields', ({ expect }) => {
    const schema1 = {
      type: 'object',
      properties: {
        name: { type: 'string' },
      },
      required: ['name'],
    } as const satisfies JSONSchemaObject

    const schema2 = {
      type: 'object',
      properties: {
        name: { type: 'string' },
        age: { type: 'number' },
      },
      required: ['name', 'age'],
    } as const satisfies JSONSchemaObject

    expect(schemasCompatible(schema1, schema2)).toBe(false) // schema1 data missing age field required by schema2
    expect(schemasCompatible(schema2, schema1)).toBe(true) // schema2 data works with schema1 (age is ignored)
  })

  it('should detect incompatible schemas with different types', ({ expect }) => {
    const stringSchema = { type: 'string' } as const
    const numberSchema = { type: 'number' } as const

    expect(schemasCompatible(stringSchema, numberSchema)).toBe(false)
    expect(schemasCompatible(numberSchema, stringSchema)).toBe(false)
  })

  it('should handle array schema compatibility', ({ expect }) => {
    const stringArraySchema = {
      type: 'array',
      items: { type: 'string' },
    } as const satisfies JSONSchemaArray

    const numberArraySchema = {
      type: 'array',
      items: { type: 'number' },
    } as const satisfies JSONSchemaArray

    expect(schemasCompatible(stringArraySchema, stringArraySchema)).toBe(true)
    expect(schemasCompatible(stringArraySchema, numberArraySchema)).toBe(false)
  })
})

describe('createSchemaAccessor', () => {
  it('should create type-safe accessor for valid data', ({ expect }) => {
    const accessor = createSchemaAccessor(userSchema)
    const validData = { name: 'John', age: 30, isActive: true, tags: ['admin'] }

    const result = accessor(validData)
    expect(result).not.toBeNull()

    if (result) {
      expect(result.data.name).toBe('John')
      expect(result.data.age).toBe(30)
      expect(result.get('/name')).toBe('John')
      expect(result.get('/age')).toBe(30)
      expect(result.get('/isActive')).toBe(true)
      expect(result.get('/tags/0')).toBe('admin')
    }
  })

  it('should return null for invalid data', ({ expect }) => {
    const accessor = createSchemaAccessor(userSchema)
    const invalidData = { name: 'John' } // missing required age

    const result = accessor(invalidData)
    expect(result).toBeNull()
  })

  it('should provide type-safe pointer access', ({ expect }) => {
    const accessor = createSchemaAccessor(profileSchema)
    const validData = {
      user: {
        name: 'John',
        settings: {
          theme: 'dark',
        },
      },
    }

    const result = accessor(validData)
    expect(result).not.toBeNull()

    if (result) {
      expect(result.get('/user/name')).toBe('John')
      expect(result.get('/user/settings/theme')).toBe('dark')
    }
  })

  it('should handle nested object access', ({ expect }) => {
    const nestedSchema = {
      type: 'object',
      properties: {
        data: {
          type: 'object',
          properties: {
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'number' },
                  name: { type: 'string' },
                },
              },
            },
          },
        },
      },
    } as const satisfies JSONSchemaObject

    const accessor = createSchemaAccessor(nestedSchema)
    const data = {
      data: {
        items: [
          { id: 1, name: 'Alice' },
          { id: 2, name: 'Bob' },
        ],
      },
    }

    const result = accessor(data)
    expect(result).not.toBeNull()

    if (result) {
      expect(result.get('/data/items/0/name')).toBe('Alice')
      expect(result.get('/data/items/1/id')).toBe(2)
    }
  })
})

describe('transformSchemaData', () => {
  it('should transform data between compatible schemas', ({ expect }) => {
    const sourceSchema = {
      type: 'object',
      properties: {
        fullName: { type: 'string' },
        age: { type: 'number' },
      },
      required: ['fullName', 'age'],
    } as const satisfies JSONSchemaObject

    const targetSchema = {
      type: 'object',
      properties: {
        firstName: { type: 'string' },
        lastName: { type: 'string' },
        age: { type: 'number' },
      },
      required: ['firstName', 'lastName', 'age'],
    } as const satisfies JSONSchemaObject

    const sourceData = { fullName: 'John Doe', age: 30 }

    const result = transformSchemaData(
      sourceData,
      sourceSchema,
      targetSchema,
      (source) => {
        const [firstName, lastName] = source.fullName.split(' ')
        return {
          firstName,
          lastName: lastName || '',
          age: source.age,
        }
      },
    )

    expect(result).toEqual({
      firstName: 'John',
      lastName: 'Doe',
      age: 30,
    })
  })

  it('should return null for invalid source data', ({ expect }) => {
    const sourceSchema = {
      type: 'object',
      properties: {
        name: { type: 'string' },
      },
      required: ['name'],
    } as const satisfies JSONSchemaObject

    const targetSchema = {
      type: 'object',
      properties: {
        title: { type: 'string' },
      },
      required: ['title'],
    } as const satisfies JSONSchemaObject

    const invalidData = {} // missing required name

    const result = transformSchemaData(
      invalidData,
      sourceSchema,
      targetSchema,
      _source => ({ title: _source.name }),
    )

    expect(result).toBeNull()
  })

  it('should return null for invalid transformed data', ({ expect }) => {
    const sourceSchema = {
      type: 'object',
      properties: {
        name: { type: 'string' },
      },
      required: ['name'],
    } as const satisfies JSONSchemaObject

    const targetSchema = {
      type: 'object',
      properties: {
        title: { type: 'string' },
      },
      required: ['title'],
    } as const satisfies JSONSchemaObject

    const sourceData = { name: 'John' }

    // Transform that produces invalid target data
    const result = transformSchemaData(
      sourceData,
      sourceSchema,
      targetSchema,
      _source => ({}) as any, // Missing required title
    )

    expect(result).toBeNull()
  })

  it('should handle transformation errors gracefully', ({ expect }) => {
    const sourceSchema = {
      type: 'object',
      properties: {
        value: { type: 'string' },
      },
      required: ['value'],
    } as const satisfies JSONSchemaObject

    const targetSchema = {
      type: 'object',
      properties: {
        result: { type: 'number' },
      },
      required: ['result'],
    } as const satisfies JSONSchemaObject

    const sourceData = { value: 'not-a-number' }

    const result = transformSchemaData(
      sourceData,
      sourceSchema,
      targetSchema,
      (_source) => {
        throw new Error('Transformation failed')
      },
    )

    expect(result).toBeNull()
  })
})

// Type-level tests for utility types
describe('schema utility types', () => {
  it('should work with InferFromSchema', () => {
    type UserType = InferFromSchema<typeof userSchema>

    expectTypeOf<UserType>().toEqualTypeOf<{
      name: string
      age: number
      isActive?: boolean
      tags?: string[]
    }>()
  })

  it('should work with MakeSchemaOptional', () => {
    type OptionalEmailSchema = MakeSchemaOptional<typeof userSchema, 'age'>
    type OptionalEmailType = InferFromSchema<OptionalEmailSchema>

    expectTypeOf<OptionalEmailType>().toEqualTypeOf<{
      name: string
      age?: number
      isActive?: boolean
      tags?: string[]
    }>()
  })

  it('should work with PartialSchema', () => {
    type PartialUserSchema = PartialSchema<typeof userSchema>
    type PartialUserType = InferFromSchema<PartialUserSchema>

    expectTypeOf<PartialUserType>().toEqualTypeOf<{
      name?: string
      age?: number
      isActive?: boolean
      tags?: string[]
    }>()
  })

  it('should work with PickSchemaProperties', () => {
    type PublicSchema = PickSchemaProperties<typeof userSchema, 'name' | 'isActive'>
    type PublicType = InferFromSchema<PublicSchema>

    expectTypeOf<PublicType>().toEqualTypeOf<{
      name: string
      isActive?: boolean
    }>()
  })

  it('should work with OmitSchemaProperties', () => {
    type MinimalSchema = OmitSchemaProperties<typeof userSchema, 'tags' | 'isActive'>
    type MinimalType = InferFromSchema<MinimalSchema>

    expectTypeOf<MinimalType>().toEqualTypeOf<{
      name: string
      age: number
    }>()
  })

  it('should work with MergeSchemas', () => {
    const _schema1 = {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
      },
      required: ['id'],
    } as const satisfies JSONSchemaObject

    const _schema2 = {
      type: 'object',
      properties: {
        name: { type: 'string' },
        email: { type: 'string' },
      },
      required: ['email'],
    } as const satisfies JSONSchemaObject

    type MergedSchema = MergeSchemas<typeof _schema1, typeof _schema2>
    type MergedType = InferFromSchema<MergedSchema>

    // The merged schema should have all properties with appropriate required/optional status
    expectTypeOf<MergedType>().toMatchTypeOf<{
      id: string
      name: string
      email: string
    }>()
  })
})

describe('jsonPointers integration with schema types', () => {
  it('should generate correct pointer types for schema-inferred data', () => {
    type UserType = InferFromSchema<typeof userSchema>
    type UserPointers = JsonPointers<UserType>

    // Test that specific pointers are included in the union
    expectTypeOf<'/name'>().toMatchTypeOf<UserPointers>()
    expectTypeOf<'/age'>().toMatchTypeOf<UserPointers>()
    expectTypeOf<'/isActive'>().toMatchTypeOf<UserPointers>()
    expectTypeOf<'/tags'>().toMatchTypeOf<UserPointers>()
    expectTypeOf<'/tags/0'>().toMatchTypeOf<UserPointers>()

    // Test that invalid pointers are excluded
    expectTypeOf<'/invalid'>().not.toMatchTypeOf<UserPointers>()
  })

  it('should work with nested schema types', () => {
    type ProfileType = InferFromSchema<typeof profileSchema>
    type ProfilePointers = JsonPointers<ProfileType>

    expectTypeOf<'/user'>().toMatchTypeOf<ProfilePointers>()
    expectTypeOf<'/user/name'>().toMatchTypeOf<ProfilePointers>()
    expectTypeOf<'/user/settings'>().toMatchTypeOf<ProfilePointers>()
    expectTypeOf<'/user/settings/theme'>().toMatchTypeOf<ProfilePointers>()
  })
})
