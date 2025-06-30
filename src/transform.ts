import type { JSONObject, JSONType } from './types'
import { setJsonValueAtPointer } from './mutator'
import { encodePointer, getAllJsonPointers, getJsonValueAtPointer } from './pointer'
import { isJsonArray, isJsonObject, isJsonPointer } from './predicate'

/**
 * Options for deep merging JSON objects
 */
export interface DeepMergeOptions {
  /**
   * Strategy for merging arrays
   * - 'replace': Replace the entire array (default)
   * - 'concat': Concatenate arrays
   */
  arrayMergeStrategy?: 'replace' | 'concat'
}

/**
 * Deep merge multiple JSON objects
 *
 * Recursively merges multiple JSON objects from left to right. Later objects
 * override properties in earlier objects. Arrays are replaced by default
 * unless a custom merge strategy is specified.
 *
 * @param args - JSON objects to merge and optional configuration
 * @returns A new deeply merged JSON object
 * @throws {Error} When any argument is not a valid JSON object
 *
 * @example
 * ```typescript
 * import { deepMergeJson } from '@itzcull/json-utils'
 *
 * // Basic merge
 * const config1 = { api: { url: 'http://localhost' }, debug: true }
 * const config2 = { api: { url: 'https://api.example.com' }, timeout: 5000 }
 * const merged = deepMergeJson(config1, config2)
 * // { api: { url: 'https://api.example.com' }, debug: true, timeout: 5000 }
 *
 * // Deep nested merge
 * const base = {
 *   user: { name: 'John', settings: { theme: 'light', lang: 'en' } },
 *   features: ['auth']
 * }
 * const override = {
 *   user: { settings: { theme: 'dark' } },
 *   features: ['auth', 'api']
 * }
 * const result = deepMergeJson(base, override)
 * // {
 * //   user: { name: 'John', settings: { theme: 'dark', lang: 'en' } },
 * //   features: ['auth', 'api']
 * // }
 *
 * // Array concatenation
 * const obj1 = { tags: ['javascript'] }
 * const obj2 = { tags: ['typescript'] }
 * const concatenated = deepMergeJson(obj1, obj2, { arrayMergeStrategy: 'concat' })
 * // { tags: ['javascript', 'typescript'] }
 *
 * // Multiple object merge
 * const defaults = { port: 3000, host: 'localhost' }
 * const envConfig = { port: 8080 }
 * const userConfig = { ssl: true }
 * const final = deepMergeJson(defaults, envConfig, userConfig)
 * // { port: 8080, host: 'localhost', ssl: true }
 * ```
 *
 * @category JSON
 */
export function deepMergeJson<T extends JSONObject = JSONObject>(...args: any[]): T {
  // Extract options if last argument is options object
  let options: DeepMergeOptions = {}
  let objects: JSONObject[] = []

  // Check if last argument is options
  const lastArg = args[args.length - 1]
  if (args.length > 1 && lastArg && typeof lastArg === 'object'
    && 'arrayMergeStrategy' in lastArg
    && (lastArg.arrayMergeStrategy === 'replace' || lastArg.arrayMergeStrategy === 'concat')) {
    options = lastArg as DeepMergeOptions
    objects = args.slice(0, -1) as JSONObject[]
  }
  else {
    objects = args as JSONObject[]
  }

  if (objects.length === 0) {
    throw new Error('At least one object must be provided')
  }

  // Validate all arguments are objects
  for (let i = 0; i < objects.length; i++) {
    if (!isJsonObject(objects[i])) {
      throw new Error(`Argument at index ${i} is not a valid JSON object`)
    }
  }

  const merge = (target: JSONObject, source: JSONObject): JSONObject => {
    const result: JSONObject = { ...target }

    for (const key in source) {
      const sourceValue = source[key]
      const targetValue = result[key]

      if (isJsonObject(sourceValue) && isJsonObject(targetValue)) {
        result[key] = merge(targetValue, sourceValue)
      }
      else if (isJsonArray(sourceValue) && isJsonArray(targetValue) && options.arrayMergeStrategy === 'concat') {
        result[key] = [...targetValue, ...sourceValue]
      }
      else {
        result[key] = sourceValue
      }
    }

    return result
  }

  return objects.reduce((acc, obj) => merge(acc, obj), {}) as T
}

/**
 * Flatten a nested JSON object into a flat key-value structure
 *
 * Converts a nested JSON structure into a flat object where keys are JSON Pointers
 * representing the path to each value. This is useful for serialization, comparison,
 * or creating indices of nested data.
 *
 * @param json - The JSON object to flatten
 * @returns An object with JSON Pointer keys and their corresponding values
 *
 * @example
 * ```typescript
 * import { flattenJson } from '@itzcull/json-utils'
 *
 * // Simple object flattening
 * const user = {
 *   name: 'John',
 *   age: 30,
 *   email: 'john@example.com'
 * }
 * const flat = flattenJson(user)
 * // {
 * //   '/name': 'John',
 * //   '/age': 30,
 * //   '/email': 'john@example.com'
 * // }
 *
 * // Nested object flattening
 * const config = {
 *   database: {
 *     host: 'localhost',
 *     port: 5432,
 *     credentials: {
 *       user: 'admin',
 *       password: 'secret'
 *     }
 *   },
 *   features: ['auth', 'api']
 * }
 * const flatConfig = flattenJson(config)
 * // {
 * //   '/database': { ... },
 * //   '/database/host': 'localhost',
 * //   '/database/port': 5432,
 * //   '/database/credentials': { ... },
 * //   '/database/credentials/user': 'admin',
 * //   '/database/credentials/password': 'secret',
 * //   '/features': ['auth', 'api'],
 * //   '/features/0': 'auth',
 * //   '/features/1': 'api'
 * // }
 *
 * // Form data serialization
 * const formData = {
 *   user: {
 *     profile: {
 *       firstName: 'Jane',
 *       lastName: 'Doe'
 *     },
 *     preferences: {
 *       newsletter: true
 *     }
 *   }
 * }
 * const serialized = flattenJson(formData)
 * // Can be used for form field names or query parameters
 * ```
 *
 * @category JSON
 */
export function flattenJson<T extends JSONType>(json: T): Record<string, JSONType> {
  const result: Record<string, JSONType> = {}

  // Skip root pointer for flattening
  const pointers = getAllJsonPointers(json).filter(p => p !== '')

  for (const pointer of pointers) {
    const value = getJsonValueAtPointer(json, pointer)
    if (value !== undefined) {
      result[pointer] = value
    }
  }

  return result
}

/**
 * Reconstruct a nested JSON object from a flattened structure
 *
 * Converts a flat object with JSON Pointer keys back into a nested JSON structure.
 * This is the inverse operation of flattenJson.
 *
 * @param flat - An object with JSON Pointer keys
 * @returns The reconstructed nested JSON object
 * @throws {Error} When keys are not valid JSON Pointers
 *
 * @example
 * ```typescript
 * import { unflattenJson } from '@itzcull/json-utils'
 *
 * // Simple unflattening
 * const flat = {
 *   '/name': 'John',
 *   '/age': 30,
 *   '/email': 'john@example.com'
 * }
 * const user = unflattenJson(flat)
 * // { name: 'John', age: 30, email: 'john@example.com' }
 *
 * // Nested structure reconstruction
 * const flatConfig = {
 *   '/database/host': 'localhost',
 *   '/database/port': 5432,
 *   '/features/0': 'auth',
 *   '/features/1': 'api'
 * }
 * const config = unflattenJson(flatConfig)
 * // {
 * //   database: { host: 'localhost', port: 5432 },
 * //   features: ['auth', 'api']
 * // }
 *
 * // Escaped characters handling
 * const flatWithEscapes = {
 *   '/path~1to~1file': '/home/user/doc.txt',
 *   '/config~0key': 'value'
 * }
 * const unescaped = unflattenJson(flatWithEscapes)
 * // {
 * //   'path/to/file': '/home/user/doc.txt',
 * //   'config~key': 'value'
 * // }
 *
 * // Form data deserialization
 * const formFields = {
 *   '/user/profile/firstName': 'Jane',
 *   '/user/profile/lastName': 'Doe',
 *   '/user/preferences/newsletter': true
 * }
 * const formData = unflattenJson(formFields)
 * // {
 * //   user: {
 * //     profile: { firstName: 'Jane', lastName: 'Doe' },
 * //     preferences: { newsletter: true }
 * //   }
 * // }
 * ```
 *
 * @category JSON
 */
export function unflattenJson<T extends JSONObject = JSONObject>(flat: Record<string, JSONType>): T {
  const result: JSONObject = {}

  // Sort keys to ensure parent objects are created before children
  const sortedKeys = Object.keys(flat).sort()

  for (const pointer of sortedKeys) {
    if (!isJsonPointer(pointer)) {
      throw new Error(`Invalid JSON Pointer: ${pointer}`)
    }

    const value = flat[pointer]

    if (pointer === '' || pointer === '/') {
      // Root object case - merge with result
      if (isJsonObject(value)) {
        Object.assign(result, value)
      }
    }
    else {
      setJsonValueAtPointer(result, pointer, value)
    }
  }

  return result as T
}

/**
 * Transform all values in a JSON structure
 *
 * Recursively applies a transformation function to all values in a JSON structure.
 * The mapper function receives both the value and its JSON Pointer path.
 *
 * @param json - The JSON value to transform
 * @param mapper - Function to transform each value
 * @returns A new JSON structure with transformed values
 *
 * @example
 * ```typescript
 * import { mapJsonValues } from '@itzcull/json-utils'
 *
 * // Simple value transformation
 * const prices = { item1: 10, item2: 20, nested: { item3: 30 } }
 * const discounted = mapJsonValues(prices, value =>
 *   typeof value === 'number' ? value * 0.9 : value
 * )
 * // { item1: 9, item2: 18, nested: { item3: 27 } }
 *
 * // String transformation
 * const data = {
 *   user: { name: 'john doe', email: 'JOHN@EXAMPLE.COM' },
 *   tags: ['javascript', 'typescript']
 * }
 * const normalized = mapJsonValues(data, value =>
 *   typeof value === 'string' ? value.toLowerCase() : value
 * )
 * // {
 * //   user: { name: 'john doe', email: 'john@example.com' },
 * //   tags: ['javascript', 'typescript']
 * // }
 *
 * // Path-aware transformation
 * const config = {
 *   public: { apiUrl: 'http://api.example.com' },
 *   private: { apiKey: 'secret-key' }
 * }
 * const masked = mapJsonValues(config, (value, path) => {
 *   if (path.includes('/private/') && typeof value === 'string') {
 *     return '***MASKED***'
 *   }
 *   return value
 * })
 * // {
 * //   public: { apiUrl: 'http://api.example.com' },
 * //   private: { apiKey: '***MASKED***' }
 * // }
 *
 * // Date string conversion
 * const record = {
 *   id: 1,
 *   created: '2023-01-01',
 *   updated: '2023-12-31'
 * }
 * const withDates = mapJsonValues(record, (value, path) => {
 *   if ((path === '/created' || path === '/updated') && typeof value === 'string') {
 *     return new Date(value).toISOString()
 *   }
 *   return value
 * })
 * ```
 *
 * @category JSON
 */
export function mapJsonValues<T extends JSONType, R extends JSONType = T>(
  json: T,
  mapper: (value: JSONType, path: string) => JSONType,
): R {
  const transform = (value: JSONType, path: string): JSONType => {
    if (isJsonArray(value)) {
      return value.map((item, index) => transform(item, `${path}/${index}`))
    }
    else if (isJsonObject(value)) {
      const result: JSONObject = {}
      for (const key in value) {
        result[key] = transform(value[key], `${path}/${encodePointer(key)}`)
      }
      return result
    }
    return mapper(value, path)
  }

  return transform(json, '') as R
}

/**
 * Filter a JSON object to only include specified paths
 *
 * Creates a new JSON object containing only the values at the specified JSON Pointer paths.
 * Preserves the nested structure of the original object.
 *
 * @param json - The JSON object to filter
 * @param paths - Array of JSON Pointer paths to include
 * @returns A new JSON object containing only the specified paths
 *
 * @example
 * ```typescript
 * import { filterJsonByPaths } from '@itzcull/json-utils'
 *
 * // Basic filtering
 * const user = {
 *   id: 1,
 *   name: 'John',
 *   email: 'john@example.com',
 *   password: 'secret'
 * }
 * const publicData = filterJsonByPaths(user, ['/id', '/name', '/email'])
 * // { id: 1, name: 'John', email: 'john@example.com' }
 *
 * // Nested path filtering
 * const data = {
 *   user: {
 *     profile: {
 *       name: 'Jane',
 *       age: 30,
 *       ssn: '123-45-6789'
 *     },
 *     settings: {
 *       theme: 'dark',
 *       notifications: true
 *     }
 *   },
 *   internal: { debug: true }
 * }
 * const filtered = filterJsonByPaths(data, [
 *   '/user/profile/name',
 *   '/user/profile/age',
 *   '/user/settings'
 * ])
 * // {
 * //   user: {
 * //     profile: { name: 'Jane', age: 30 },
 * //     settings: { theme: 'dark', notifications: true }
 * //   }
 * // }
 *
 * // API response filtering
 * const response = {
 *   data: {
 *     users: [
 *       { id: 1, name: 'Alice', internal_id: 'abc' },
 *       { id: 2, name: 'Bob', internal_id: 'def' }
 *     ]
 *   },
 *   meta: { total: 2, debug: { query: 'SELECT *' } }
 * }
 * const cleaned = filterJsonByPaths(response, [
 *   '/data/users/0/id',
 *   '/data/users/0/name',
 *   '/data/users/1/id',
 *   '/data/users/1/name',
 *   '/meta/total'
 * ])
 * // {
 * //   data: {
 * //     users: [
 * //       { id: 1, name: 'Alice' },
 * //       { id: 2, name: 'Bob' }
 * //     ]
 * //   },
 * //   meta: { total: 2 }
 * // }
 * ```
 *
 * @category JSON
 */
export function filterJsonByPaths<T extends JSONObject>(json: T, paths: string[]): JSONObject {
  const result: JSONObject = {}

  // Group paths by their common ancestors to optimize reconstruction

  for (const path of paths) {
    const value = getJsonValueAtPointer(json, path)
    if (value !== undefined) {
      setJsonValueAtPointer(result, path, value)
    }
  }

  return result
}
