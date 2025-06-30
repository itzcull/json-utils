import type { JSONObject, JSONType } from './types'
import { removeJsonValueAtPointer, setJsonValueAtPointer } from './mutator'
import { getJsonPointerSegments, getJsonValueAtPointer } from './pointer'
import { isJsonArray, isJsonObject } from './predicate'

/**
 * JSON Patch operation as defined in RFC 6902
 * @see https://datatracker.ietf.org/doc/html/rfc6902
 */
export interface JsonPatchOperation {
  /** The operation to perform */
  op: 'add' | 'remove' | 'replace' | 'move' | 'copy' | 'test'
  /** JSON Pointer to the location */
  path: string
  /** The value for add, replace, or test operations */
  value?: JSONType
  /** Source path for move or copy operations */
  from?: string
}

/**
 * Deep equality comparison for JSON values
 *
 * Performs a deep comparison of two JSON values, checking for structural and value equality.
 * Arrays must have the same elements in the same order. Objects must have the same properties
 * with equal values (property order doesn't matter).
 *
 * @param a - First JSON value to compare
 * @param b - Second JSON value to compare
 * @returns True if values are deeply equal, false otherwise
 *
 * @example
 * ```typescript
 * import { deepEquals } from '@itzcull/json-utils'
 *
 * // Primitive comparisons
 * deepEquals(42, 42) // true
 * deepEquals('hello', 'hello') // true
 * deepEquals(null, null) // true
 * deepEquals(true, false) // false
 *
 * // Object comparisons
 * deepEquals({ a: 1, b: 2 }, { b: 2, a: 1 }) // true (order doesn't matter)
 * deepEquals({ a: 1 }, { a: 1, b: 2 }) // false (different properties)
 *
 * // Array comparisons
 * deepEquals([1, 2, 3], [1, 2, 3]) // true
 * deepEquals([1, 2, 3], [1, 3, 2]) // false (order matters)
 *
 * // Nested structures
 * const user1 = {
 *   name: 'John',
 *   profile: { age: 30, tags: ['admin', 'user'] }
 * }
 * const user2 = {
 *   name: 'John',
 *   profile: { age: 30, tags: ['admin', 'user'] }
 * }
 * deepEquals(user1, user2) // true
 *
 * // Configuration comparison
 * const config1 = { db: { host: 'localhost', port: 5432 } }
 * const config2 = { db: { host: 'localhost', port: 5432 } }
 * const hasChanged = !deepEquals(config1, config2)
 *
 * // API response validation
 * function validateResponse(actual: any, expected: any) {
 *   if (!deepEquals(actual, expected)) {
 *     throw new Error('Response does not match expected format')
 *   }
 * }
 * ```
 *
 * @category JSON
 */
export function deepEquals(a: JSONType, b: JSONType): boolean {
  // Handle primitives and null
  if (a === b)
    return true
  if (a === null || b === null)
    return a === b
  if (typeof a !== typeof b)
    return false

  // Handle arrays
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length)
      return false
    return a.every((item, index) => deepEquals(item, b[index]))
  }

  // Handle objects
  if (isJsonObject(a) && isJsonObject(b)) {
    const keysA = Object.keys(a)
    const keysB = Object.keys(b)

    if (keysA.length !== keysB.length)
      return false

    return keysA.every((key) => {
      if (!(key in b))
        return false
      return deepEquals(a[key], b[key])
    })
  }

  return false
}

/**
 * Get the differences between two JSON objects as JSON Patch operations
 *
 * Compares two JSON objects and returns an array of JSON Patch operations (RFC 6902)
 * that describe how to transform the source object into the target object.
 *
 * @param source - The source JSON object
 * @param target - The target JSON object
 * @returns Array of JSON Patch operations
 *
 * @example
 * ```typescript
 * import { getJsonDiff } from '@itzcull/json-utils'
 *
 * // Simple property changes
 * const original = { name: 'John', age: 30 }
 * const updated = { name: 'John', age: 31 }
 * const diff = getJsonDiff(original, updated)
 * // [{ op: 'replace', path: '/age', value: 31 }]
 *
 * // Adding and removing properties
 * const v1 = { a: 1, b: 2 }
 * const v2 = { a: 1, c: 3 }
 * const changes = getJsonDiff(v1, v2)
 * // [
 * //   { op: 'remove', path: '/b' },
 * //   { op: 'add', path: '/c', value: 3 }
 * // ]
 *
 * // Nested object changes
 * const configV1 = {
 *   database: { host: 'localhost', port: 5432 },
 *   cache: { enabled: true }
 * }
 * const configV2 = {
 *   database: { host: 'prod.example.com', port: 5432 },
 *   cache: { enabled: false, ttl: 3600 }
 * }
 * const configDiff = getJsonDiff(configV1, configV2)
 * // [
 * //   { op: 'replace', path: '/database/host', value: 'prod.example.com' },
 * //   { op: 'replace', path: '/cache/enabled', value: false },
 * //   { op: 'add', path: '/cache/ttl', value: 3600 }
 * // ]
 *
 * // Array modifications
 * const list1 = { items: ['a', 'b', 'c'] }
 * const list2 = { items: ['a', 'x', 'c'] }
 * const listDiff = getJsonDiff(list1, list2)
 * // [{ op: 'replace', path: '/items/1', value: 'x' }]
 *
 * // Audit trail generation
 * function auditChanges(before: any, after: any) {
 *   const changes = getJsonDiff(before, after)
 *   return {
 *     timestamp: new Date().toISOString(),
 *     changes: changes
 *   }
 * }
 * ```
 *
 * @category JSON
 */
export function getJsonDiff<T extends JSONObject>(source: T, target: T): JsonPatchOperation[] {
  const operations: JsonPatchOperation[] = []

  // Helper to add operations
  const addOperation = (op: JsonPatchOperation): void => {
    operations.push(op)
  }

  // Recursive diff function
  const diff = (sourcePath: string, sourceValue: JSONType, targetValue: JSONType): void => {
    // If values are equal, no operation needed
    if (deepEquals(sourceValue, targetValue)) {
      return
    }

    // If types are different or one is primitive, replace
    if (
      typeof sourceValue !== typeof targetValue
      || sourceValue === null || targetValue === null
      || (!isJsonObject(sourceValue) && !isJsonArray(sourceValue))
      || (!isJsonObject(targetValue) && !isJsonArray(targetValue))
    ) {
      addOperation({ op: 'replace', path: sourcePath, value: targetValue })
      return
    }

    // Handle arrays
    if (isJsonArray(sourceValue) && isJsonArray(targetValue)) {
      // If lengths are very different, just replace the whole array
      if (Math.abs(sourceValue.length - targetValue.length) > sourceValue.length / 2) {
        addOperation({ op: 'replace', path: sourcePath, value: targetValue })
        return
      }

      // Compare elements
      const minLength = Math.min(sourceValue.length, targetValue.length)

      // Check existing elements
      for (let i = 0; i < minLength; i++) {
        diff(`${sourcePath}/${i}`, sourceValue[i], targetValue[i])
      }

      // Handle additions
      for (let i = minLength; i < targetValue.length; i++) {
        addOperation({ op: 'add', path: `${sourcePath}/${i}`, value: targetValue[i] })
      }

      // Handle removals (in reverse order)
      for (let i = sourceValue.length - 1; i >= targetValue.length; i--) {
        addOperation({ op: 'remove', path: `${sourcePath}/${i}` })
      }

      return
    }

    // Handle objects
    if (isJsonObject(sourceValue) && isJsonObject(targetValue)) {
      const sourceKeys = Object.keys(sourceValue)
      const targetKeys = Object.keys(targetValue)
      const allKeys = new Set([...sourceKeys, ...targetKeys])

      for (const key of allKeys) {
        const encodedKey = key.replace(/~/g, '~0').replace(/\//g, '~1')
        const keyPath = `${sourcePath}/${encodedKey}`

        if (!(key in sourceValue)) {
          // Key added
          addOperation({ op: 'add', path: keyPath, value: targetValue[key] })
        }
        else if (!(key in targetValue)) {
          // Key removed
          addOperation({ op: 'remove', path: keyPath })
        }
        else {
          // Key exists in both, check for changes
          diff(keyPath, sourceValue[key], targetValue[key])
        }
      }
    }
  }

  // Start diff from root
  diff('', source, target)

  return operations
}

/**
 * Apply JSON Patch operations to a JSON object
 *
 * Applies an array of JSON Patch operations (RFC 6902) to a JSON object,
 * returning a new object with the modifications applied.
 *
 * @param json - The JSON object to patch
 * @param operations - Array of JSON Patch operations to apply
 * @returns A new JSON object with patches applied
 * @throws {Error} When an operation is invalid or cannot be applied
 *
 * @example
 * ```typescript
 * import { applyJsonPatch } from '@itzcull/json-utils'
 *
 * // Basic patching
 * const user = { name: 'John', age: 30 }
 * const patched = applyJsonPatch(user, [
 *   { op: 'replace', path: '/age', value: 31 },
 *   { op: 'add', path: '/email', value: 'john@example.com' }
 * ])
 * // { name: 'John', age: 31, email: 'john@example.com' }
 *
 * // Complex modifications
 * const data = {
 *   users: [{ id: 1, name: 'Alice' }],
 *   settings: { theme: 'light' }
 * }
 * const result = applyJsonPatch(data, [
 *   { op: 'add', path: '/users/1', value: { id: 2, name: 'Bob' } },
 *   { op: 'replace', path: '/settings/theme', value: 'dark' },
 *   { op: 'add', path: '/version', value: '2.0' }
 * ])
 * // {
 * //   users: [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }],
 * //   settings: { theme: 'dark' },
 * //   version: '2.0'
 * // }
 *
 * // Removing properties
 * const config = { api: { url: 'localhost', key: 'secret' }, debug: true }
 * const cleaned = applyJsonPatch(config, [
 *   { op: 'remove', path: '/api/key' },
 *   { op: 'remove', path: '/debug' }
 * ])
 * // { api: { url: 'localhost' } }
 *
 * // Undo/redo functionality
 * function createUndoRedo(initialState: any) {
 *   let current = initialState
 *   const history: JsonPatchOperation[][] = []
 *
 *   return {
 *     apply: (patches: JsonPatchOperation[]) => {
 *       current = applyJsonPatch(current, patches)
 *       history.push(patches)
 *       return current
 *     },
 *     undo: () => {
 *       // Would need reverse patches
 *     }
 *   }
 * }
 *
 * // Migration script
 * const migrations = [
 *   [{ op: 'add', path: '/version', value: 1 }],
 *   [{ op: 'remove', path: '/deprecated' }],
 *   [{ op: 'replace', path: '/version', value: 2 }]
 * ]
 * let schema = {}
 * for (const migration of migrations) {
 *   schema = applyJsonPatch(schema, migration)
 * }
 * ```
 *
 * @category JSON
 */
export function applyJsonPatch<T extends JSONObject>(json: T, operations: JsonPatchOperation[]): T {
  // Create a deep copy to avoid mutations
  const result = JSON.parse(JSON.stringify(json)) as T

  for (const operation of operations) {
    switch (operation.op) {
      case 'add': {
        if (operation.value === undefined) {
          throw new Error('Add operation requires a value')
        }
        setJsonValueAtPointer(result, operation.path, operation.value)
        break
      }

      case 'remove': {
        const segments = getJsonPointerSegments(operation.path)
        if (segments.length === 0) {
          throw new Error('Cannot remove root')
        }

        // Check if path exists
        const value = getJsonValueAtPointer(result, operation.path)
        if (value === undefined) {
          throw new Error(`Path does not exist: ${operation.path}`)
        }

        removeJsonValueAtPointer(result, operation.path)
        break
      }

      case 'replace': {
        if (operation.value === undefined) {
          throw new Error('Replace operation requires a value')
        }

        // Check if path exists
        const value = getJsonValueAtPointer(result, operation.path)
        if (value === undefined) {
          throw new Error(`Path does not exist: ${operation.path}`)
        }

        setJsonValueAtPointer(result, operation.path, operation.value)
        break
      }

      case 'move': {
        if (!operation.from) {
          throw new Error('Move operation requires a from path')
        }

        const value = getJsonValueAtPointer(result, operation.from)
        if (value === undefined) {
          throw new Error(`Source path does not exist: ${operation.from}`)
        }

        removeJsonValueAtPointer(result, operation.from)
        setJsonValueAtPointer(result, operation.path, value)
        break
      }

      case 'copy': {
        if (!operation.from) {
          throw new Error('Copy operation requires a from path')
        }

        const value = getJsonValueAtPointer(result, operation.from)
        if (value === undefined) {
          throw new Error(`Source path does not exist: ${operation.from}`)
        }

        // Deep copy the value
        const copiedValue = JSON.parse(JSON.stringify(value))
        setJsonValueAtPointer(result, operation.path, copiedValue)
        break
      }

      case 'test': {
        const value = getJsonValueAtPointer(result, operation.path)
        if (!deepEquals(value!, operation.value!)) {
          throw new Error(`Test operation failed at path: ${operation.path}`)
        }
        break
      }

      default:
        throw new Error(`Unknown operation: ${(operation as any).op}`)
    }
  }

  return result
}
