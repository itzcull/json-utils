import type { JSONObject, JSONType, JSONTypeName } from './types'
import { getJsonValueAtPointer } from './pointer'
import { isJsonArray, isJsonObject, isJsonPointer } from './predicate'

/**
 * Validate if a JSON Pointer path exists and is accessible in a JSON object
 *
 * Checks whether a given JSON Pointer path can be successfully resolved in the provided
 * JSON object. This is useful for validating paths before attempting to access values.
 *
 * @param json - The JSON object to validate the path against
 * @param path - The JSON Pointer path to validate
 * @returns True if the path exists and is accessible, false otherwise
 *
 * @example
 * ```typescript
 * import { validateJsonPointerPath } from '@itzcull/json-utils'
 *
 * const user = {
 *   profile: {
 *     name: 'John',
 *     settings: {
 *       theme: 'dark'
 *     }
 *   },
 *   tags: ['admin', 'user']
 * }
 *
 * // Valid paths
 * validateJsonPointerPath(user, '/profile/name') // true
 * validateJsonPointerPath(user, '/profile/settings/theme') // true
 * validateJsonPointerPath(user, '/tags/0') // true
 * validateJsonPointerPath(user, '/tags/1') // true
 *
 * // Invalid paths
 * validateJsonPointerPath(user, '/profile/email') // false
 * validateJsonPointerPath(user, '/tags/5') // false
 * validateJsonPointerPath(user, '/nonexistent') // false
 *
 * // Form validation
 * const formSchema = {
 *   required: ['/name', '/email'],
 *   optional: ['/age', '/phone']
 * }
 *
 * function validateForm(data: any) {
 *   const missingRequired = formSchema.required.filter(
 *     path => !validateJsonPointerPath(data, path)
 *   )
 *
 *   if (missingRequired.length > 0) {
 *     throw new Error(`Missing required fields: ${missingRequired.join(', ')}`)
 *   }
 * }
 *
 * // API parameter validation
 * function getNestedValue(data: any, path: string) {
 *   if (!validateJsonPointerPath(data, path)) {
 *     throw new Error(`Invalid path: ${path}`)
 *   }
 *   return getJsonValueAtPointer(data, path)
 * }
 *
 * // Configuration validation
 * const requiredConfigPaths = [
 *   '/database/host',
 *   '/database/port',
 *   '/api/key'
 * ]
 *
 * function validateConfig(config: any) {
 *   return requiredConfigPaths.every(path =>
 *     validateJsonPointerPath(config, path)
 *   )
 * }
 * ```
 *
 * @category JSON
 */
export function validateJsonPointerPath(json: JSONObject, path: string): boolean {
  try {
    if (!isJsonPointer(path)) {
      return false
    }

    const value = getJsonValueAtPointer(json, path)
    return value !== undefined
  }
  catch {
    return false
  }
}

/**
 * Safely coerce a value to a specified JSON type
 *
 * Attempts to convert a value to the specified JSON type. Returns the coerced value
 * if successful, or null if the coercion fails. Useful for processing user input
 * or API data where types might not match expected schemas.
 *
 * @param value - The value to coerce
 * @param targetType - The target JSON type
 * @returns The coerced value if successful, null if coercion fails
 *
 * @example
 * ```typescript
 * import { coerceToJsonType } from '@itzcull/json-utils'
 *
 * // String to number coercion
 * coerceToJsonType('42', 'number') // 42
 * coerceToJsonType('3.14', 'number') // 3.14
 * coerceToJsonType('not-a-number', 'number') // null
 *
 * // String to boolean coercion
 * coerceToJsonType('true', 'boolean') // true
 * coerceToJsonType('false', 'boolean') // false
 * coerceToJsonType('TRUE', 'boolean') // true
 * coerceToJsonType('maybe', 'boolean') // null
 *
 * // String to null coercion
 * coerceToJsonType('null', 'null') // null
 * coerceToJsonType('NULL', 'null') // null
 *
 * // Form data processing
 * function processFormField(value: string, expectedType: JSONTypeName) {
 *   const coerced = coerceToJsonType(value, expectedType)
 *   if (coerced === null && value !== 'null') {
 *     throw new Error(`Cannot convert "${value}" to ${expectedType}`)
 *   }
 *   return coerced
 * }
 *
 * // Query parameter coercion
 * const queryParams = {
 *   page: '1',
 *   limit: '10',
 *   active: 'true'
 * }
 *
 * const typedParams = {
 *   page: coerceToJsonType(queryParams.page, 'number'),
 *   limit: coerceToJsonType(queryParams.limit, 'number'),
 *   active: coerceToJsonType(queryParams.active, 'boolean')
 * }
 * // { page: 1, limit: 10, active: true }
 *
 * // Configuration value coercion
 * function parseConfigValue(value: string, type: JSONTypeName) {
 *   const parsed = coerceToJsonType(value, type)
 *   return parsed ?? value // Fallback to original string
 * }
 *
 * // API response normalization
 * function normalizeApiField(field: any, expectedType: JSONTypeName) {
 *   if (typeof field === 'string') {
 *     const coerced = coerceToJsonType(field, expectedType)
 *     return coerced !== null ? coerced : field
 *   }
 *   return field
 * }
 * ```
 *
 * @category JSON
 */
export function coerceToJsonType(value: any, targetType: JSONTypeName): JSONType | null {
  // Handle already correct types
  switch (targetType) {
    case 'string':
      return typeof value === 'string' ? value : null

    case 'number':
      if (typeof value === 'number' && Number.isFinite(value)) {
        return value
      }
      if (typeof value === 'string') {
        const num = Number(value)
        return Number.isFinite(num) ? num : null
      }
      return null

    case 'integer':
      if (typeof value === 'number' && Number.isInteger(value)) {
        return value
      }
      if (typeof value === 'string') {
        const num = Number(value)
        return Number.isInteger(num) ? num : null
      }
      return null

    case 'boolean':
      if (typeof value === 'boolean') {
        return value
      }
      if (typeof value === 'string') {
        const lower = value.toLowerCase()
        if (lower === 'true')
          return true
        if (lower === 'false')
          return false
      }
      return null

    case 'null':
      if (value === null) {
        return null
      }
      if (typeof value === 'string' && value.toLowerCase() === 'null') {
        return null
      }
      return null

    case 'array':
      return isJsonArray(value) ? value : null

    case 'object':
      return isJsonObject(value) ? value : null

    default:
      return null
  }
}

/**
 * Remove non-JSON values and dangerous content from an object
 *
 * Recursively removes functions, undefined values, symbols, NaN, Infinity, Date objects,
 * and other non-JSON-serializable values. Also handles circular references by removing them.
 * This is useful for cleaning user input or preparing data for JSON serialization.
 *
 * @param data - The data to sanitize
 * @returns A new object with only JSON-safe values
 *
 * @example
 * ```typescript
 * import { sanitizeJson } from '@itzcull/json-utils'
 *
 * // Basic sanitization
 * const input = {
 *   name: 'John',
 *   age: 30,
 *   handler: () => console.log('Hello'),
 *   temp: undefined,
 *   created: new Date(),
 *   invalid: NaN
 * }
 *
 * const clean = sanitizeJson(input)
 * // { name: 'John', age: 30 }
 *
 * // Nested object sanitization
 * const complex = {
 *   user: {
 *     profile: {
 *       name: 'Alice',
 *       process: function() { return 'unsafe' },
 *       settings: {
 *         theme: 'dark',
 *         callback: () => {}
 *       }
 *     }
 *   },
 *   items: [
 *     'valid',
 *     undefined,
 *     { name: 'Item', handler: () => {} },
 *     42
 *   ]
 * }
 *
 * const sanitized = sanitizeJson(complex)
 * // {
 * //   user: {
 * //     profile: {
 * //       name: 'Alice',
 * //       settings: { theme: 'dark' }
 * //     }
 * //   },
 * //   items: ['valid', { name: 'Item' }, 42]
 * // }
 *
 * // API response cleaning
 * function cleanApiResponse(response: any) {
 *   return sanitizeJson(response)
 * }
 *
 * // User input sanitization
 * function sanitizeUserInput(input: any) {
 *   const clean = sanitizeJson(input)
 *
 *   // Additional validation
 *   if (Object.keys(clean).length === 0) {
 *     throw new Error('No valid data provided')
 *   }
 *
 *   return clean
 * }
 *
 * // Configuration cleaning
 * function loadConfig(rawConfig: any) {
 *   const clean = sanitizeJson(rawConfig)
 *
 *   // Ensure required fields exist
 *   const required = ['host', 'port']
 *   for (const field of required) {
 *     if (!(field in clean)) {
 *       throw new Error(`Missing required field: ${field}`)
 *     }
 *   }
 *
 *   return clean
 * }
 *
 * // Circular reference handling
 * const obj: any = { name: 'test' }
 * obj.self = obj
 * const cleaned = sanitizeJson(obj) // { name: 'test' }
 * ```
 *
 * @category JSON
 */
export function sanitizeJson(data: any): JSONType {
  const seen = new WeakSet()

  const sanitize = (value: any): JSONType => {
    // Handle primitives
    if (value === null)
      return null
    if (typeof value === 'boolean')
      return value
    if (typeof value === 'string')
      return value
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : null
    }

    // Remove non-JSON types
    if (
      typeof value === 'function'
      || typeof value === 'symbol'
      || typeof value === 'undefined'
      || typeof value === 'bigint'
      || value instanceof Date
      || value instanceof RegExp
      || value instanceof Error
    ) {
      return null
    }

    // Handle circular references
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        return null // Remove circular reference
      }
      seen.add(value)
    }

    // Handle arrays
    if (Array.isArray(value)) {
      const result: JSONType[] = []
      for (const item of value) {
        const sanitized = sanitize(item)
        if (sanitized !== null || item === null) {
          result.push(sanitized)
        }
      }
      seen.delete(value)
      return result
    }

    // Handle objects
    if (typeof value === 'object') {
      const result: JSONObject = {}
      for (const key in value) {
        if (Object.prototype.hasOwnProperty.call(value, key)) {
          const sanitized = sanitize(value[key])
          if (sanitized !== null || value[key] === null) {
            result[key] = sanitized
          }
        }
      }
      seen.delete(value)
      return result
    }

    return null
  }

  const result = sanitize(data)
  return result === null ? {} : result
}
