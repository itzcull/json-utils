import type { JSONObject, JSONType } from './types'

// Helper imports
import { isJsonObject, isJsonPointer } from './predicate'

/**
 * Parse a JSON Pointer string into its component segments
 *
 * Converts a JSON Pointer string into an array of unescaped path segments.
 * Handles RFC 6901 escaping rules (~0 for ~ and ~1 for /).
 *
 * @param pointer - JSON Pointer string (e.g., "/user/name" or "/items/0")
 * @returns Array of unescaped path segments
 * @throws {Error} When the pointer is not a valid JSON Pointer
 *
 * @example
 * ```typescript
 * import { getJsonPointerSegments } from '@itzcull/json-utils/json'
 *
 * // Basic path parsing
 * getJsonPointerSegments('/user/name') // ['user', 'name']
 * getJsonPointerSegments('/items/0/title') // ['items', '0', 'title']
 * getJsonPointerSegments('') // [] (root pointer)
 *
 * // Escaped characters
 * getJsonPointerSegments('/user/first~1name') // ['user', 'first/name']
 * getJsonPointerSegments('/config/api~0key') // ['config', 'api~key']
 *
 * // Complex paths
 * getJsonPointerSegments('/data/users/0/profile/settings')
 * // ['data', 'users', '0', 'profile', 'settings']
 *
 * // API endpoint parsing
 * const apiPath = '/v1/users/123/posts/456/comments'
 * const segments = getJsonPointerSegments(apiPath)
 * // ['v1', 'users', '123', 'posts', '456', 'comments']
 *
 * // Dynamic path building
 * function buildApiPath(resource: string, id: string, subResource?: string) {
 *   const basePath = `/${resource}/${id}`
 *   const fullPath = subResource ? `${basePath}/${subResource}` : basePath
 *   return getJsonPointerSegments(fullPath)
 * }
 * ```
 *
 * @category JSON
 */
export function getJsonPointerSegments(pointer: string): string[] {
  if (!isJsonPointer(pointer)) {
    throw new Error(`Invalid JSON Pointer: ${pointer}`)
  }

  const segments = pointer.split('/')
  segments.shift() // Remove the leading '' after splitting

  const decodedSegments = segments.map((segment) => {
    return segment.replace(/~1/g, '/').replace(/~0/g, '~')
  })

  return decodedSegments
}

/**
 * Convert a JSON Schema pointer to a JSON Pointer
 *
 * Transforms a JSON Schema pointer (with properties/items keywords) into a regular JSON Pointer.
 * Removes schema-specific keywords and converts array item references to numeric indices.
 *
 * @param jsonSchemaPointer - JSON Schema pointer string
 * @returns Corresponding JSON Pointer string
 *
 * @example
 * ```typescript
 * import { toJsonPointer } from '@itzcull/json-utils/json'
 *
 * // Schema to data pointer conversion
 * toJsonPointer('/properties/user/properties/name') // '/user/name'
 * toJsonPointer('/properties/items/items/0') // '/items/0'
 * toJsonPointer('/properties/config/properties/database') // '/config/database'
 *
 * // Array handling
 * toJsonPointer('/properties/users/items') // '/users/0'
 * toJsonPointer('/properties/data/items/properties/id') // '/data/0/id'
 *
 * // Root and empty pointers
 * toJsonPointer('') // '/'
 * toJsonPointer('/') // '/'
 *
 * // Schema validation to data access
 * const schemaPath = '/properties/api/properties/endpoints/items/properties/method'
 * const dataPath = toJsonPointer(schemaPath) // '/api/endpoints/0/method'
 *
 * // Form validation mapping
 * function mapSchemaErrorToField(schemaError: { instancePath: string }) {
 *   const schemaPath = schemaError.instancePath
 *   return toJsonPointer(schemaPath)
 * }
 * ```
 *
 * @category JSON
 */
export function toJsonPointer(jsonSchemaPointer: string): string {
  const parts = getJsonPointerSegments(jsonSchemaPointer)
  let jsonPointer = ''

  if (jsonSchemaPointer === '' || jsonSchemaPointer === '/') {
    return '/'
  }

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]

    if (part === 'properties') {
      continue
    }

    if (part === 'items') {
      const nextPart = parts[i + 1]

      const maybeInt = nextPart === '' || nextPart === 'items' ? Number(nextPart) : Number.NaN

      if (!Number.isSafeInteger(maybeInt)) {
        jsonPointer += '/0'
      }

      continue
    }

    jsonPointer += `/${part}`
  }

  return jsonPointer
}

/**
 * Convert a JSON Pointer to a JSON Schema pointer
 *
 * Transforms a regular JSON Pointer into a JSON Schema pointer by adding
 * properties/items keywords as appropriate for schema navigation.
 *
 * @param pointer - JSON Pointer string
 * @returns Corresponding JSON Schema pointer string
 * @throws {Error} When the pointer is not a valid JSON Pointer
 *
 * @example
 * ```typescript
 * import { toJsonSchemaPointer } from '@itzcull/json-utils/json'
 *
 * // Data to schema pointer conversion
 * toJsonSchemaPointer('/user/name') // '/properties/user/properties/name'
 * toJsonSchemaPointer('/items/0') // '/properties/items/items/0'
 * toJsonSchemaPointer('/config/database') // '/properties/config/properties/database'
 *
 * // Array index handling
 * toJsonSchemaPointer('/users/0/profile') // '/properties/users/items/0/properties/profile'
 * toJsonSchemaPointer('/data/5/id') // '/properties/data/items/5/properties/id'
 *
 * // Root pointer
 * toJsonSchemaPointer('') // '/'
 * toJsonSchemaPointer('/') // '/'
 *
 * // Schema generation
 * function generateSchemaPath(dataPath: string) {
 *   return toJsonSchemaPointer(dataPath)
 * }
 *
 * // Validation error mapping
 * function createValidationError(fieldPath: string, message: string) {
 *   const schemaPath = toJsonSchemaPointer(fieldPath)
 *   return {
 *     schemaPath,
 *     dataPath: fieldPath,
 *     message
 *   }
 * }
 * ```
 *
 * @category JSON
 */
export function toJsonSchemaPointer(pointer: string): string {
  if (!isJsonPointer(pointer)) {
    throw new Error(`Invalid JSON Pointer: ${pointer}`)
  }

  if (pointer === '' || pointer === '/') {
    return '/'
  }

  const parts = getJsonPointerSegments(pointer)
  let schemaPointer = ''

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]
    const maybeInt = part !== '' ? Number(part) : Number.NaN

    if (Number.isSafeInteger(maybeInt)) {
      schemaPointer += `/items/${maybeInt}`
    }
    else {
      schemaPointer += `/properties/${part}`
    }
  }

  return schemaPointer
}

/**
 * Get a value from a JSON object using a JSON Pointer
 *
 * Safely retrieves a value from a nested JSON structure using RFC 6901 JSON Pointer syntax.
 * Returns undefined if the path doesn't exist or if any intermediate value is not an object/array.
 *
 * @param obj - The JSON object to read from
 * @param pointer - JSON Pointer string (e.g., "/user/name" or "/items/0/title")
 * @returns The value at the specified location, or undefined if not found
 * @throws {Error} When the object is not a valid JSON object
 * @throws {Error} When the pointer is not a valid JSON Pointer
 *
 * @example
 * ```typescript
 * import { getJsonValueAtPointer } from '@itzcull/json-utils/json'
 *
 * // Basic property access
 * const user = { name: 'John', age: 30 }
 * getJsonValueAtPointer(user, '/name') // 'John'
 * getJsonValueAtPointer(user, '/age') // 30
 * getJsonValueAtPointer(user, '/email') // undefined
 *
 * // Nested object access
 * const data = {
 *   user: { profile: { name: 'Jane', settings: { theme: 'dark' } } },
 *   items: ['apple', 'banana', 'cherry']
 * }
 * getJsonValueAtPointer(data, '/user/profile/name') // 'Jane'
 * getJsonValueAtPointer(data, '/user/profile/settings/theme') // 'dark'
 * getJsonValueAtPointer(data, '/items/1') // 'banana'
 *
 * // Array access
 * const config = { endpoints: [{ method: 'GET', path: '/users' }] }
 * getJsonValueAtPointer(config, '/endpoints/0/method') // 'GET'
 * getJsonValueAtPointer(config, '/endpoints/1') // undefined
 *
 * // Root access
 * getJsonValueAtPointer(data, '') // entire data object
 * getJsonValueAtPointer(data, '/') // entire data object
 *
 * // API response processing
 * const response = {
 *   data: { users: [{ id: 1, name: 'Alice' }] },
 *   meta: { total: 1, page: 1 }
 * }
 * const firstUser = getJsonValueAtPointer(response, '/data/users/0')
 * const totalCount = getJsonValueAtPointer(response, '/meta/total')
 *
 * // Safe property access
 * function safeGet(obj: any, path: string, defaultValue: any = null) {
 *   const value = getJsonValueAtPointer(obj, path)
 *   return value !== undefined ? value : defaultValue
 * }
 *
 * // Configuration reading
 * const settings = {
 *   database: { host: 'localhost', port: 5432 },
 *   features: { auth: true, logging: false }
 * }
 * const dbHost = getJsonValueAtPointer(settings, '/database/host')
 * const authEnabled = getJsonValueAtPointer(settings, '/features/auth')
 * ```
 *
 * @category JSON
 */
export function getJsonValueAtPointer<T extends JSONType>(obj: T, pointer: string): JSONType | undefined {
  const ROOT_POINTERS = ['/', '']
  if (ROOT_POINTERS.includes(pointer)) {
    return obj
  }

  if (!isJsonObject(obj)) {
    throw new Error(`Invalid JSON object: ${JSON.stringify(obj, null, 2)}`)
  }

  if (!isJsonPointer(pointer)) {
    throw new Error(`Invalid JSON Pointer: ${pointer}`)
  }

  const path = getJsonPointerSegments(pointer)
  let current: JSONType = obj

  for (const key of path) {
    if (Array.isArray(current) && /^\d+$/.test(key)) {
      const index = Number.parseInt(key, 10)
      current = index < (current as any[]).length ? (current as any[])[index] : undefined
    }
    else if (isJsonObject(current)) {
      current = (current as JSONObject)[key]
    }
    else {
      return undefined
    }

    if (current === undefined) {
      return undefined
    }
  }

  return current
}

/**
 * Extract all possible JSON Pointers from a JSON object at runtime
 *
 * Recursively traverses a JSON object and generates all possible JSON Pointer strings
 * that can be used to reference values within that object. This complements the
 * JsonPointers<T> utility type by providing runtime pointer extraction.
 *
 * @param obj - The JSON object to extract pointers from
 * @param prefix - Internal parameter for recursion (should not be used externally)
 * @returns Array of all JSON Pointer strings, sorted alphabetically
 *
 * @example
 * ```typescript
 * import { getAllJsonPointers } from '@itzcull/json-utils/json'
 *
 * // Basic object
 * const user = {
 *   id: 1,
 *   name: 'John Doe',
 *   profile: {
 *     email: 'john@example.com',
 *     settings: {
 *       theme: 'dark',
 *       notifications: true
 *     }
 *   },
 *   tags: ['admin', 'user']
 * }
 *
 * const pointers = getAllJsonPointers(user)
 * console.log(pointers)
 * // Output: [
 * //   "",
 * //   "/id",
 * //   "/name",
 * //   "/profile",
 * //   "/profile/email",
 * //   "/profile/settings",
 * //   "/profile/settings/notifications",
 * //   "/profile/settings/theme",
 * //   "/tags",
 * //   "/tags/0",
 * //   "/tags/1"
 * // ]
 *
 * // Configuration object
 * const config = {
 *   server: {
 *     host: 'localhost',
 *     port: 3000,
 *     ssl: {
 *       enabled: true,
 *       cert: '/path/to/cert'
 *     }
 *   },
 *   features: ['auth', 'logging']
 * }
 *
 * const configPointers = getAllJsonPointers(config)
 * // Includes: "", "/server", "/server/host", "/server/port",
 * //           "/server/ssl", "/server/ssl/enabled", "/server/ssl/cert",
 * //           "/features", "/features/0", "/features/1"
 *
 * // API response processing
 * const response = {
 *   data: { users: [{ id: 1, name: 'Alice' }] },
 *   meta: { total: 1, page: 1 }
 * }
 * const responsePointers = getAllJsonPointers(response)
 * // Use with getJsonValueAtPointer for dynamic access
 * responsePointers.forEach(pointer => {
 *   const value = getJsonValueAtPointer(response, pointer)
 *   console.log(`${pointer}: ${JSON.stringify(value)}`)
 * })
 *
 * // Form field mapping
 * function getFormFields(schema: any) {
 *   return getAllJsonPointers(schema)
 *     .filter(pointer => pointer !== '') // Exclude root
 *     .map(pointer => ({
 *       path: pointer,
 *       value: getJsonValueAtPointer(schema, pointer)
 *     }))
 * }
 * ```
 *
 * @category JSON
 */
export function getAllJsonPointers<T extends JSONType>(obj: T, prefix: string = ''): string[] {
  const pointers: string[] = [prefix || '']

  if (obj === null || obj === undefined) {
    return pointers
  }

  if (typeof obj === 'object') {
    if (Array.isArray(obj)) {
      obj.forEach((item, index) => {
        const currentPointer = `${prefix}/${index}`
        pointers.push(currentPointer)
        pointers.push(...getAllJsonPointers(item, currentPointer))
      })
    }
    else {
      Object.keys(obj).forEach((key) => {
        // Escape special characters according to RFC 6901
        const escapedKey = key.replace(/~/g, '~0').replace(/\//g, '~1')
        const currentPointer = `${prefix}/${escapedKey}`
        pointers.push(currentPointer)
        pointers.push(...getAllJsonPointers((obj as JSONObject)[key], currentPointer))
      })
    }
  }

  // Remove duplicates and return sorted
  const uniquePointers = Array.from(new Set(pointers))
  return uniquePointers.sort()
}

/**
 * Encodes the given segment to be used as part of a JSON Pointer
 *
 * JSON Pointer has special meaning for "/" and "~", therefore these must be encoded
 */
export function encodePointer(pointer: string): string {
  return pointer.replace(/~/g, '~0').replace(/\//g, '~1')
}
/**
 * Decodes a given JSON Pointer segment to its "normal" representation
 */
export function decodePointer(pointer: string): string {
  return pointer.replace(/~1/g, '/').replace(/~0/g, '~')
}
