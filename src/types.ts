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
