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
 * import { createJsonSchema } from '@itzcull/utils/json'
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
export function createJsonSchema(value: JSONType): JSONSchema {
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
 * import { deleteUndefinedKeys } from '@itzcull/utils/json'
 *
 * // Object cleaning
 * const user = { name: 'John', age: undefined, email: 'john@example.com' }
 * deleteUndefinedKeys(user) // { name: 'John', email: 'john@example.com' }
 *
 * // Nested object cleaning
 * const data = {
 *   user: { name: 'John', temp: undefined },
 *   config: { debug: true, secret: undefined },
 *   meta: undefined
 * }
 * deleteUndefinedKeys(data)
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
 * deleteUndefinedKeys(items)
 * // [
 * //   { id: 1, name: 'Item 1' },
 * //   { id: 2, name: 'Item 2' }
 * // ]
 *
 * // API response cleaning
 * function cleanApiResponse(response: any) {
 *   return deleteUndefinedKeys(response)
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
 *   return deleteUndefinedKeys(formData)
 * }
 *
 * // Configuration cleanup
 * const config = {
 *   database: { host: 'localhost', password: undefined },
 *   cache: { enabled: true, ttl: undefined },
 *   features: undefined
 * }
 * const cleanConfig = deleteUndefinedKeys(config)
 * // {
 * //   database: { host: 'localhost' },
 * //   cache: { enabled: true }
 * // }
 *
 * // Primitive values (returned as-is)
 * deleteUndefinedKeys('hello') // 'hello'
 * deleteUndefinedKeys(42) // 42
 * deleteUndefinedKeys(null) // null
 * ```
 *
 * @category JSON
 */
export function deleteUndefinedKeys<T extends JSONType>(data: T): T {
  if (data === null || typeof data !== 'object') {
    return data
  }

  if (Array.isArray(data)) {
    for (let i = 0; i < data.length; i++) {
      if (data[i] !== undefined) {
        data[i] = deleteUndefinedKeys(data[i] as JSONType)
      }
    }
    return data
  }

  for (const key in data) {
    if (data[key] === undefined) {
      delete data[key]
    }
    else if (typeof data[key] === 'object') {
      data[key] = deleteUndefinedKeys(data[key] as JSONType)
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
 * import { generatePointersFromJsonSchema } from '@itzcull/utils/json'
 *
 * // Simple object schema
 * const userSchema = {
 *   type: 'object',
 *   properties: {
 *     name: { type: 'string' },
 *     age: { type: 'number' }
 *   }
 * }
 * generatePointersFromJsonSchema(userSchema)
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
 * generatePointersFromJsonSchema(profileSchema)
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
 * generatePointersFromJsonSchema(listSchema)
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
 * const pointers = generatePointersFromJsonSchema(apiSchema)
 * // ['/data', '/data/users', '/data/users/0', '/data/users/0/id',
 * //  '/data/users/0/profile', '/data/users/0/profile/name', '/meta', '/meta/total']
 *
 * // Form field enumeration
 * function getFormFields(formSchema: JSONSchema) {
 *   return generatePointersFromJsonSchema(formSchema)
 *     .filter(pointer => !pointer.includes('/0')) // Exclude array indices
 * }
 *
 * // Validation path generation
 * function createValidationPaths(schema: JSONSchema) {
 *   const allPaths = generatePointersFromJsonSchema(schema)
 *   return allPaths.map(path => ({
 *     pointer: path,
 *     validator: createValidatorForPath(schema, path)
 *   }))
 * }
 * ```
 *
 * @category JSON
 */
export function generatePointersFromJsonSchema(schema: JSONSchema, prefix: string = ''): string[] {
  const pointers: string[] = []

  if (schema.type === 'object' && schema.properties) {
    for (const [key, value] of Object.entries(schema.properties)) {
      const newPrefix = prefix ? `${prefix}/${key}` : `/${key}`
      pointers.push(newPrefix)

      if (typeof value === 'object') {
        pointers.push(...generatePointersFromJsonSchema(value, newPrefix))
      }
    }
  }
  else if (schema.type === 'array' && schema.items) {
    if (Array.isArray(schema.items)) {
      schema.items.forEach((item, index) => {
        const newPrefix = `${prefix}/${index}`
        pointers.push(newPrefix)
        if (typeof item === 'object') {
          pointers.push(...generatePointersFromJsonSchema(item, newPrefix))
        }
      })
    }
    else if (typeof schema.items === 'object') {
      pointers.push(`${prefix}/0`)
      pointers.push(...generatePointersFromJsonSchema(schema.items, `${prefix}/0`))
    }
  }

  return pointers
}
