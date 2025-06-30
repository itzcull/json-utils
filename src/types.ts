import type { Simplify } from 'type-fest'

export type JSONPrimitive = string | number | boolean | null

export type JSONType = JSONPrimitive | JSONObject | JSONArray

export interface JSONObject {
  [key: string]: JSONType
}

export type JSONArray = Array<JSONType>

/**
 * Utility type that generates all possible JSON Pointers for a readonly JSON object
 *
 * This type takes a readonly JSON object type and returns a union type of all possible
 * JSON Pointer strings that can be used to reference values within that object.
 *
 * @template T - The readonly JSON object type
 * @returns A union type of all possible JSON Pointer strings
 *
 * @example
 * ```typescript
 * type User = {
 *   readonly id: number;
 *   readonly name: string;
 *   readonly profile: {
 *     readonly email: string;
 *     readonly settings: {
 *       readonly theme: string;
 *       readonly notifications: boolean;
 *     };
 *   };
 *   readonly tags: readonly string[];
 * };
 *
 * type UserPointers = JsonPointers<User>;
 * // Result: "" | "/id" | "/name" | "/profile" | "/profile/email" |
 * //         "/profile/settings" | "/profile/settings/theme" |
 * //         "/profile/settings/notifications" | "/tags" | "/tags/0" | "/tags/1" | ...
 *
 * // Usage with existing functions
 * const user: User = {
 *   id: 1,
 *   name: 'John',
 *   profile: {
 *     email: 'john@example.com',
 *     settings: { theme: 'dark', notifications: true }
 *   },
 *   tags: ['admin', 'user']
 * };
 *
 * const validPointer: UserPointers = '/profile/settings/theme';
 * const value = getJsonValueAtPointer(user, validPointer); // Type-safe access
 * ```
 *
 * @category JSON
 */
export type JsonPointers<T, Prefix extends string = ''> =
  // If T is an array, generate array indices and recurse into elements
  T extends readonly (infer U)[]
    ? Prefix | `${Prefix}/0` | JsonPointers<U, `${Prefix}/0`>
    : // If T is an object (but not null), generate property paths
    T extends Record<string, any>
      ? T extends null
        ? Prefix
        : Prefix | {
          [K in keyof T]: K extends string
            ? `${Prefix}/${K}` | JsonPointers<T[K], `${Prefix}/${K}`>
            : never
        }[keyof T]
      : // T is a primitive value, return only the current prefix
      Prefix

/**
 * Utility type to get the value type at a specific JSON Pointer path
 * @template T - The JSON object type
 * @template P - The JSON Pointer path
 */
export type JsonPointerValue<T, P extends string> =
    P extends '' ? T :
      P extends `/${infer Rest}` ? JsonPointerValueRec<T, Rest> :
        never

type JsonPointerValueRec<T, P extends string> =
    P extends `${infer K}/${infer Rest}`
      ? K extends keyof T
        ? JsonPointerValueRec<T[K], Rest>
        : K extends `${number}`
          ? T extends readonly (infer U)[]
            ? JsonPointerValueRec<U, Rest>
            : never
          : never
      : P extends keyof T
        ? T[P]
        : P extends `${number}`
          ? T extends readonly (infer U)[]
            ? U
            : never
          : never

export type JSONSchemaDefinition = JSONSchema | boolean

export type JSONTypeName = 'string' | 'number' | 'integer' | 'boolean' | 'object' | 'array' | 'null'

export type JSONSchemaVersion = string

/**
 * Base interface containing common JSON Schema properties
 */
export interface JSONSchemaBase {
  $id?: string | undefined
  $ref?: string | undefined
  $schema?: JSONSchemaVersion | undefined
  $comment?: string | undefined

  /**
   * @see https://datatracker.ietf.org/doc/html/draft-bhutton-json-schema-00#section-8.2.4
   * @see https://datatracker.ietf.org/doc/html/draft-bhutton-json-schema-validation-00#appendix-A
   */
  $defs?:
    | {
      [key: string]: JSONSchemaDefinition
    }
    | undefined

  enum?: JSONType[] | undefined
  const?: JSONType | undefined

  /**
   * @see https://tools.ietf.org/html/draft-handrews-json-schema-validation-01#section-6.6
   */
  if?: JSONSchemaDefinition | undefined
  then?: JSONSchemaDefinition | undefined
  else?: JSONSchemaDefinition | undefined

  /**
   * @see https://tools.ietf.org/html/draft-handrews-json-schema-validation-01#section-6.7
   */
  allOf?: JSONSchemaDefinition[] | undefined
  anyOf?: JSONSchemaDefinition[] | undefined
  oneOf?: JSONSchemaDefinition[] | undefined
  not?: JSONSchemaDefinition | undefined

  /**
   * @see https://tools.ietf.org/html/draft-handrews-json-schema-validation-01#section-7
   */
  format?: string | undefined

  /**
   * @see https://tools.ietf.org/html/draft-handrews-json-schema-validation-01#section-8
   */
  contentMediaType?: string | undefined
  contentEncoding?: string | undefined

  /**
   * @see https://tools.ietf.org/html/draft-handrews-json-schema-validation-01#section-9
   */
  definitions?:
    | {
      [key: string]: JSONSchemaDefinition
    }
    | undefined

  /**
   * @see https://tools.ietf.org/html/draft-handrews-json-schema-validation-01#section-10
   */
  title?: string | undefined
  description?: string | undefined
  default?: JSONType | undefined
  readOnly?: boolean | undefined
  writeOnly?: boolean | undefined
  examples?: JSONType | undefined
}

/**
 * JSON Schema for string type
 */
export interface JSONSchemaString extends JSONSchemaBase {
  type: 'string'
  /**
   * @see https://tools.ietf.org/html/draft-handrews-json-schema-validation-01#section-6.3
   */
  maxLength?: number | undefined
  minLength?: number | undefined
  pattern?: string | undefined
}

/**
 * JSON Schema for number type
 */
export interface JSONSchemaNumber extends JSONSchemaBase {
  type: 'number'
  /**
   * @see https://tools.ietf.org/html/draft-handrews-json-schema-validation-01#section-6.2
   */
  multipleOf?: number | undefined
  maximum?: number | undefined
  exclusiveMaximum?: number | undefined
  minimum?: number | undefined
  exclusiveMinimum?: number | undefined
}

/**
 * JSON Schema for integer type
 */
export interface JSONSchemaInteger extends JSONSchemaBase {
  type: 'integer'
  /**
   * @see https://tools.ietf.org/html/draft-handrews-json-schema-validation-01#section-6.2
   */
  multipleOf?: number | undefined
  maximum?: number | undefined
  exclusiveMaximum?: number | undefined
  minimum?: number | undefined
  exclusiveMinimum?: number | undefined
}

/**
 * JSON Schema for boolean type
 */
export interface JSONSchemaBoolean extends JSONSchemaBase {
  type: 'boolean'
}

/**
 * JSON Schema for null type
 */
export interface JSONSchemaNull extends JSONSchemaBase {
  type: 'null'
}

/**
 * JSON Schema for array type
 */
export interface JSONSchemaArray extends JSONSchemaBase {
  type: 'array'
  /**
   * @see https://tools.ietf.org/html/draft-handrews-json-schema-validation-01#section-6.4
   */
  items?: JSONSchemaDefinition | JSONSchemaDefinition[] | undefined
  additionalItems?: JSONSchemaDefinition | undefined
  maxItems?: number | undefined
  minItems?: number | undefined
  uniqueItems?: boolean | undefined
  contains?: JSONSchemaDefinition | undefined
}

/**
 * JSON Schema for object type
 */
export interface JSONSchemaObject extends JSONSchemaBase {
  type: 'object'
  /**
   * @see https://tools.ietf.org/html/draft-handrews-json-schema-validation-01#section-6.5
   */
  maxProperties?: number | undefined
  minProperties?: number | undefined
  required?: string[] | undefined
  properties?:
    | {
      [key: string]: JSONSchemaDefinition
    }
    | undefined
  patternProperties?:
    | {
      [key: string]: JSONSchemaDefinition
    }
    | undefined
  additionalProperties?: JSONSchemaDefinition | undefined
  dependencies?:
    | {
      [key: string]: JSONSchemaDefinition | string[]
    }
    | undefined
  propertyNames?: JSONSchemaDefinition | undefined
}

/**
 * JSON Schema for multiple types
 */
export interface JSONSchemaMultiType extends JSONSchemaBase {
  type: JSONTypeName[]
  // Include all possible properties since multiple types are allowed
  /**
   * @see https://tools.ietf.org/html/draft-handrews-json-schema-validation-01#section-6.2
   */
  multipleOf?: number | undefined
  maximum?: number | undefined
  exclusiveMaximum?: number | undefined
  minimum?: number | undefined
  exclusiveMinimum?: number | undefined

  /**
   * @see https://tools.ietf.org/html/draft-handrews-json-schema-validation-01#section-6.3
   */
  maxLength?: number | undefined
  minLength?: number | undefined
  pattern?: string | undefined

  /**
   * @see https://tools.ietf.org/html/draft-handrews-json-schema-validation-01#section-6.4
   */
  items?: JSONSchemaDefinition | JSONSchemaDefinition[] | undefined
  additionalItems?: JSONSchemaDefinition | undefined
  maxItems?: number | undefined
  minItems?: number | undefined
  uniqueItems?: boolean | undefined
  contains?: JSONSchemaDefinition | undefined

  /**
   * @see https://tools.ietf.org/html/draft-handrews-json-schema-validation-01#section-6.5
   */
  maxProperties?: number | undefined
  minProperties?: number | undefined
  required?: string[] | undefined
  properties?:
    | {
      [key: string]: JSONSchemaDefinition
    }
    | undefined
  patternProperties?:
    | {
      [key: string]: JSONSchemaDefinition
    }
    | undefined
  additionalProperties?: JSONSchemaDefinition | undefined
  dependencies?:
    | {
      [key: string]: JSONSchemaDefinition | string[]
    }
    | undefined
  propertyNames?: JSONSchemaDefinition | undefined
}

/**
 * JSON Schema without type constraint (for use in definitions and partial schemas)
 */
export interface JSONSchemaGeneric extends JSONSchemaBase {
  type?: JSONTypeName | JSONTypeName[] | undefined
  // Include all possible properties since type is optional
  /**
   * @see https://tools.ietf.org/html/draft-handrews-json-schema-validation-01#section-6.2
   */
  multipleOf?: number | undefined
  maximum?: number | undefined
  exclusiveMaximum?: number | undefined
  minimum?: number | undefined
  exclusiveMinimum?: number | undefined

  /**
   * @see https://tools.ietf.org/html/draft-handrews-json-schema-validation-01#section-6.3
   */
  maxLength?: number | undefined
  minLength?: number | undefined
  pattern?: string | undefined

  /**
   * @see https://tools.ietf.org/html/draft-handrews-json-schema-validation-01#section-6.4
   */
  items?: JSONSchemaDefinition | JSONSchemaDefinition[] | undefined
  additionalItems?: JSONSchemaDefinition | undefined
  maxItems?: number | undefined
  minItems?: number | undefined
  uniqueItems?: boolean | undefined
  contains?: JSONSchemaDefinition | undefined

  /**
   * @see https://tools.ietf.org/html/draft-handrews-json-schema-validation-01#section-6.5
   */
  maxProperties?: number | undefined
  minProperties?: number | undefined
  required?: string[] | undefined
  properties?:
    | {
      [key: string]: JSONSchemaDefinition
    }
    | undefined
  patternProperties?:
    | {
      [key: string]: JSONSchemaDefinition
    }
    | undefined
  additionalProperties?: JSONSchemaDefinition | undefined
  dependencies?:
    | {
      [key: string]: JSONSchemaDefinition | string[]
    }
    | undefined
  propertyNames?: JSONSchemaDefinition | undefined
}

/**
 * Discriminated union type for JSON Schema based on the 'type' field
 *
 * This ensures type safety by requiring the appropriate properties for each schema type:
 * - When type is 'array', 'items' property becomes relevant
 * - When type is 'object', 'properties' and related object properties become relevant
 * - When type is 'string', string validation properties become relevant
 * - When type is 'number' or 'integer', numeric validation properties become relevant
 * - When type is an array of types, all properties are available
 *
 * @example
 * ```typescript
 * // ✅ Valid - array schema with items
 * const arraySchema: JSONSchema = {
 *   type: 'array',
 *   items: { type: 'string' }
 * }
 *
 * // ✅ Valid - object schema with properties
 * const objectSchema: JSONSchema = {
 *   type: 'object',
 *   properties: {
 *     name: { type: 'string' }
 *   }
 * }
 *
 * // ✅ Valid - string schema with pattern
 * const stringSchema: JSONSchema = {
 *   type: 'string',
 *   pattern: '^[a-z]+$'
 * }
 * ```
 */
export type JSONSchema =
  | JSONSchemaString
  | JSONSchemaNumber
  | JSONSchemaInteger
  | JSONSchemaBoolean
  | JSONSchemaNull
  | JSONSchemaArray
  | JSONSchemaObject
  | JSONSchemaMultiType
  | JSONSchemaGeneric

/**
 * Utility type to infer TypeScript type from JSON Schema
 *
 * Converts a JSON Schema definition into the corresponding TypeScript type,
 * enabling compile-time type safety when working with schema-validated data.
 *
 * @template S - The JSON Schema to convert
 * @returns The inferred TypeScript type
 *
 * @example
 * ```typescript
 * const userSchema = {
 *   type: 'object',
 *   properties: {
 *     name: { type: 'string' },
 *     age: { type: 'number' },
 *     isActive: { type: 'boolean' }
 *   },
 *   required: ['name', 'age']
 * } as const satisfies JSONSchemaObject
 *
 * type User = InferFromSchema<typeof userSchema>
 * // Result: { name: string; age: number; isActive?: boolean }
 *
 * const user: User = { name: 'John', age: 30 } // ✅ Valid
 * const invalid: User = { name: 'John' } // ❌ Error: missing 'age'
 * ```
 */
export type InferFromSchema<S extends JSONSchema> = Simplify<
  S extends JSONSchemaString ? string :
    S extends JSONSchemaNumber ? number :
      S extends JSONSchemaInteger ? number :
        S extends JSONSchemaBoolean ? boolean :
          S extends JSONSchemaNull ? null :
            S extends JSONSchemaArray ? InferArrayFromSchema<S> :
              S extends JSONSchemaObject ? InferObjectFromSchema<S> :
                S extends JSONSchemaMultiType ? InferMultiTypeFromSchema<S> :
                  S extends JSONSchemaGeneric ? InferGenericFromSchema<S> :
                    unknown
>

/**
 * Helper type to infer array type from JSON Schema array definition
 */
type InferArrayFromSchema<S extends JSONSchemaArray> =
  S['items'] extends JSONSchema ? InferFromSchema<S['items']>[] :
    S['items'] extends JSONSchema[] ? InferTupleFromSchema<S['items']> :
      unknown[]

/**
 * Helper type to infer tuple type from JSON Schema array with specific items
 */
type InferTupleFromSchema<Items extends readonly JSONSchema[]> = {
  [K in keyof Items]: Items[K] extends JSONSchema ? InferFromSchema<Items[K]> : unknown
}

/**
 * Helper type to infer object type from JSON Schema object definition
 */
type InferObjectFromSchema<S extends JSONSchemaObject> =
  S['properties'] extends Record<string, JSONSchema>
    ? {
      [K in keyof S['properties'] as K extends string
        ? S['required'] extends readonly string[]
          ? K extends S['required'][number]
            ? K
            : never
          : never
        : never
      ]: InferFromSchema<S['properties'][K]>
    } & {
      [K in keyof S['properties'] as K extends string
        ? S['required'] extends readonly string[]
          ? K extends S['required'][number]
            ? never
            : K
          : K
        : never
      ]?: InferFromSchema<S['properties'][K]>
    }
    : Record<string, unknown>

/**
 * Helper type to infer union type from JSON Schema multi-type definition
 */
type InferMultiTypeFromSchema<S extends JSONSchemaMultiType> =
  S['type'] extends readonly JSONTypeName[]
    ? {
        [K in keyof S['type']]: S['type'][K] extends JSONTypeName
          ? JSONTypeNameToType<S['type'][K]>
          : never
      }[number]
    : unknown

/**
 * Helper type to map JSON type names to TypeScript types
 */
type JSONTypeNameToType<T extends JSONTypeName> =
  T extends 'string' ? string :
    T extends 'number' ? number :
      T extends 'integer' ? number :
        T extends 'boolean' ? boolean :
          T extends 'null' ? null :
            T extends 'object' ? Record<string, unknown> :
              T extends 'array' ? unknown[] :
                unknown

/**
 * Helper type to infer type from generic JSON Schema (no type specified)
 */
type InferGenericFromSchema<S extends JSONSchemaGeneric> =
  S['type'] extends JSONTypeName ? JSONTypeNameToType<S['type']> :
    S['type'] extends readonly JSONTypeName[] ? InferMultiTypeFromSchema<S & JSONSchemaMultiType> :
      S['properties'] extends Record<string, JSONSchema> ? InferObjectFromSchema<S & JSONSchemaObject> :
        S['items'] extends JSONSchema | JSONSchema[] ? InferArrayFromSchema<S & JSONSchemaArray> :
          unknown

/**
 * Utility type to infer schema type from TypeScript data type
 *
 * Converts a TypeScript type into the corresponding JSON Schema structure,
 * enabling compile-time schema generation from existing type definitions.
 *
 * @template T - The TypeScript type to convert
 * @returns The inferred JSON Schema type
 *
 * @example
 * ```typescript
 * interface User {
 *   name: string
 *   age: number
 *   isActive?: boolean
 *   tags: string[]
 * }
 *
 * type UserSchema = InferSchemaFromData<User>
 * // Result: JSONSchemaObject with appropriate properties and required fields
 * ```
 */
export type InferSchemaFromData<T> =
  T extends string ? JSONSchemaString :
    T extends number ? JSONSchemaNumber :
      T extends boolean ? JSONSchemaBoolean :
        T extends null ? JSONSchemaNull :
          T extends readonly (infer U)[] ? JSONSchemaArray & { items: InferSchemaFromData<U> } :
            T extends Record<string, any>
              ? T extends null
                ? JSONSchemaNull
                : JSONSchemaObject & {
                  properties: {
                    [K in keyof T]: InferSchemaFromData<T[K]>
                  }
                  required: RequiredKeys<T>[]
                }
              : JSONSchemaGeneric

/**
 * Utility type to extract required keys from a type
 */
export type RequiredKeys<T> = {
  [K in keyof T]-?: Record<string, any> extends Pick<T, K> ? never : K
}[keyof T]

/**
 * Utility type to extract optional keys from a type
 */
export type OptionalKeys<T> = {
  [K in keyof T]-?: Record<string, any> extends Pick<T, K> ? K : never
}[keyof T]

/**
 * Utility type to make properties deeply readonly
 */
export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends (infer U)[]
    ? readonly DeepReadonly<U>[]
    : T[P] extends Record<string, any>
      ? DeepReadonly<T[P]>
      : T[P]
}

/**
 * Utility type to make specific schema properties optional
 *
 * Modifies a JSON Schema to make certain properties optional instead of required.
 * Useful for creating variations of schemas or handling partial data scenarios.
 *
 * @template S - The base JSON Schema
 * @template K - The property keys to make optional
 *
 * @example
 * ```typescript
 * const userSchema = {
 *   type: 'object',
 *   properties: {
 *     name: { type: 'string' },
 *     age: { type: 'number' },
 *     email: { type: 'string' }
 *   },
 *   required: ['name', 'age', 'email']
 * } as const satisfies JSONSchemaObject
 *
 * type PartialUserSchema = MakeSchemaOptional<typeof userSchema, 'email'>
 * // Result: schema with email as optional, name and age still required
 *
 * type UserUpdate = InferFromSchema<PartialUserSchema>
 * // Result: { name: string; age: number; email?: string }
 * ```
 */
export type MakeSchemaOptional<S extends JSONSchemaObject, K extends string> =
  S extends { required: readonly string[] }
    ? Omit<S, 'required'> & {
      required: Exclude<S['required'][number], K>[] extends never[]
        ? never
        : Exclude<S['required'][number], K>[]
    }
    : S

/**
 * Utility type to merge two JSON schemas
 *
 * Combines properties from two object schemas, with the second schema's
 * properties taking precedence. Required fields are merged appropriately.
 *
 * @template S1 - The first schema
 * @template S2 - The second schema (takes precedence)
 *
 * @example
 * ```typescript
 * const baseSchema = {
 *   type: 'object',
 *   properties: {
 *     id: { type: 'string' },
 *     name: { type: 'string' }
 *   },
 *   required: ['id']
 * } as const satisfies JSONSchemaObject
 *
 * const extendedSchema = {
 *   type: 'object',
 *   properties: {
 *     name: { type: 'string' },  // Override
 *     email: { type: 'string' }, // New field
 *     age: { type: 'number' }    // New field
 *   },
 *   required: ['name', 'email']
 * } as const satisfies JSONSchemaObject
 *
 * type MergedSchema = MergeSchemas<typeof baseSchema, typeof extendedSchema>
 * // Result: Combined schema with all properties and merged required fields
 *
 * type MergedType = InferFromSchema<MergedSchema>
 * // Result: { id?: string; name: string; email: string; age?: number }
 * ```
 */
export type MergeSchemas<S1 extends JSONSchemaObject, S2 extends JSONSchemaObject> =
  JSONSchemaObject & {
    type: 'object'
    properties: (S1['properties'] extends Record<string, any> ? S1['properties'] : Record<string, any>) &
      (S2['properties'] extends Record<string, any> ? S2['properties'] : Record<string, any>)
    required: [
      ...(S1['required'] extends readonly string[] ? S1['required'] : []),
      ...(S2['required'] extends readonly string[] ? S2['required'] : []),
    ]
  }

/**
 * Utility type to create a partial schema (all properties optional)
 *
 * Converts a schema so that all properties become optional, useful for
 * creating update schemas or partial validation scenarios.
 *
 * @template S - The base JSON Schema
 *
 * @example
 * ```typescript
 * const userSchema = {
 *   type: 'object',
 *   properties: {
 *     name: { type: 'string' },
 *     age: { type: 'number' },
 *     email: { type: 'string' }
 *   },
 *   required: ['name', 'age', 'email']
 * } as const satisfies JSONSchemaObject
 *
 * type PartialSchema = PartialSchema<typeof userSchema>
 * // Result: schema with no required fields
 *
 * type UserUpdate = InferFromSchema<PartialSchema>
 * // Result: { name?: string; age?: number; email?: string }
 * ```
 */
export type PartialSchema<S extends JSONSchemaObject> =
  Omit<S, 'required'> & {
    required?: never
  }

/**
 * Utility type to pick specific properties from a schema
 *
 * Creates a new schema containing only the specified properties from
 * the original schema, similar to TypeScript's Pick utility.
 *
 * @template S - The base JSON Schema
 * @template K - The property keys to pick
 *
 * @example
 * ```typescript
 * const userSchema = {
 *   type: 'object',
 *   properties: {
 *     id: { type: 'string' },
 *     name: { type: 'string' },
 *     age: { type: 'number' },
 *     email: { type: 'string' },
 *     internal: { type: 'boolean' }
 *   },
 *   required: ['id', 'name', 'age']
 * } as const satisfies JSONSchemaObject
 *
 * type PublicUserSchema = PickSchemaProperties<typeof userSchema, 'id' | 'name' | 'email'>
 * // Result: schema with only id, name, email properties
 *
 * type PublicUser = InferFromSchema<PublicUserSchema>
 * // Result: { id: string; name: string; email?: string }
 * ```
 */
export type PickSchemaProperties<S extends JSONSchemaObject, K extends keyof S['properties']> =
  S extends { properties: Record<string, any> }
    ? JSONSchemaObject & {
      type: 'object'
      properties: Pick<S['properties'], K>
      required: S['required'] extends readonly string[]
        ? Extract<S['required'][number], K>[] extends never[]
          ? never
          : Extract<S['required'][number], K>[]
        : never
    }
    : never

/**
 * Utility type to omit specific properties from a schema
 *
 * Creates a new schema excluding the specified properties from
 * the original schema, similar to TypeScript's Omit utility.
 *
 * @template S - The base JSON Schema
 * @template K - The property keys to omit
 *
 * @example
 * ```typescript
 * const userSchema = {
 *   type: 'object',
 *   properties: {
 *     id: { type: 'string' },
 *     name: { type: 'string' },
 *     age: { type: 'number' },
 *     internal: { type: 'boolean' },
 *     secret: { type: 'string' }
 *   },
 *   required: ['id', 'name', 'internal']
 * } as const satisfies JSONSchemaObject
 *
 * type PublicUserSchema = OmitSchemaProperties<typeof userSchema, 'internal' | 'secret'>
 * // Result: schema without internal and secret properties
 *
 * type PublicUser = InferFromSchema<PublicUserSchema>
 * // Result: { id: string; name: string; age?: number }
 * ```
 */
export type OmitSchemaProperties<S extends JSONSchemaObject, K extends keyof S['properties']> =
  Simplify<S extends { properties: Record<string, any> }
    ? JSONSchemaObject & {
      type: 'object'
      properties: Omit<S['properties'], K>
      required: S['required'] extends readonly string[]
        ? Exclude<S['required'][number], K>[] extends never[]
          ? never
          : Exclude<S['required'][number], K>[]
        : never
    }
    : never>

/**
 * Utility type to check if a type extends another type
 *
 * Helper type for conditional schema operations and type compatibility checking.
 *
 * @template T - The type to check
 * @template U - The type to check against
 */
export type Extends<T, U> = T extends U ? true : false

/**
 * Utility type to get schema property names
 *
 * Extracts the property names from a JSON Schema object as a union type.
 *
 * @template S - The JSON Schema
 *
 * @example
 * ```typescript
 * const userSchema = {
 *   type: 'object',
 *   properties: {
 *     name: { type: 'string' },
 *     age: { type: 'number' },
 *     email: { type: 'string' }
 *   }
 * } as const satisfies JSONSchemaObject
 *
 * type PropertyNames = SchemaPropertyNames<typeof userSchema>
 * // Result: 'name' | 'age' | 'email'
 * ```
 */
export type SchemaPropertyNames<S extends JSONSchemaObject> =
  S['properties'] extends Record<string, any>
    ? keyof S['properties']
    : never

/**
 * Utility type to get required schema property names
 *
 * Extracts only the required property names from a JSON Schema object.
 *
 * @template S - The JSON Schema
 *
 * @example
 * ```typescript
 * const userSchema = {
 *   type: 'object',
 *   properties: {
 *     name: { type: 'string' },
 *     age: { type: 'number' },
 *     email: { type: 'string' }
 *   },
 *   required: ['name', 'age']
 * } as const satisfies JSONSchemaObject
 *
 * type RequiredProps = SchemaRequiredPropertyNames<typeof userSchema>
 * // Result: 'name' | 'age'
 * ```
 */
export type SchemaRequiredPropertyNames<S extends JSONSchemaObject> =
  S['required'] extends readonly string[]
    ? S['required'][number]
    : never

/**
 * Utility type to get optional schema property names
 *
 * Extracts only the optional property names from a JSON Schema object.
 *
 * @template S - The JSON Schema
 *
 * @example
 * ```typescript
 * const userSchema = {
 *   type: 'object',
 *   properties: {
 *     name: { type: 'string' },
 *     age: { type: 'number' },
 *     email: { type: 'string' }
 *   },
 *   required: ['name', 'age']
 * } as const satisfies JSONSchemaObject
 *
 * type OptionalProps = SchemaOptionalPropertyNames<typeof userSchema>
 * // Result: 'email'
 * ```
 */
export type SchemaOptionalPropertyNames<S extends JSONSchemaObject> =
  S['properties'] extends Record<string, any>
    ? S['required'] extends readonly string[]
      ? Exclude<keyof S['properties'], S['required'][number]>
      : keyof S['properties']
    : never

/**
 * @deprecated Use the discriminated union JSONSchema type instead
 * This interface is kept for backward compatibility but will be removed in a future version
 */
export interface JSONSchemaLegacy {
  $id?: string | undefined
  $ref?: string | undefined
  $schema?: JSONSchemaVersion | undefined
  $comment?: string | undefined

  /**
   * @see https://datatracker.ietf.org/doc/html/draft-bhutton-json-schema-00#section-8.2.4
   * @see https://datatracker.ietf.org/doc/html/draft-bhutton-json-schema-validation-00#appendix-A
   */
  $defs?:
    | {
      [key: string]: JSONSchemaDefinition
    }
    | undefined

  /**
   * @see https://tools.ietf.org/html/draft-handrews-json-schema-validation-01#section-6.1
   */
  type: JSONTypeName | JSONTypeName[]
  enum?: JSONType[] | undefined
  const?: JSONType | undefined

  /**
   * @see https://tools.ietf.org/html/draft-handrews-json-schema-validation-01#section-6.2
   */
  multipleOf?: number | undefined
  maximum?: number | undefined
  exclusiveMaximum?: number | undefined
  minimum?: number | undefined
  exclusiveMinimum?: number | undefined

  /**
   * @see https://tools.ietf.org/html/draft-handrews-json-schema-validation-01#section-6.3
   */
  maxLength?: number | undefined
  minLength?: number | undefined
  pattern?: string | undefined

  /**
   * @see https://tools.ietf.org/html/draft-handrews-json-schema-validation-01#section-6.4
   */
  items?: JSONSchemaDefinition | JSONSchemaDefinition[] | undefined
  additionalItems?: JSONSchemaDefinition | undefined
  maxItems?: number | undefined
  minItems?: number | undefined
  uniqueItems?: boolean | undefined
  contains?: JSONSchemaDefinition | undefined

  /**
   * @see https://tools.ietf.org/html/draft-handrews-json-schema-validation-01#section-6.5
   */
  maxProperties?: number | undefined
  minProperties?: number | undefined
  required?: string[] | undefined
  properties?:
    | {
      [key: string]: JSONSchemaDefinition
    }
    | undefined
  patternProperties?:
    | {
      [key: string]: JSONSchemaDefinition
    }
    | undefined
  additionalProperties?: JSONSchemaDefinition | undefined
  dependencies?:
    | {
      [key: string]: JSONSchemaDefinition | string[]
    }
    | undefined
  propertyNames?: JSONSchemaDefinition | undefined

  /**
   * @see https://tools.ietf.org/html/draft-handrews-json-schema-validation-01#section-6.6
   */
  if?: JSONSchemaDefinition | undefined
  then?: JSONSchemaDefinition | undefined
  else?: JSONSchemaDefinition | undefined

  /**
   * @see https://tools.ietf.org/html/draft-handrews-json-schema-validation-01#section-6.7
   */
  allOf?: JSONSchemaDefinition[] | undefined
  anyOf?: JSONSchemaDefinition[] | undefined
  oneOf?: JSONSchemaDefinition[] | undefined
  not?: JSONSchemaDefinition | undefined

  /**
   * @see https://tools.ietf.org/html/draft-handrews-json-schema-validation-01#section-7
   */
  format?: string | undefined

  /**
   * @see https://tools.ietf.org/html/draft-handrews-json-schema-validation-01#section-8
   */
  contentMediaType?: string | undefined
  contentEncoding?: string | undefined

  /**
   * @see https://tools.ietf.org/html/draft-handrews-json-schema-validation-01#section-9
   */
  definitions?:
    | {
      [key: string]: JSONSchemaDefinition
    }
    | undefined

  /**
   * @see https://tools.ietf.org/html/draft-handrews-json-schema-validation-01#section-10
   */
  title?: string | undefined
  description?: string | undefined
  default?: JSONType | undefined
  readOnly?: boolean | undefined
  writeOnly?: boolean | undefined
  examples?: JSONType | undefined
}
