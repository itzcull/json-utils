import type { JSONObject, JSONType } from './types'
import { getJsonPointerSegments } from './pointer'
import { isJsonArray, isJsonObject, isJsonPointer, isJsonValue } from './predicate'

/**
 * Set a value at a specific location in a JSON object using a JSON Pointer
 *
 * Safely sets a value in a nested JSON structure using RFC 6901 JSON Pointer syntax.
 * Creates intermediate objects and arrays as needed. Handles circular reference detection
 * to prevent infinite loops during traversal.
 *
 * @param obj - The root JSON object to modify
 * @param pointer - JSON Pointer string (e.g., "/user/name" or "/items/0/title")
 * @param value - The JSON value to set at the specified location
 * @throws {Error} When the value is not a valid JSON value
 * @throws {Error} When the object is not a valid JSON object
 * @throws {Error} When a circular reference is detected during traversal
 *
 * @example
 * ```typescript
 * import { setJsonValueAtPointer } from '@itzcull/utils/json'
 *
 * // Basic object property setting
 * const user = { name: 'John' }
 * setJsonValueAtPointer(user, '/age', 30)
 * // user is now { name: 'John', age: 30 }
 *
 * // Nested object creation
 * const data = {}
 * setJsonValueAtPointer(data, '/user/profile/name', 'Jane')
 * // data is now { user: { profile: { name: 'Jane' } } }
 *
 * // Array manipulation
 * const config = { items: [] }
 * setJsonValueAtPointer(config, '/items/0', 'first item')
 * setJsonValueAtPointer(config, '/items/1', 'second item')
 * // config is now { items: ['first item', 'second item'] }
 *
 * // Mixed object and array structures
 * const api = {}
 * setJsonValueAtPointer(api, '/endpoints/0/method', 'GET')
 * setJsonValueAtPointer(api, '/endpoints/0/path', '/users')
 * // api is now { endpoints: [{ method: 'GET', path: '/users' }] }
 *
 * // API response modification
 * const response = { data: { users: [] } }
 * setJsonValueAtPointer(response, '/data/users/0/id', 1)
 * setJsonValueAtPointer(response, '/data/users/0/name', 'Alice')
 * setJsonValueAtPointer(response, '/meta/total', 1)
 * // response is now {
 * //   data: { users: [{ id: 1, name: 'Alice' }] },
 * //   meta: { total: 1 }
 * // }
 *
 * // Configuration updates
 * const settings = { database: {} }
 * setJsonValueAtPointer(settings, '/database/host', 'localhost')
 * setJsonValueAtPointer(settings, '/database/port', 5432)
 * setJsonValueAtPointer(settings, '/features/0', 'auth')
 * setJsonValueAtPointer(settings, '/features/1', 'logging')
 * ```
 *
 * @category JSON
 */
export function setJsonValueAtPointer(obj: JSONObject, pointer: string, value: JSONType): void {
  if (!isJsonValue(value)) {
    throw new Error(`Invalid JSON value: ${JSON.stringify(value)}`)
  }

  if (!isJsonObject(obj)) {
    throw new Error(`Invalid JSON object: ${JSON.stringify(obj)}`)
  }

  const memoryReferenceRegister = new WeakSet()
  const path = getJsonPointerSegments(pointer)
  let nestedValue: JSONType = obj

  for (let i = 0; i < path.length; i++) {
    if (i === path.length - 1) {
      try {
        if (isJsonObject(nestedValue)) {
          (nestedValue as JSONObject)[path[i]] = value
        }
        else if (Array.isArray(nestedValue) && /^\d+$/.test(path[i])) {
          (nestedValue as any[])[Number.parseInt(path[i], 10)] = value
        }
      }
      catch {
        return
      }
    }

    const keyToParse = path[i]
    const key = Number.isInteger(Number.parseInt(keyToParse)) ? Number.parseInt(keyToParse) : keyToParse
    const nextKeyToParse = path[i + 1]
    const nextKey = Number.isInteger(Number.parseInt(nextKeyToParse)) ? Number.parseInt(nextKeyToParse) : nextKeyToParse

    if (typeof nestedValue === 'object' && nestedValue !== null) {
      if (memoryReferenceRegister.has(nestedValue)) {
        throw new Error('Circular reference detected')
      }
      else {
        memoryReferenceRegister.add(nestedValue)
      }

      if (isJsonObject(nestedValue) && (nestedValue as JSONObject)[key] === undefined) {
        if (Number.isInteger(nextKey)) {
          (nestedValue as JSONObject)[key] = []
        }
        else {
          (nestedValue as JSONObject)[key] = {}
        }
        nestedValue = (nestedValue as JSONObject)[key]
      }
      else if (isJsonObject(nestedValue)) {
        nestedValue = (nestedValue as JSONObject)[key]
      }
      else if (Array.isArray(nestedValue) && typeof key === 'number') {
        if ((nestedValue as any[])[key] === undefined) {
          if (Number.isInteger(nextKey)) {
            (nestedValue as any[])[key] = []
          }
          else {
            (nestedValue as any[])[key] = {}
          }
        }
        nestedValue = (nestedValue as any[])[key]
      }
      else {
        return
      }
    }
  }
}

/**
 * Remove a value at a specific location in a JSON object using a JSON Pointer
 *
 * Safely removes a value from a nested JSON structure using RFC 6901 JSON Pointer syntax.
 * For arrays, removes the element and shifts remaining elements. For objects, deletes the property.
 * Cannot remove the root node (empty pointer).
 *
 * @param json - The root JSON object to modify
 * @param pointer - JSON Pointer string (e.g., "/user/name" or "/items/0")
 * @throws {Error} When the pointer is not a valid JSON Pointer
 * @throws {Error} When the object is not a valid JSON object
 * @throws {Error} When attempting to delete the root node (empty pointer)
 *
 * @example
 * ```typescript
 * import { removeJsonValueAtPointer } from '@itzcull/utils/json'
 *
 * // Remove object property
 * const user = { name: 'John', age: 30, email: 'john@example.com' }
 * removeJsonValueAtPointer(user, '/email')
 * // user is now { name: 'John', age: 30 }
 *
 * // Remove array element
 * const items = { list: ['apple', 'banana', 'cherry'] }
 * removeJsonValueAtPointer(items, '/list/1') // removes 'banana'
 * // items is now { list: ['apple', 'cherry'] }
 *
 * // Remove nested property
 * const config = {
 *   database: { host: 'localhost', port: 5432, ssl: true },
 *   cache: { enabled: true }
 * }
 * removeJsonValueAtPointer(config, '/database/ssl')
 * // config is now {
 * //   database: { host: 'localhost', port: 5432 },
 * //   cache: { enabled: true }
 * // }
 *
 * // API response cleanup
 * const response = {
 *   data: {
 *     users: [
 *       { id: 1, name: 'Alice', temp: 'remove-me' },
 *       { id: 2, name: 'Bob' }
 *     ]
 *   },
 *   debug: { trace: 'sensitive-info' }
 * }
 * removeJsonValueAtPointer(response, '/data/users/0/temp')
 * removeJsonValueAtPointer(response, '/debug')
 * // response is now {
 * //   data: {
 * //     users: [
 * //       { id: 1, name: 'Alice' },
 * //       { id: 2, name: 'Bob' }
 * //     ]
 * //   }
 * // }
 *
 * // Form data processing
 * const formData = {
 *   personal: { name: 'John', ssn: '123-45-6789' },
 *   preferences: { newsletter: true, ads: false }
 * }
 * // Remove sensitive data before sending to client
 * removeJsonValueAtPointer(formData, '/personal/ssn')
 *
 * // Configuration cleanup
 * const settings = {
 *   features: ['auth', 'deprecated-feature', 'logging'],
 *   temp: { buildId: 'abc123' }
 * }
 * removeJsonValueAtPointer(settings, '/features/1') // remove deprecated feature
 * removeJsonValueAtPointer(settings, '/temp') // remove temporary data
 * ```
 *
 * @category JSON
 */
export function removeJsonValueAtPointer(json: JSONObject, pointer: string): void {
  if (!isJsonPointer(pointer)) {
    throw new Error(`Invalid JSON Pointer: ${pointer}`)
  }

  if (!isJsonObject(json)) {
    throw new Error(`Invalid JSON object: ${JSON.stringify(json)}`)
  }

  if (pointer === '') {
    throw new Error('Cannot delete root node')
  }

  const path = getJsonPointerSegments(pointer)
  let nestedValue: JSONType = json

  for (let i = 0; i < path.length; i++) {
    const key = path[i]

    if (nestedValue !== undefined && i === path.length - 1) {
      const arrayIdx = Number.parseInt(key, 10)

      if (isJsonArray(nestedValue) && Number.isSafeInteger(arrayIdx)) {
        (nestedValue as any[]).splice(arrayIdx, 1)
        return
      }
      else if (isJsonObject(nestedValue)) {
        delete (nestedValue as JSONObject)[key]
      }
    }

    if (nestedValue !== undefined) {
      const arrayIdx = Number.parseInt(key, 10)

      if (isJsonArray(nestedValue) && Number.isSafeInteger(arrayIdx)) {
        nestedValue = (nestedValue as any[])[arrayIdx]
      }
      else if (isJsonObject(nestedValue)) {
        nestedValue = (nestedValue as JSONObject)[key]
      }
      else {
        return
      }
    }
    else {
      return
    }
  }
}
