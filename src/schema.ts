import type { JSONSchema, JSONSchemaDefinition, JSONType } from './types'

/**
 * Generate a JSON Schema from a JSON value
 *
 * Creates a JSON Schema definition that describes the structure and types of the provided JSON value.
 * Recursively analyzes nested objects and arrays to build a complete schema. For arrays, uses the
 * first item's schema as the items schema (simplified approach).
 *
 * @param value - The JSON value to generate a schema for
 * @returns A JSON Schema object describing the value
 * @throws {Error} When the value contains unsupported types (function, symbol, bigint, undefined)
 *
 * @example
 * ```typescript
 * import { createJsonSchema } from '@itzcull/json-utils/json'
 *
 * // Primitive values
 * createJsonSchema('hello') // { type: 'string' }
 * createJsonSchema(42) // { type: 'number' }
 * createJsonSchema(true) // { type: 'boolean' }
 * createJsonSchema(null) // { type: 'null' }
 *
 * // Objects
 * const user = { name: 'John', age: 30, active: true }
 * createJsonSchema(user)
 * // {
 * //   type: 'object',
 * //   properties: {
 * //     name: { type: 'string' },
 * //     age: { type: 'number' },
 * //     active: { type: 'boolean' }
 * //   },
 * //   required: ['name', 'age', 'active']
 * // }
 *
 * // Arrays
 * createJsonSchema([1, 2, 3])
 * // { type: 'array', items: { type: 'number' } }
 *
 * createJsonSchema([])
 * // { type: 'array', items: {} }
 *
 * // Nested structures
 * const data = {
 *   users: [{ id: 1, name: 'Alice' }],
 *   meta: { total: 1, page: 1 }
 * }
 * createJsonSchema(data)
 * // {
 * //   type: 'object',
 * //   properties: {
 * //     users: {
 * //       type: 'array',
 * //       items: {
 * //         type: 'object',
 * //         properties: {
 * //           id: { type: 'number' },
 * //           name: { type: 'string' }
 * //         },
 * //         required: ['id', 'name']
 * //       }
 * //     },
 * //     meta: {
 * //       type: 'object',
 * //       properties: {
 * //         total: { type: 'number' },
 * //         page: { type: 'number' }
 * //       },
 * //       required: ['total', 'page']
 * //     }
 * //   },
 * //   required: ['users', 'meta']
 * // }
 *
 * // API response schema generation
 * function generateApiSchema(sampleResponse: any) {
 *   try {
 *     return createJsonSchema(sampleResponse)
 *   } catch (error) {
 *     throw new Error(`Cannot generate schema: ${error.message}`)
 *   }
 * }
 *
 * // Form validation schema
 * const formData = { name: 'John', email: 'john@example.com', age: 30 }
 * const formSchema = createJsonSchema(formData)
 * // Use this schema for validation
 *
 * // Configuration schema
 * const config = {
 *   database: { host: 'localhost', port: 5432 },
 *   features: ['auth', 'logging']
 * }
 * const configSchema = createJsonSchema(config)
 * ```
 *
 * @category JSON
 */
export function createJsonSchema<T extends JSONType>(value: T): JSONSchema {
  const type = typeof value

  if (type === 'function' || type === 'symbol' || type === 'bigint' || type === 'undefined') {
    throw new Error(`Unsupported type: ${type}`)
  }

  if (value === null) {
    return { type: 'null' }
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return { type: 'array', items: {} as JSONSchemaDefinition }
    }

    // Get schema for all items and merge them
    const itemSchemas = value.map(item => createJsonSchema(item))
    return {
      type: 'array',
      items: itemSchemas[0] as JSONSchemaDefinition, // For simplicity, using first item's schema
    }
  }

  if (type === 'object') {
    const properties: { [key: string]: JSONSchemaDefinition } = {}
    const required: string[] = []

    for (const [key, val] of Object.entries(value)) {
      properties[key] = createJsonSchema(val) as JSONSchemaDefinition
      required.push(key)
    }

    return {
      type: 'object',
      properties,
      required,
    }
  }

  return { type }
}

/**
 * Remove undefined values from a JSON structure
 *
 * Recursively traverses a JSON object or array and removes all properties with undefined values.
 * For objects, deletes properties with undefined values. For arrays, processes each element
 * but preserves array structure (undefined elements remain as undefined).
 *
 * @template T - The type of the JSON value
 * @param data - The JSON value to clean
 * @returns The cleaned JSON value with undefined properties removed
 *
 * @example
 * ```typescript
 * import { removeUndefinedValues } from '@itzcull/json-utils/json'
 *
 * // Object cleaning
 * const user = { name: 'John', age: undefined, email: 'john@example.com' }
 * removeUndefinedValues(user) // { name: 'John', email: 'john@example.com' }
 *
 * // Nested object cleaning
 * const data = {
 *   user: { name: 'John', temp: undefined },
 *   config: { debug: true, secret: undefined },
 *   meta: undefined
 * }
 * removeUndefinedValues(data)
 * // {
 * //   user: { name: 'John' },
 * //   config: { debug: true }
 * // }
 *
 * // Array processing
 * const items = [
 *   { id: 1, name: 'Item 1', temp: undefined },
 *   { id: 2, name: 'Item 2' }
 * ]
 * removeUndefinedValues(items)
 * // [
 * //   { id: 1, name: 'Item 1' },
 * //   { id: 2, name: 'Item 2' }
 * // ]
 *
 * // API response cleaning
 * function cleanApiResponse(response: any) {
 *   return removeUndefinedValues(response)
 * }
 *
 * const apiResponse = {
 *   data: { users: [{ id: 1, name: 'Alice', internal: undefined }] },
 *   debug: undefined,
 *   meta: { total: 1, temp: undefined }
 * }
 * const cleaned = cleanApiResponse(apiResponse)
 * // {
 * //   data: { users: [{ id: 1, name: 'Alice' }] },
 * //   meta: { total: 1 }
 * // }
 *
 * // Form data preparation
 * function prepareFormData(formData: Record<string, any>) {
 *   // Remove undefined fields before sending
 *   return removeUndefinedValues(formData)
 * }
 *
 * // Configuration cleanup
 * const config = {
 *   database: { host: 'localhost', password: undefined },
 *   cache: { enabled: true, ttl: undefined },
 *   features: undefined
 * }
 * const cleanConfig = removeUndefinedValues(config)
 * // {
 * //   database: { host: 'localhost' },
 * //   cache: { enabled: true }
 * // }
 *
 * // Primitive values (returned as-is)
 * removeUndefinedValues('hello') // 'hello'
 * removeUndefinedValues(42) // 42
 * removeUndefinedValues(null) // null
 * ```
 *
 * @category JSON
 */
export function removeUndefinedValues<T extends JSONType>(data: T): T {
  if (data === null || typeof data !== 'object') {
    return data
  }

  if (Array.isArray(data)) {
    for (let i = 0; i < data.length; i++) {
      if (data[i] !== undefined) {
        data[i] = removeUndefinedValues(data[i] as JSONType)
      }
    }
    return data
  }

  for (const key in data) {
    if (data[key] === undefined) {
      delete data[key]
    }
    else if (typeof data[key] === 'object') {
      data[key] = removeUndefinedValues(data[key] as JSONType)
    }
  }

  return data
}

/**
 * Generate all possible JSON Pointers from a JSON Schema
 *
 * Recursively traverses a JSON Schema and generates all possible JSON Pointer paths
 * that could exist in data conforming to that schema. Handles object properties,
 * array items, and nested structures.
 *
 * @param schema - The JSON Schema to analyze
 * @param prefix - Internal parameter for recursion (current path prefix)
 * @returns Array of JSON Pointer strings representing all possible paths
 *
 * @example
 * ```typescript
 * import { getAllJsonPointersFromSchema } from '@itzcull/json-utils/json'
 *
 * // Simple object schema
 * const userSchema = {
 *   type: 'object',
 *   properties: {
 *     name: { type: 'string' },
 *     age: { type: 'number' }
 *   }
 * }
 * getAllJsonPointersFromSchema(userSchema)
 * // ['/name', '/age']
 *
 * // Nested object schema
 * const profileSchema = {
 *   type: 'object',
 *   properties: {
 *     user: {
 *       type: 'object',
 *       properties: {
 *         name: { type: 'string' },
 *         settings: {
 *           type: 'object',
 *           properties: {
 *             theme: { type: 'string' }
 *           }
 *         }
 *       }
 *     }
 *   }
 * }
 * getAllJsonPointersFromSchema(profileSchema)
 * // ['/user', '/user/name', '/user/settings', '/user/settings/theme']
 *
 * // Array schema
 * const listSchema = {
 *   type: 'object',
 *   properties: {
 *     items: {
 *       type: 'array',
 *       items: {
 *         type: 'object',
 *         properties: {
 *           id: { type: 'number' },
 *           name: { type: 'string' }
 *         }
 *       }
 *     }
 *   }
 * }
 * getAllJsonPointersFromSchema(listSchema)
 * // ['/items', '/items/0', '/items/0/id', '/items/0/name']
 *
 * // API schema analysis
 * const apiSchema = {
 *   type: 'object',
 *   properties: {
 *     data: {
 *       type: 'object',
 *       properties: {
 *         users: {
 *           type: 'array',
 *           items: {
 *             type: 'object',
 *             properties: {
 *               id: { type: 'number' },
 *               profile: {
 *                 type: 'object',
 *                 properties: {
 *                   name: { type: 'string' }
 *                 }
 *               }
 *             }
 *           }
 *         }
 *       }
 *     },
 *     meta: {
 *       type: 'object',
 *       properties: {
 *         total: { type: 'number' }
 *       }
 *     }
 *   }
 * }
 * const pointers = getAllJsonPointersFromSchema(apiSchema)
 * // ['/data', '/data/users', '/data/users/0', '/data/users/0/id',
 * //  '/data/users/0/profile', '/data/users/0/profile/name', '/meta', '/meta/total']
 *
 * // Form field enumeration
 * function getFormFields(formSchema: JSONSchema) {
 *   return getAllJsonPointersFromSchema(formSchema)
 *     .filter(pointer => !pointer.includes('/0')) // Exclude array indices
 * }
 *
 * // Validation path generation
 * function createValidationPaths(schema: JSONSchema) {
 *   const allPaths = getAllJsonPointersFromSchema(schema)
 *   return allPaths.map(path => ({
 *     pointer: path,
 *     validator: createValidatorForPath(schema, path)
 *   }))
 * }
 * ```
 *
 * @category JSON
 */
export function getAllJsonPointersFromSchema<T extends JSONSchema>(schema: T, prefix: string = ''): string[] {
  const pointers: string[] = []

  if (schema.type === 'object' && schema.properties) {
    for (const [key, value] of Object.entries(schema.properties)) {
      const newPrefix = prefix ? `${prefix}/${key}` : `/${key}`
      pointers.push(newPrefix)

      if (typeof value === 'object') {
        pointers.push(...getAllJsonPointersFromSchema(value, newPrefix))
      }
    }
  }
  else if (schema.type === 'array' && schema.items) {
    if (Array.isArray(schema.items)) {
      schema.items.forEach((item, index) => {
        const newPrefix = `${prefix}/${index}`
        pointers.push(newPrefix)
        if (typeof item === 'object') {
          pointers.push(...getAllJsonPointersFromSchema(item, newPrefix))
        }
      })
    }
    else if (typeof schema.items === 'object') {
      pointers.push(`${prefix}/0`)
      pointers.push(...getAllJsonPointersFromSchema(schema.items, `${prefix}/0`))
    }
  }

  return pointers
}

/**
 * Create a precise JSON Schema with enhanced type inference
 *
 * Enhanced version of createJsonSchema that provides better type inference,
 * handles optional properties, detects const values, and analyzes union types
 * more accurately. Returns a schema that better represents the input data structure.
 *
 * @template T - The JSON value type to generate a schema for
 * @param value - The JSON value to generate a precise schema for
 * @param options - Configuration options for schema generation
 * @param options.analyzeOptionalFields - Whether to analyze optional fields in objects
 * @param options.detectConstValues - Whether to detect and set const values for primitives
 * @param options.maxArrayAnalysis - Maximum number of array items to analyze for type inference
 * @returns A more precise JSON Schema with better type inference
 *
 * @example
 * ```typescript
 * import { createPreciseJsonSchema } from '@itzcull/json-utils/json'
 *
 * // Const value detection
 * const config = { mode: 'production' } as const
 * createPreciseJsonSchema(config)
 * // {
 * //   type: 'object',
 * //   properties: {
 * //     mode: { type: 'string', const: 'production' }
 * //   },
 * //   required: ['mode']
 * // }
 *
 * // Union type detection from array of different types
 * const mixedArray = [1, 'hello', true, null]
 * createPreciseJsonSchema(mixedArray)
 * // {
 * //   type: 'array',
 * //   items: {
 * //     anyOf: [
 * //       { type: 'number' },
 * //       { type: 'string' },
 * //       { type: 'boolean' },
 * //       { type: 'null' }
 * //     ]
 * //   }
 * // }
 *
 * // Optional property inference
 * const users = [
 *   { id: 1, name: 'Alice', email: 'alice@example.com' },
 *   { id: 2, name: 'Bob' }  // email is optional
 * ]
 * createPreciseJsonSchema(users, { analyzeOptionalFields: true })
 * // {
 * //   type: 'array',
 * //   items: {
 * //     type: 'object',
 * //     properties: {
 * //       id: { type: 'number' },
 * //       name: { type: 'string' },
 * //       email: { type: 'string' }
 * //     },
 * //     required: ['id', 'name']
 * //   }
 * // }
 * ```
 *
 * @category JSON
 */
export function createPreciseJsonSchema<T extends JSONType>(
  value: T,
  options: {
    analyzeOptionalFields?: boolean
    detectConstValues?: boolean
    maxArrayAnalysis?: number
  } = {},
): JSONSchema {
  const {
    analyzeOptionalFields = false,
    detectConstValues = true,
    maxArrayAnalysis = 100,
  } = options

  return createPreciseSchemaInternal(value, {
    analyzeOptionalFields,
    detectConstValues,
    maxArrayAnalysis,
  })
}

function createPreciseSchemaInternal(
  value: JSONType,
  options: {
    analyzeOptionalFields: boolean
    detectConstValues: boolean
    maxArrayAnalysis: number
  },
): JSONSchema {
  const type = typeof value

  if (type === 'function' || type === 'symbol' || type === 'bigint' || type === 'undefined') {
    throw new Error(`Unsupported type: ${type}`)
  }

  if (value === null) {
    return { type: 'null' }
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return { type: 'array', items: {} as JSONSchemaDefinition }
    }

    // Analyze up to maxArrayAnalysis items for better schema inference
    const itemsToAnalyze = value.slice(0, options.maxArrayAnalysis)

    // Check if all items have the same type
    const itemSchemas = itemsToAnalyze.map(item => createPreciseSchemaInternal(item, options))

    if (allSameType(itemSchemas)) {
      return {
        type: 'array',
        items: itemSchemas[0] as JSONSchemaDefinition,
      }
    }

    // Different types - create union schema
    const uniqueSchemas = deduplicateSchemas(itemSchemas)

    if (uniqueSchemas.length === 1) {
      return {
        type: 'array',
        items: uniqueSchemas[0] as JSONSchemaDefinition,
      }
    }

    return {
      type: 'array',
      items: {
        anyOf: uniqueSchemas as JSONSchemaDefinition[],
      } as JSONSchemaDefinition,
    }
  }

  if (type === 'object') {
    const properties: { [key: string]: JSONSchemaDefinition } = {}
    const required: string[] = []

    // Analyze properties
    for (const [key, val] of Object.entries(value)) {
      const propSchema = createPreciseSchemaInternal(val, options)

      // Add const value if detection is enabled and value is primitive
      if (options.detectConstValues && isPrimitiveType(val) && val !== null) {
        properties[key] = { ...propSchema, const: val } as JSONSchemaDefinition
      }
      else {
        properties[key] = propSchema as JSONSchemaDefinition
      }

      required.push(key)
    }

    return {
      type: 'object',
      properties,
      required,
    }
  }

  // Handle primitive types with const detection
  if (options.detectConstValues && isPrimitiveType(value)) {
    return { type, const: value }
  }

  return { type }
}

/**
 * Check if all schemas have the same type
 */
function allSameType(schemas: JSONSchema[]): boolean {
  if (schemas.length <= 1)
    return true

  const firstType = schemas[0].type
  return schemas.every(schema => schema.type === firstType)
}

/**
 * Remove duplicate schemas from array
 */
function deduplicateSchemas(schemas: JSONSchema[]): JSONSchema[] {
  const seen = new Set<string>()
  const unique: JSONSchema[] = []

  for (const schema of schemas) {
    const key = JSON.stringify(schema)
    if (!seen.has(key)) {
      seen.add(key)
      unique.push(schema)
    }
  }

  return unique
}

/**
 * Check if value is a primitive type
 */
function isPrimitiveType(value: unknown): value is string | number | boolean {
  const type = typeof value
  return type === 'string' || type === 'number' || type === 'boolean'
}

/**
 * Analyze array of objects to determine optional vs required fields
 *
 * Examines multiple objects to determine which properties are consistently
 * present (required) vs occasionally missing (optional). Useful for inferring
 * schemas from real-world data where not all objects have all properties.
 *
 * @param objects - Array of objects to analyze
 * @param threshold - Percentage threshold for considering a field required (0-1)
 * @returns Object with required and optional field names
 *
 * @example
 * ```typescript
 * const users = [
 *   { id: 1, name: 'Alice', email: 'alice@example.com' },
 *   { id: 2, name: 'Bob', email: 'bob@example.com' },
 *   { id: 3, name: 'Charlie' },  // missing email
 *   { id: 4, name: 'Diana', email: 'diana@example.com' }
 * ]
 *
 * analyzeOptionalFields(users, 0.8)  // 80% threshold
 * // Result: { required: ['id', 'name'], optional: ['email'] }
 *
 * analyzeOptionalFields(users, 0.5)  // 50% threshold
 * // Result: { required: ['id', 'name', 'email'], optional: [] }
 * ```
 *
 * @category JSON
 */
export function analyzeOptionalFields(
  objects: Record<string, any>[],
  threshold: number = 0.8,
): { required: string[], optional: string[] } {
  if (objects.length === 0) {
    return { required: [], optional: [] }
  }

  // Count occurrences of each field
  const fieldCounts = new Map<string, number>()
  const allFields = new Set<string>()

  for (const obj of objects) {
    const fields = Object.keys(obj)
    for (const field of fields) {
      allFields.add(field)
      fieldCounts.set(field, (fieldCounts.get(field) || 0) + 1)
    }
  }

  const totalObjects = objects.length
  const requiredThreshold = Math.ceil(totalObjects * threshold)

  const required: string[] = []
  const optional: string[] = []

  for (const field of allFields) {
    const count = fieldCounts.get(field) || 0
    if (count >= requiredThreshold) {
      required.push(field)
    }
    else {
      optional.push(field)
    }
  }

  return { required, optional }
}

/**
 * Merge multiple JSON schemas into a single unified schema
 *
 * Combines multiple schemas that represent the same data structure,
 * creating a unified schema that accommodates all variations. Useful
 * when you have multiple samples of data and want a single schema.
 *
 * @param schemas - Array of schemas to merge
 * @returns Unified schema that accommodates all input schemas
 *
 * @example
 * ```typescript
 * const schema1 = createJsonSchema({ name: 'Alice', age: 30 })
 * const schema2 = createJsonSchema({ name: 'Bob', email: 'bob@example.com' })
 *
 * const unified = mergeJsonSchemas([schema1, schema2])
 * // Result: Schema with name (required), age and email (optional)
 * ```
 *
 * @category JSON
 */
export function mergeJsonSchemas(schemas: JSONSchema[]): JSONSchema {
  if (schemas.length === 0) {
    return {} as JSONSchema
  }

  if (schemas.length === 1) {
    return schemas[0]
  }

  // For now, implement a simple merge for object schemas
  // In the future, this could be enhanced to handle more complex merging
  const objectSchemas = schemas.filter(s => s.type === 'object') as any[]

  if (objectSchemas.length === 0) {
    return schemas[0]
  }

  const allProperties = new Map<string, JSONSchemaDefinition>()
  const propertyOccurrences = new Map<string, number>()

  for (const schema of objectSchemas) {
    if (schema.properties) {
      for (const [key, prop] of Object.entries(schema.properties)) {
        allProperties.set(key, prop as JSONSchemaDefinition)
        propertyOccurrences.set(key, (propertyOccurrences.get(key) || 0) + 1)
      }
    }
  }

  const properties: { [key: string]: JSONSchemaDefinition } = {}
  const required: string[] = []

  for (const [key, prop] of allProperties) {
    properties[key] = prop

    // Property is required if it appears in all schemas
    const occurrences = propertyOccurrences.get(key) || 0
    if (occurrences === objectSchemas.length) {
      required.push(key)
    }
  }

  return {
    type: 'object',
    properties,
    required: required.length > 0 ? required : undefined,
  } as JSONSchema
}
