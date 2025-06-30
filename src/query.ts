import type { JSONObject, JSONType } from './types'
import { setJsonValueAtPointer } from './mutator'
import { getAllJsonPointers, getJsonValueAtPointer } from './pointer'

/**
 * Result of a JSON pattern query
 */
export interface QueryMatch {
  /** The JSON Pointer path where the match was found */
  path: string
  /** The value at the matched path */
  value: JSONType
}

/**
 * Select multiple values from a JSON object using an array of JSON Pointers
 *
 * Efficiently retrieves multiple values from a JSON structure using their JSON Pointer paths.
 * Returns values in the same order as the provided paths. Non-existent paths return undefined.
 *
 * @param json - The JSON object to query
 * @param paths - Array of JSON Pointer paths to retrieve
 * @returns Array of values in the same order as paths
 *
 * @example
 * ```typescript
 * import { selectJsonValues } from '@itzcull/json-utils'
 *
 * // Basic value selection
 * const user = {
 *   id: 1,
 *   name: 'John',
 *   profile: {
 *     email: 'john@example.com',
 *     age: 30
 *   }
 * }
 * const values = selectJsonValues(user, ['/id', '/name', '/profile/email'])
 * // [1, 'John', 'john@example.com']
 *
 * // Array element selection
 * const data = {
 *   items: ['apple', 'banana', 'cherry'],
 *   users: [
 *     { id: 1, name: 'Alice' },
 *     { id: 2, name: 'Bob' }
 *   ]
 * }
 * const selected = selectJsonValues(data, [
 *   '/items/0',
 *   '/items/2',
 *   '/users/0/name',
 *   '/users/1/id'
 * ])
 * // ['apple', 'cherry', 'Alice', 2]
 *
 * // Form field extraction
 * const formData = {
 *   personal: { name: 'Jane', email: 'jane@example.com' },
 *   preferences: { newsletter: true, theme: 'dark' }
 * }
 * const publicFields = selectJsonValues(formData, [
 *   '/personal/name',
 *   '/preferences/theme'
 * ])
 * // ['Jane', 'dark']
 *
 * // API response processing
 * const apiResponse = {
 *   data: { users: [{ id: 1, profile: { name: 'Alice' } }] },
 *   meta: { total: 1, page: 1 }
 * }
 * const summary = selectJsonValues(apiResponse, [
 *   '/data/users/0/profile/name',
 *   '/meta/total'
 * ])
 * // ['Alice', 1]
 *
 * // Batch configuration reading
 * const config = {
 *   database: { host: 'localhost', port: 5432 },
 *   redis: { host: 'localhost', port: 6379 },
 *   app: { name: 'MyApp', version: '1.0.0' }
 * }
 * const [dbHost, redisHost, appName] = selectJsonValues(config, [
 *   '/database/host',
 *   '/redis/host',
 *   '/app/name'
 * ])
 * ```
 *
 * @category JSON
 */
export function selectJsonValues<T extends JSONObject>(json: T, paths: string[]): (JSONType | undefined)[] {
  return paths.map(path => getJsonValueAtPointer(json, path))
}

/**
 * Query JSON using wildcard patterns in JSON Pointer paths
 *
 * Supports wildcard patterns to match multiple paths in a JSON structure:
 * - `*` matches any single path segment (property name or array index)
 * - `**` matches any sequence of path segments (recursive descent)
 *
 * @param json - The JSON object to query
 * @param pattern - JSON Pointer pattern with wildcards
 * @returns Array of matches with their paths and values
 *
 * @example
 * ```typescript
 * import { queryJsonByPattern } from '@itzcull/json-utils'
 *
 * // Single wildcard matching
 * const users = {
 *   user1: { name: 'Alice', role: 'admin' },
 *   user2: { name: 'Bob', role: 'user' },
 *   admin: { name: 'Charlie', role: 'super' }
 * }
 * const userNames = queryJsonByPattern(users, '/user' + '*' + '/name')
 * // [
 * //   { path: '/user1/name', value: 'Alice' },
 * //   { path: '/user2/name', value: 'Bob' }
 * // ]
 *
 * // Array wildcard matching
 * const data = {
 *   items: [
 *     { id: 1, name: 'Item 1', category: 'A' },
 *     { id: 2, name: 'Item 2', category: 'B' },
 *     { id: 3, name: 'Item 3', category: 'A' }
 *   ]
 * }
 * const itemIds = queryJsonByPattern(data, '/items/' + '*' + '/id')
 * // [
 * //   { path: '/items/0/id', value: 1 },
 * //   { path: '/items/1/id', value: 2 },
 * //   { path: '/items/2/id', value: 3 }
 * // ]
 *
 * // Recursive wildcard matching
 * const config = {
 *   services: {
 *     api: { database: { host: 'api-db' } },
 *     worker: { database: { host: 'worker-db' } }
 *   },
 *   cache: { database: { host: 'cache-db' } }
 * }
 * const allDbHosts = queryJsonByPattern(config, '/' + '**' + '/database/host')
 * // [
 * //   { path: '/services/api/database/host', value: 'api-db' },
 * //   { path: '/services/worker/database/host', value: 'worker-db' },
 * //   { path: '/cache/database/host', value: 'cache-db' }
 * // ]
 *
 * // Complex patterns
 * const organization = {
 *   departments: [
 *     {
 *       name: 'Engineering',
 *       teams: [
 *         { name: 'Frontend', members: [{ name: 'Alice' }, { name: 'Bob' }] },
 *         { name: 'Backend', members: [{ name: 'Charlie' }] }
 *       ]
 *     }
 *   ]
 * }
 * const memberNames = queryJsonByPattern(organization, '/departments/' + '*' + '/teams/' + '*' + '/members/' + '*' + '/name')
 * // [
 * //   { path: '/departments/0/teams/0/members/0/name', value: 'Alice' },
 * //   { path: '/departments/0/teams/0/members/1/name', value: 'Bob' },
 * //   { path: '/departments/0/teams/1/members/0/name', value: 'Charlie' }
 * // ]
 *
 * // Form field discovery
 * const form = {
 *   sections: {
 *     personal: { fields: { name: '', email: '' } },
 *     address: { fields: { street: '', city: '', zip: '' } }
 *   }
 * }
 * const fieldPaths = queryJsonByPattern(form, '/sections/' + '*' + '/fields/' + '*')
 * // Returns all form field paths and their current values
 * ```
 *
 * @category JSON
 */
export function queryJsonByPattern<T extends JSONObject>(json: T, pattern: string): QueryMatch[] {
  const matches: QueryMatch[] = []

  // Convert pattern to regex
  const createPatternMatcher = (pattern: string): RegExp => {
    // Escape special regex characters except * and **
    const regexPattern = pattern
      .replace(/[.+?^${}()|[\]\\]/g, '\\$&') // Escape regex special chars
      .replace(/\*\*/g, '___DOUBLE_WILDCARD___') // Temporarily replace **
      .replace(/\*/g, '[^/]*') // Single * matches any segment
      .replace(/___DOUBLE_WILDCARD___/g, '.*') // ** matches any path

    return new RegExp(`^${regexPattern}$`)
  }

  const matcher = createPatternMatcher(pattern)
  const allPaths = getAllJsonPointers(json)

  for (const path of allPaths) {
    // Skip the root path
    if (path === '')
      continue

    if (matcher.test(path)) {
      const value = getJsonValueAtPointer(json, path)
      if (value !== undefined) {
        matches.push({ path, value })
      }
    }
  }

  return matches.sort((a, b) => a.path.localeCompare(b.path))
}

/**
 * Extract a subset of a JSON object based on specified paths
 *
 * Creates a new JSON object containing only the values at the specified JSON Pointer paths,
 * preserving the original nested structure. Similar to filterJsonByPaths but optimized
 * for extracting coherent subsets.
 *
 * @param json - The JSON object to extract from
 * @param paths - Array of JSON Pointer paths to include in the subset
 * @returns A new JSON object containing only the specified paths
 *
 * @example
 * ```typescript
 * import { extractJsonSubset } from '@itzcull/json-utils'
 *
 * // User data filtering
 * const user = {
 *   id: 1,
 *   name: 'John Doe',
 *   email: 'john@example.com',
 *   password: 'secret',
 *   profile: {
 *     age: 30,
 *     phone: '+1234567890',
 *     ssn: '123-45-6789',
 *     preferences: {
 *       theme: 'dark',
 *       language: 'en'
 *     }
 *   }
 * }
 * const publicData = extractJsonSubset(user, [
 *   '/id',
 *   '/name',
 *   '/email',
 *   '/profile/age',
 *   '/profile/preferences'
 * ])
 * // {
 * //   id: 1,
 * //   name: 'John Doe',
 * //   email: 'john@example.com',
 * //   profile: {
 * //     age: 30,
 * //     preferences: { theme: 'dark', language: 'en' }
 * //   }
 * // }
 *
 * // API response filtering
 * const apiResponse = {
 *   data: {
 *     users: [
 *       { id: 1, name: 'Alice', internal_id: 'abc', role: 'admin' },
 *       { id: 2, name: 'Bob', internal_id: 'def', role: 'user' }
 *     ]
 *   },
 *   meta: {
 *     total: 2,
 *     page: 1,
 *     debug: { query_time: '50ms' }
 *   }
 * }
 * const cleanResponse = extractJsonSubset(apiResponse, [
 *   '/data/users/0/id',
 *   '/data/users/0/name',
 *   '/data/users/0/role',
 *   '/data/users/1/id',
 *   '/data/users/1/name',
 *   '/data/users/1/role',
 *   '/meta/total',
 *   '/meta/page'
 * ])
 * // {
 * //   data: {
 * //     users: [
 * //       { id: 1, name: 'Alice', role: 'admin' },
 * //       { id: 2, name: 'Bob', role: 'user' }
 * //     ]
 * //   },
 * //   meta: { total: 2, page: 1 }
 * // }
 *
 * // Configuration subsetting
 * const fullConfig = {
 *   database: {
 *     host: 'localhost',
 *     port: 5432,
 *     password: 'secret',
 *     pool: { min: 1, max: 10 }
 *   },
 *   redis: {
 *     host: 'localhost',
 *     port: 6379,
 *     password: 'secret'
 *   },
 *   app: {
 *     name: 'MyApp',
 *     version: '1.0.0',
 *     debug: true
 *   }
 * }
 * const productionConfig = extractJsonSubset(fullConfig, [
 *   '/database/host',
 *   '/database/port',
 *   '/database/pool',
 *   '/redis/host',
 *   '/redis/port',
 *   '/app/name',
 *   '/app/version'
 * ])
 * // Excludes passwords and debug flags
 *
 * // Schema-based extraction
 * const schema = {
 *   required: ['/name', '/email'],
 *   optional: ['/age', '/preferences/theme']
 * }
 * const userData = { name: 'Jane', email: 'jane@example.com', age: 25, password: 'secret' }
 * const validatedData = extractJsonSubset(userData, [...schema.required, ...schema.optional])
 * ```
 *
 * @category JSON
 */
export function extractJsonSubset<T extends JSONObject>(json: T, paths: string[]): JSONObject {
  const result: JSONObject = {}

  for (const path of paths) {
    const value = getJsonValueAtPointer(json, path)
    if (value !== undefined) {
      setJsonValueAtPointer(result, path, value)
    }
  }

  return result
}
