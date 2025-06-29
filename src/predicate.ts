import type { JSONArray, JSONObject, JSONType, JSONTypeName } from './types'

/**
 * Type guard to check if a value is a valid JSON value
 *
 * Validates that a value can be safely serialized to JSON. Checks for valid JSON types
 * (null, boolean, string, finite number, array, or plain object) and recursively validates
 * nested structures. Rejects functions, symbols, undefined, NaN, Infinity, and non-plain objects.
 *
 * @param obj - The value to check for JSON validity
 * @returns True if the value is a valid JSON value
 *
 * @example
 * ```typescript
 * import { isJsonValue } from '@itzcull/utils/json'
 *
 * // Valid JSON values
 * isJsonValue(null) // true
 * isJsonValue(true) // true
 * isJsonValue('hello') // true
 * isJsonValue(42) // true
 * isJsonValue([1, 2, 3]) // true
 * isJsonValue({ name: 'John', age: 30 }) // true
 *
 * // Invalid JSON values
 * isJsonValue(undefined) // false
 * isJsonValue(NaN) // false
 * isJsonValue(Infinity) // false
 * isJsonValue(() => {}) // false
 * isJsonValue(Symbol('test')) // false
 * isJsonValue(new Date()) // false
 *
 * // Nested validation
 * isJsonValue({ user: { name: 'John', hobbies: ['reading'] } }) // true
 * isJsonValue({ user: { created: new Date() } }) // false (Date not valid)
 * isJsonValue([1, 'hello', { valid: true }]) // true
 * isJsonValue([1, undefined, 3]) // false (undefined not valid)
 *
 * // API data validation
 * function validateApiPayload(data: unknown) {
 *   if (!isJsonValue(data)) {
 *     throw new Error('Payload contains non-JSON values')
 *   }
 *   return JSON.stringify(data)
 * }
 *
 * // Form data processing
 * function processFormData(formData: Record<string, unknown>) {
 *   const validData = Object.fromEntries(
 *     Object.entries(formData).filter(([_, value]) => isJsonValue(value))
 *   )
 *   return validData
 * }
 *
 * // Configuration validation
 * const config = {
 *   apiUrl: 'https://api.example.com',
 *   timeout: 5000,
 *   debug: true,
 *   handler: () => {} // This would make the config invalid
 * }
 * if (isJsonValue(config)) {
 *   localStorage.setItem('config', JSON.stringify(config))
 * }
 * ```
 *
 * @category JSON
 */
export function isJsonValue(obj: any): obj is JSONType {
  if (obj === null)
    return true

  const type = typeof obj

  if (type === 'boolean')
    return true
  if (type === 'string')
    return true
  if (type === 'number')
    return Number.isFinite(obj)

  if (Array.isArray(obj)) {
    return obj.every(isJsonValue)
  }

  if (type === 'object') {
    // Check if it's a plain object (created by {} or Object.create(null))
    if (Object.getPrototypeOf(obj) !== Object.prototype && Object.getPrototypeOf(obj) !== null) {
      return false
    }

    return Object.values(obj).every(isJsonValue)
  }

  return false
}

/**
 * Type guard to check if a value is a JSON object
 *
 * Validates that a value is a plain object that can be serialized to JSON.
 * Must be a valid JSON value, of type object, not an array, and not null.
 *
 * @param obj - The value to check
 * @returns True if the value is a JSON object
 *
 * @example
 * ```typescript
 * import { isJsonObject } from '@itzcull/utils/json'
 *
 * // Valid JSON objects
 * isJsonObject({}) // true
 * isJsonObject({ name: 'John' }) // true
 * isJsonObject({ user: { profile: { name: 'Jane' } } }) // true
 *
 * // Invalid JSON objects
 * isJsonObject(null) // false (null is not an object)
 * isJsonObject([]) // false (arrays are not objects)
 * isJsonObject('hello') // false (strings are not objects)
 * isJsonObject(new Date()) // false (Date objects are not plain objects)
 *
 * // Object validation in APIs
 * function updateUser(data: unknown) {
 *   if (!isJsonObject(data)) {
 *     throw new Error('User data must be an object')
 *   }
 *   // TypeScript now knows data is JSONObject
 *   return { ...data, updatedAt: new Date().toISOString() }
 * }
 *
 * // Configuration merging
 * function mergeConfig(base: unknown, override: unknown) {
 *   if (!isJsonObject(base) || !isJsonObject(override)) {
 *     throw new Error('Both arguments must be JSON objects')
 *   }
 *   return { ...base, ...override }
 * }
 *
 * // Form validation
 * function validateFormData(data: unknown) {
 *   if (!isJsonObject(data)) {
 *     return { valid: false, error: 'Form data must be an object' }
 *   }
 *
 *   const requiredFields = ['name', 'email']
 *   for (const field of requiredFields) {
 *     if (!(field in data)) {
 *       return { valid: false, error: `Missing required field: ${field}` }
 *     }
 *   }
 *
 *   return { valid: true, data }
 * }
 * ```
 *
 * @category JSON
 */
export function isJsonObject(obj: any): obj is JSONObject {
  return isJsonValue(obj) && typeof obj === 'object' && !Array.isArray(obj) && obj !== null
}

/**
 * Type guard to check if a value is a JSON array
 *
 * Validates that a value is an array containing only valid JSON values.
 * Must be a valid JSON value and an array.
 *
 * @param obj - The value to check
 * @returns True if the value is a JSON array
 *
 * @example
 * ```typescript
 * import { isJsonArray } from '@itzcull/utils/json'
 *
 * // Valid JSON arrays
 * isJsonArray([]) // true
 * isJsonArray([1, 2, 3]) // true
 * isJsonArray(['hello', 'world']) // true
 * isJsonArray([{ name: 'John' }, { name: 'Jane' }]) // true
 * isJsonArray([1, 'hello', true, null]) // true
 *
 * // Invalid JSON arrays
 * isJsonArray({}) // false (objects are not arrays)
 * isJsonArray('hello') // false (strings are not arrays)
 * isJsonArray(null) // false (null is not an array)
 * isJsonArray([1, undefined, 3]) // false (contains undefined)
 * isJsonArray([() => {}]) // false (contains function)
 *
 * // API response validation
 * function processApiResponse(response: unknown) {
 *   if (!isJsonArray(response)) {
 *     throw new Error('Expected array response')
 *   }
 *   // TypeScript knows response is JSONArray
 *   return response.map((item, index) => ({ ...item, index }))
 * }
 *
 * // List processing
 * function validateItemList(items: unknown) {
 *   if (!isJsonArray(items)) {
 *     return { valid: false, error: 'Items must be an array' }
 *   }
 *
 *   if (items.length === 0) {
 *     return { valid: false, error: 'Items array cannot be empty' }
 *   }
 *
 *   return { valid: true, items }
 * }
 *
 * // Configuration arrays
 * const config = {
 *   servers: ['server1.com', 'server2.com'],
 *   ports: [8080, 8081, 8082],
 *   features: [{ name: 'auth', enabled: true }]
 * }
 *
 * Object.entries(config).forEach(([key, value]) => {
 *   if (isJsonArray(value)) {
 *     console.log(`${key} is a valid JSON array with ${value.length} items`)
 *   }
 * })
 * ```
 *
 * @category JSON
 */
export function isJsonArray(obj: any): obj is JSONArray {
  return isJsonValue(obj) && Array.isArray(obj)
}

/**
 * Validate if a string is a valid JSON Pointer
 *
 * Checks if a string follows RFC 6901 JSON Pointer syntax. A valid JSON Pointer
 * is either an empty string (root) or starts with '/' followed by path segments.
 *
 * @param pointer - The string to validate as a JSON Pointer
 * @returns True if the string is a valid JSON Pointer
 *
 * @example
 * ```typescript
 * import { isJsonPointer } from '@itzcull/utils/json'
 *
 * // Valid JSON Pointers
 * isJsonPointer('') // true (root pointer)
 * isJsonPointer('/') // true (root with slash)
 * isJsonPointer('/user') // true
 * isJsonPointer('/user/name') // true
 * isJsonPointer('/items/0') // true
 * isJsonPointer('/data/users/0/profile/settings') // true
 *
 * // Invalid JSON Pointers
 * isJsonPointer('user') // false (must start with / or be empty)
 * isJsonPointer('user/name') // false (must start with /)
 * isJsonPointer(null) // false (must be string)
 * isJsonPointer(123) // false (must be string)
 *
 * // Escaped characters (still valid)
 * isJsonPointer('/user/first~1name') // true (escaped /)
 * isJsonPointer('/config/api~0key') // true (escaped ~)
 *
 * // API path validation
 * function validateApiPath(path: unknown) {
 *   if (typeof path !== 'string') {
 *     throw new Error('API path must be a string')
 *   }
 *   if (!isJsonPointer(path)) {
 *     throw new Error('API path must be a valid JSON Pointer')
 *   }
 *   return path
 * }
 *
 * // Form field path validation
 * function getFormFieldValue(formData: any, fieldPath: string) {
 *   if (!isJsonPointer(fieldPath)) {
 *     throw new Error(`Invalid field path: ${fieldPath}`)
 *   }
 *   return getJsonValueAtPointer(formData, fieldPath)
 * }
 *
 * // Configuration path checking
 * const configPaths = ['/database/host', '/api/timeout', 'invalid-path']
 * const validPaths = configPaths.filter(isJsonPointer)
 * // ['database/host', '/api/timeout']
 * ```
 *
 * @category JSON
 */
export function isJsonPointer(pointer: string): boolean {
  return typeof pointer === 'string' && (pointer === '' || (pointer.startsWith('/') && pointer.split('/').length > 0))
}

// isJsonValueType
export const VALID_JSON_TYPE_NAMES = new Set<string>([
  'array',
  'boolean',
  'integer',
  'number',
  'null',
  'object',
  'string',
] satisfies JSONTypeName[])

/**
 * Type guard to check if a value is a valid JSON type name
 *
 * Validates that a string represents a valid JSON Schema type name.
 * Used for JSON Schema validation and type checking.
 *
 * @param val - The value to check
 * @returns True if the value is a valid JSON type name
 *
 * @example
 * ```typescript
 * import { isJsonValueType } from '@itzcull/utils/json'
 *
 * // Valid JSON type names
 * isJsonValueType('string') // true
 * isJsonValueType('number') // true
 * isJsonValueType('boolean') // true
 * isJsonValueType('object') // true
 * isJsonValueType('array') // true
 * isJsonValueType('null') // true
 * isJsonValueType('integer') // true
 *
 * // Invalid type names
 * isJsonValueType('function') // false
 * isJsonValueType('undefined') // false
 * isJsonValueType('symbol') // false
 * isJsonValueType('bigint') // false
 * isJsonValueType('date') // false
 * isJsonValueType(123) // false (not a string)
 *
 * // Schema validation
 * function validateSchemaType(schema: { type: unknown }) {
 *   if (!isJsonValueType(schema.type)) {
 *     throw new Error(`Invalid schema type: ${schema.type}`)
 *   }
 *   // TypeScript knows schema.type is JSONTypeName
 *   return schema.type
 * }
 *
 * // Dynamic type checking
 * function createValidator(typeName: string) {
 *   if (!isJsonValueType(typeName)) {
 *     throw new Error(`Unsupported type: ${typeName}`)
 *   }
 *
 *   return (value: any) => {
 *     switch (typeName) {
 *       case 'string': return typeof value === 'string'
 *       case 'number': return typeof value === 'number'
 *       case 'boolean': return typeof value === 'boolean'
 *       case 'object': return isJsonObject(value)
 *       case 'array': return isJsonArray(value)
 *       case 'null': return value === null
 *       default: return false
 *     }
 *   }
 * }
 *
 * // API schema processing
 * const apiSchema = {
 *   properties: {
 *     name: { type: 'string' },
 *     age: { type: 'number' },
 *     active: { type: 'boolean' }
 *   }
 * }
 *
 * Object.entries(apiSchema.properties).forEach(([field, schema]) => {
 *   if (isJsonValueType(schema.type)) {
 *     console.log(`Field ${field} has valid type: ${schema.type}`)
 *   }
 * })
 * ```
 *
 * @category JSON
 */
export function isJsonValueType(val: unknown): val is JSONTypeName {
  if (typeof val !== 'string')
    return false
  return VALID_JSON_TYPE_NAMES.has(val)
}
