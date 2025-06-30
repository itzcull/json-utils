import type {
  DeepReadonly,
  InferFromSchema,
  InferSchemaFromData,
  JSONObject,
  JsonPointers,
  JSONSchemaArray,
  JSONSchemaObject,
  MakeSchemaOptional,
  MergeSchemas,
  OmitSchemaProperties,
  OptionalKeys,
  PartialSchema,
  PickSchemaProperties,
  RequiredKeys,
  SchemaOptionalPropertyNames,
  SchemaPropertyNames,
  SchemaRequiredPropertyNames,
} from './types'
import { describe, expectTypeOf, it } from 'vitest'

// Test schemas for type testing
const userSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    age: { type: 'number' },
    email: { type: 'string' },
    isActive: { type: 'boolean' },
    tags: {
      type: 'array',
      items: { type: 'string' },
    },
    profile: {
      type: 'object',
      properties: {
        bio: { type: 'string' },
        avatar: { type: 'string' },
        settings: {
          type: 'object',
          properties: {
            theme: { type: 'string' },
            notifications: { type: 'boolean' },
          },
        },
      },
    },
  },
  required: ['id', 'name', 'age'],
} as const satisfies JSONSchemaObject

const productSchema = {
  type: 'object',
  properties: {
    id: { type: 'number' },
    title: { type: 'string' },
    price: { type: 'number' },
    category: { type: 'string' },
    inStock: { type: 'boolean' },
  },
  required: ['id', 'title', 'price'],
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

const primitiveSchemas = {
  string: { type: 'string' } as const,
  number: { type: 'number' } as const,
  boolean: { type: 'boolean' } as const,
  null: { type: 'null' } as const,
} as const

describe('inferFromSchema type tests', () => {
  // Use schemas at runtime to satisfy linter
  void userSchema
  void productSchema
  void arraySchema
  void primitiveSchemas

  it('should infer primitive types correctly', () => {
    type StringType = InferFromSchema<typeof primitiveSchemas.string>
    type NumberType = InferFromSchema<typeof primitiveSchemas.number>
    type BooleanType = InferFromSchema<typeof primitiveSchemas.boolean>
    type NullType = InferFromSchema<typeof primitiveSchemas.null>

    expectTypeOf<StringType>().toEqualTypeOf<string>()
    expectTypeOf<NumberType>().toEqualTypeOf<number>()
    expectTypeOf<BooleanType>().toEqualTypeOf<boolean>()
    expectTypeOf<NullType>().toEqualTypeOf<null>()
  })

  it('should infer object types with required and optional properties', () => {
    type UserType = InferFromSchema<typeof userSchema>

    expectTypeOf<UserType>().toExtend<{
      id: string
      name: string
      age: number
      email?: string
      isActive?: boolean
      tags?: string[]
      profile?: {
        bio?: string
        avatar?: string
        settings?: {
          theme?: string
          notifications?: boolean
        }
      }
    }>()

    // Test required properties exist
    expectTypeOf<UserType['id']>().toEqualTypeOf<string>()
    expectTypeOf<UserType['name']>().toEqualTypeOf<string>()
    expectTypeOf<UserType['age']>().toEqualTypeOf<number>()

    // Test optional properties are optional
    expectTypeOf<UserType['email']>().toEqualTypeOf<string | undefined>()
    expectTypeOf<UserType['isActive']>().toEqualTypeOf<boolean | undefined>()
    expectTypeOf<UserType['tags']>().toEqualTypeOf<string[] | undefined>()
  })

  it('should infer array types correctly', () => {
    type ArrayType = InferFromSchema<typeof arraySchema>

    expectTypeOf<ArrayType>().toEqualTypeOf<Array<{
      id: number
      name?: string
    }>>()

    // Test array element type
    type ElementType = ArrayType[number]
    expectTypeOf<ElementType['id']>().toEqualTypeOf<number>()
    expectTypeOf<ElementType['name']>().toEqualTypeOf<string | undefined>()
  })

  it('should handle nested object structures', () => {
    type UserType = InferFromSchema<typeof userSchema>
    type ProfileType = NonNullable<UserType['profile']>
    type SettingsType = NonNullable<ProfileType['settings']>

    expectTypeOf<ProfileType>().toExtend<{
      bio?: string
      avatar?: string
      settings?: {
        theme?: string
        notifications?: boolean
      }
    }>()

    expectTypeOf<SettingsType>().toExtend<{
      theme?: string
      notifications?: boolean
    }>()
  })
})

describe('inferSchemaFromData type tests', () => {
  it('should infer schema types from data types', () => {
    interface UserData {
      name: string
      age: number
      email?: string
      tags: string[]
    }

    type UserSchemaType = InferSchemaFromData<UserData>

    // Test that it produces a valid JSONSchemaObject structure
    expectTypeOf<UserSchemaType>().toExtend<JSONSchemaObject>()
  })

  it('should handle primitive data types', () => {
    type StringSchema = InferSchemaFromData<string>
    type NumberSchema = InferSchemaFromData<number>
    type BooleanSchema = InferSchemaFromData<boolean>
    type NullSchema = InferSchemaFromData<null>

    expectTypeOf<StringSchema>().toExtend<{ type: 'string' }>()
    expectTypeOf<NumberSchema>().toExtend<{ type: 'number' }>()
    expectTypeOf<BooleanSchema>().toExtend<{ type: 'boolean' }>()
    expectTypeOf<NullSchema>().toExtend<{ type: 'null' }>()
  })

  it('should handle array data types', () => {
    type StringArraySchema = InferSchemaFromData<string[]>
    type NumberArraySchema = InferSchemaFromData<number[]>

    expectTypeOf<StringArraySchema>().toExtend<JSONSchemaArray>()
    expectTypeOf<NumberArraySchema>().toExtend<JSONSchemaArray>()
  })
})

describe('makeSchemaOptional type tests', () => {
  it('should make specified properties optional', () => {
    type UserWithOptionalEmail = MakeSchemaOptional<typeof userSchema, 'age'>
    type InferredType = InferFromSchema<UserWithOptionalEmail>

    expectTypeOf<InferredType>().toExtend<{
      id: string
      name: string
      age?: number // Should now be optional
      email?: string
      isActive?: boolean
      tags?: string[]
      profile?: {
        bio?: string
        avatar?: string
        settings?: {
          theme?: string
          notifications?: boolean
        }
      }
    }>()

    // Verify age is now optional
    expectTypeOf<InferredType['age']>().toEqualTypeOf<number | undefined>()
    // Verify other required fields remain required
    expectTypeOf<InferredType['id']>().toEqualTypeOf<string>()
    expectTypeOf<InferredType['name']>().toEqualTypeOf<string>()
  })

  it('should handle making multiple properties optional', () => {
    type UserWithOptionalFields = MakeSchemaOptional<typeof userSchema, 'age' | 'name'>
    type InferredType = InferFromSchema<UserWithOptionalFields>

    expectTypeOf<InferredType>().toExtend<{
      id: string // Still required
      name?: string // Now optional
      age?: number // Now optional
      email?: string
      isActive?: boolean
      tags?: string[]
      profile?: {
        bio?: string
        avatar?: string
        settings?: {
          theme?: string
          notifications?: boolean
        }
      }
    }>()
  })
})

describe('mergeSchemas type tests', () => {
  it('should merge two schemas correctly', () => {
    const baseSchema = {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
      },
      required: ['id'],
    } as const satisfies JSONSchemaObject

    const extendedSchema = {
      type: 'object',
      properties: {
        name: { type: 'string' }, // Override
        email: { type: 'string' }, // New field
        age: { type: 'number' }, // New field
      },
      required: ['email'],
    } as const satisfies JSONSchemaObject

    // Use schemas at runtime to satisfy linter
    void baseSchema
    void extendedSchema

    type MergedSchema = MergeSchemas<typeof baseSchema, typeof extendedSchema>
    type MergedType = InferFromSchema<MergedSchema>

    expectTypeOf<MergedType>().toExtend<{
      id: string // Required from base
      name: string // Present in both, should be required
      email: string // Required from extended
      age?: number // Optional from extended
    }>()
  })

  it('should handle merging schemas with different required fields', () => {
    const schema1 = {
      type: 'object',
      properties: {
        a: { type: 'string' },
        b: { type: 'string' },
      },
      required: ['a'],
    } as const satisfies JSONSchemaObject

    const schema2 = {
      type: 'object',
      properties: {
        b: { type: 'string' },
        c: { type: 'string' },
      },
      required: ['b', 'c'],
    } as const satisfies JSONSchemaObject

    // Use schemas at runtime to satisfy linter
    void schema1
    void schema2

    type MergedSchema = MergeSchemas<typeof schema1, typeof schema2>
    type MergedType = InferFromSchema<MergedSchema>

    expectTypeOf<MergedType>().toExtend<{
      a: string // Required from schema1
      b: string // Required from schema2 (present in both)
      c: string // Required from schema2
    }>()
  })
})

describe('partialSchema type tests', () => {
  it('should make all properties optional', () => {
    type PartialUserSchema = PartialSchema<typeof userSchema>
    type PartialUserType = InferFromSchema<PartialUserSchema>

    expectTypeOf<PartialUserType>().toExtend<{
      id?: string
      name?: string
      age?: number
      email?: string
      isActive?: boolean
      tags?: string[]
      profile?: {
        bio?: string
        avatar?: string
        settings?: {
          theme?: string
          notifications?: boolean
        }
      }
    }>()

    // All fields should be optional
    expectTypeOf<PartialUserType['id']>().toEqualTypeOf<string | undefined>()
    expectTypeOf<PartialUserType['name']>().toEqualTypeOf<string | undefined>()
    expectTypeOf<PartialUserType['age']>().toEqualTypeOf<number | undefined>()
  })
})

describe('pickSchemaProperties type tests', () => {
  it('should pick only specified properties', () => {
    type PublicUserSchema = PickSchemaProperties<typeof userSchema, 'id' | 'name' | 'email'>
    type PublicUserType = InferFromSchema<PublicUserSchema>

    expectTypeOf<PublicUserType>().toExtend<{
      id: string // Required in original
      name: string // Required in original
      email?: string // Optional in original
    }>()

    // Should not have other properties
    expectTypeOf<PublicUserType>().not.toExtend<{ age: number }>()
    expectTypeOf<PublicUserType>().not.toExtend<{ isActive: boolean }>()
  })

  it('should preserve required/optional status of picked properties', () => {
    type MinimalUserSchema = PickSchemaProperties<typeof userSchema, 'name' | 'age' | 'email'>
    type MinimalUserType = InferFromSchema<MinimalUserSchema>

    // name and age should be required (from original schema)
    expectTypeOf<MinimalUserType['name']>().toEqualTypeOf<string>()
    expectTypeOf<MinimalUserType['age']>().toEqualTypeOf<number>()
    // email should be optional (from original schema)
    expectTypeOf<MinimalUserType['email']>().toEqualTypeOf<string | undefined>()
  })
})

describe('omitSchemaProperties type tests', () => {
  it('should omit specified properties', () => {
    type MinimalUserSchema = OmitSchemaProperties<typeof userSchema, 'tags' | 'profile' | 'isActive'>
    type MinimalUserType = InferFromSchema<MinimalUserSchema>

    expectTypeOf<MinimalUserType>().toExtend<{
      id: string
      name: string
      age: number
      email?: string
    }>()

    // Should not have omitted properties
    expectTypeOf<MinimalUserType>().not.toExtend<{ tags: string[] }>()
    expectTypeOf<MinimalUserType>().not.toExtend<{ profile: any }>()
    expectTypeOf<MinimalUserType>().not.toExtend<{ isActive: boolean }>()
  })

  it('should preserve required/optional status of remaining properties', () => {
    type SimpleUserSchema = OmitSchemaProperties<typeof userSchema, 'profile' | 'tags'>
    type SimpleUserType = InferFromSchema<SimpleUserSchema>

    // Required properties should remain required
    expectTypeOf<SimpleUserType['id']>().toEqualTypeOf<string>()
    expectTypeOf<SimpleUserType['name']>().toEqualTypeOf<string>()
    expectTypeOf<SimpleUserType['age']>().toEqualTypeOf<number>()
    // Optional properties should remain optional
    expectTypeOf<SimpleUserType['email']>().toEqualTypeOf<string | undefined>()
    expectTypeOf<SimpleUserType['isActive']>().toEqualTypeOf<boolean | undefined>()
  })
})

describe('requiredKeys and OptionalKeys type tests', () => {
  it('should extract required keys correctly', () => {
    type UserType = InferFromSchema<typeof userSchema>
    type UserRequiredKeys = RequiredKeys<UserType>

    expectTypeOf<UserRequiredKeys>().toEqualTypeOf<'id' | 'name' | 'age'>()
  })

  it('should extract optional keys correctly', () => {
    type UserType = InferFromSchema<typeof userSchema>
    type UserOptionalKeys = OptionalKeys<UserType>

    expectTypeOf<UserOptionalKeys>().toEqualTypeOf<'email' | 'isActive' | 'tags' | 'profile'>()
  })

  it('should handle types with only required properties', () => {
    interface StrictType { a: string, b: number }
    type StrictRequiredKeys = RequiredKeys<StrictType>
    type StrictOptionalKeys = OptionalKeys<StrictType>

    expectTypeOf<StrictRequiredKeys>().toEqualTypeOf<'a' | 'b'>()
    expectTypeOf<StrictOptionalKeys>().toEqualTypeOf<never>()
  })

  it('should handle types with only optional properties', () => {
    interface LooseType { a?: string, b?: number }
    type LooseRequiredKeys = RequiredKeys<LooseType>
    type LooseOptionalKeys = OptionalKeys<LooseType>

    expectTypeOf<LooseRequiredKeys>().toEqualTypeOf<never>()
    expectTypeOf<LooseOptionalKeys>().toEqualTypeOf<'a' | 'b'>()
  })
})

describe('schema property name utilities', () => {
  it('should extract all property names', () => {
    type UserPropertyNames = SchemaPropertyNames<typeof userSchema>

    expectTypeOf<UserPropertyNames>().toEqualTypeOf<
      'id' | 'name' | 'age' | 'email' | 'isActive' | 'tags' | 'profile'
    >()
  })

  it('should extract required property names', () => {
    type UserRequiredPropertyNames = SchemaRequiredPropertyNames<typeof userSchema>

    expectTypeOf<UserRequiredPropertyNames>().toEqualTypeOf<'id' | 'name' | 'age'>()
  })

  it('should extract optional property names', () => {
    type UserOptionalPropertyNames = SchemaOptionalPropertyNames<typeof userSchema>

    expectTypeOf<UserOptionalPropertyNames>().toEqualTypeOf<
      'email' | 'isActive' | 'tags' | 'profile'
    >()
  })
})

describe('deepReadonly type tests', () => {
  it('should make nested objects readonly', () => {
    interface MutableUser {
      id: string
      profile: {
        name: string
        settings: {
          theme: string
        }
      }
      tags: string[]
    }

    type ReadonlyUser = DeepReadonly<MutableUser>

    expectTypeOf<ReadonlyUser>().toEqualTypeOf<{
      readonly id: string
      readonly profile: {
        readonly name: string
        readonly settings: {
          readonly theme: string
        }
      }
      readonly tags: readonly string[]
    }>()
  })

  it('should handle arrays correctly', () => {
    interface MutableData {
      items: Array<{
        id: number
        nested: {
          value: string
        }
      }>
    }

    type ReadonlyData = DeepReadonly<MutableData>

    expectTypeOf<ReadonlyData['items']>().toEqualTypeOf<
      readonly Array<{
        readonly id: number
        readonly nested: {
          readonly value: string
        }
      }>
    >()
  })
})

describe('jsonPointers integration with schema types', () => {
  it('should generate correct pointer types for schema-inferred data', () => {
    type UserType = InferFromSchema<typeof userSchema>
    type UserPointers = JsonPointers<UserType>

    // Test that specific pointers are included in the union
    expectTypeOf<'/id'>().toExtend<UserPointers>()
    expectTypeOf<'/name'>().toExtend<UserPointers>()
    expectTypeOf<'/age'>().toExtend<UserPointers>()
    expectTypeOf<'/email'>().toExtend<UserPointers>()
    expectTypeOf<'/tags'>().toExtend<UserPointers>()
    expectTypeOf<'/tags/0'>().toExtend<UserPointers>()
    expectTypeOf<'/profile'>().toExtend<UserPointers>()
    expectTypeOf<'/profile/bio'>().toExtend<UserPointers>()
    expectTypeOf<'/profile/settings'>().toExtend<UserPointers>()
    expectTypeOf<'/profile/settings/theme'>().toExtend<UserPointers>()

    // Test that invalid pointers are excluded
    expectTypeOf<'/invalid'>().not.toExtend<UserPointers>()
    expectTypeOf<'/profile/invalid'>().not.toExtend<UserPointers>()
  })

  it('should work with array schema types', () => {
    type ArrayType = InferFromSchema<typeof arraySchema>
    type ArrayPointers = JsonPointers<ArrayType>

    expectTypeOf<'/0'>().toExtend<ArrayPointers>()
    expectTypeOf<'/0/id'>().toExtend<ArrayPointers>()
    expectTypeOf<'/0/name'>().toExtend<ArrayPointers>()
  })

  it('should work with transformed schema types', () => {
    type PartialUserSchema = PartialSchema<typeof userSchema>
    type PartialUserType = InferFromSchema<PartialUserSchema>
    type PartialUserPointers = JsonPointers<PartialUserType>

    // Should still have all the same pointers even though properties are optional
    expectTypeOf<'/id'>().toExtend<PartialUserPointers>()
    expectTypeOf<'/name'>().toExtend<PartialUserPointers>()
    expectTypeOf<'/profile/settings/theme'>().toExtend<PartialUserPointers>()
  })
})

describe('complex type transformations', () => {
  it('should handle chained type transformations', () => {
    // Start with user schema, make some fields optional, then pick specific fields
    type ModifiedSchema = PickSchemaProperties<
      MakeSchemaOptional<typeof userSchema, 'age'>,
      'id' | 'name' | 'age' | 'email'
    >
    type ModifiedType = InferFromSchema<ModifiedSchema>

    expectTypeOf<ModifiedType>().toExtend<{
      id: string // Required originally
      name: string // Required originally
      age?: number // Made optional, then picked
      email?: string // Optional originally
    }>()
  })

  it('should handle merging and then transforming schemas', () => {
    type MergedSchema = MergeSchemas<typeof userSchema, typeof productSchema>
    type PartialMergedSchema = PartialSchema<MergedSchema>
    type PartialMergedType = InferFromSchema<PartialMergedSchema>

    // All properties from both schemas should be optional
    expectTypeOf<PartialMergedType>().toExtend<{
      id?: string | number // Could be from either schema
      name?: string
      age?: number
      email?: string
      isActive?: boolean
      tags?: string[]
      profile?: {
        bio?: string
        avatar?: string
        settings?: {
          theme?: string
          notifications?: boolean
        }
      }
      title?: string
      price?: number
      category?: string
      inStock?: boolean
    }>()
  })
})

describe('edge cases and error handling', () => {
  it('should handle empty schemas', () => {
    const emptySchema = {
      type: 'object',
      properties: {},
    } satisfies JSONSchemaObject

    // Use schema at runtime to satisfy linter
    void emptySchema

    type EmptyType = InferFromSchema<typeof emptySchema>
    expectTypeOf<EmptyType>().toEqualTypeOf<JSONObject>()
  })

  it('should handle schemas with no required properties', () => {
    const allOptionalSchema = {
      type: 'object',
      properties: {
        a: { type: 'string' },
        b: { type: 'number' },
      },
    } as const satisfies JSONSchemaObject

    // Use schema at runtime to satisfy linter
    void allOptionalSchema

    type AllOptionalType = InferFromSchema<typeof allOptionalSchema>
    expectTypeOf<AllOptionalType>().toExtend<{
      a?: string
      b?: number
    }>()
  })

  it('should handle schemas where all properties are required', () => {
    const allRequiredSchema = {
      type: 'object',
      properties: {
        a: { type: 'string' },
        b: { type: 'number' },
      },
      required: ['a', 'b'],
    } as const satisfies JSONSchemaObject

    // Use schema at runtime to satisfy linter
    void allRequiredSchema

    type AllRequiredType = InferFromSchema<typeof allRequiredSchema>
    expectTypeOf<AllRequiredType>().toExtend<{
      a: string
      b: number
    }>()
  })
})
