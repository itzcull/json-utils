import type {
  InferFromSchema,
  JSONPointers,
  JSONSchema,
  JSONSchemaArray,
  JSONSchemaObject,
} from './types'
import { getJsonValueAtPointer } from './pointer'
import { isJsonValue } from './predicate'

/**
 * Validate that data conforms to a specific JSON Schema type
 *
 * Performs runtime validation to ensure data matches the expected schema type,
 * providing type-safe access to the validated data. This bridges compile-time
 * schema types with runtime validation.
 *
 * @template S - The JSON Schema type
 * @param data - The data to validate
 * @param schema - The schema to validate against
 * @returns Type predicate indicating if data matches schema
 *
 * @example
 * ```typescript
 * import { validateDataAgainstSchemaType } from '@itzcull/json-utils/conversion'
 *
 * const userSchema = {
 *   type: 'object',
 *   properties: {
 *     name: { type: 'string' },
 *     age: { type: 'number' },
 *     isActive: { type: 'boolean' }
 *   },
 *   required: ['name', 'age']
 * } satisfies JSONSchemaObject
 *
 * function processUser(rawData: unknown) {
 *   if (validateDataAgainstSchemaType(rawData, userSchema)) {
 *     // rawData is now typed as: { name: string; age: number; isActive?: boolean }
 *     console.log(`User: ${rawData.name}, Age: ${rawData.age}`)
 *     if (rawData.isActive !== undefined) {
 *       console.log(`Status: ${rawData.isActive ? 'Active' : 'Inactive'}`)
 *     }
 *   } else {
 *     throw new Error('Invalid user data')
 *   }
 * }
 *
 * // API response validation
 * async function fetchUser(id: string) {
 *   const response = await fetch(`/api/users/${id}`)
 *   const rawData = await response.json()
 *
 *   if (validateDataAgainstSchemaType(rawData, userSchema)) {
 *     return rawData  // Fully typed!
 *   } else {
 *     throw new Error('Invalid user data from API')
 *   }
 * }
 *
 * // Form validation
 * function validateFormData(formData: FormData) {
 *   const data = Object.fromEntries(formData)
 *
 *   if (validateDataAgainstSchemaType(data, userSchema)) {
 *     // Process valid form data with full type safety
 *     submitUser(data)
 *   }
 * }
 * ```
 *
 * @category Conversion
 */
export function validateDataAgainstSchemaType<S extends JSONSchema>(
  data: unknown,
  schema: S,
): data is InferFromSchema<S> {
  return validateValueAgainstSchema(data, schema)
}

/**
 * Internal function to perform schema validation
 */
function validateValueAgainstSchema(value: unknown, schema: JSONSchema): boolean {
  // Basic JSON value check
  if (!isJsonValue(value)) {
    return false
  }

  switch (schema.type) {
    case 'string': {
      return typeof value === 'string'
    }

    case 'number':
    case 'integer': {
      return typeof value === 'number'
        && (schema.type === 'number' || Number.isInteger(value))
    }

    case 'boolean': {
      return typeof value === 'boolean'
    }

    case 'null': {
      return value === null
    }

    case 'array': {
      if (!Array.isArray(value))
        return false

      const arraySchema = schema
      if (arraySchema.items) {
        if (Array.isArray(arraySchema.items)) {
          // Tuple validation
          return value.every((item, index) => {
            const itemSchema = arraySchema.items[index]
            return itemSchema ? validateValueAgainstSchema(item, itemSchema as JSONSchema) : true
          })
        }
        else {
          // All items must match the same schema
          return value.every(item =>
            validateValueAgainstSchema(item, arraySchema.items as JSONSchema),
          )
        }
      }
      return true
    }

    case 'object': {
      if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        return false
      }

      const objectSchema = schema as JSONSchemaObject
      const obj = value as Record<string, unknown>

      // Check required properties
      if (objectSchema.required) {
        for (const requiredProp of objectSchema.required) {
          if (!(requiredProp in obj)) {
            return false
          }
        }
      }

      // Validate properties
      if (objectSchema.properties) {
        for (const [key, propValue] of Object.entries(obj)) {
          const propSchema = objectSchema.properties[key]
          if (propSchema && !validateValueAgainstSchema(propValue, propSchema as JSONSchema)) {
            return false
          }
        }
      }

      return true
    }

    default: {
      // Handle multi-type or generic schemas
      if (Array.isArray(schema.type)) {
        return schema.type.some(type =>
          validateValueAgainstSchema(value, { type } as JSONSchema),
        )
      }

      // If no type specified, any valid JSON value is acceptable
      return true
    }
  }
}

/**
 * Convert JSON Pointer path to JSON Schema pointer path
 *
 * Transforms a JSON Pointer (used for data access) into a JSON Schema pointer
 * (used for schema navigation). Converts array indices to 'items' and adds
 * 'properties' prefixes for object navigation.
 *
 * @template P - The JSON Pointer string type
 * @param pointer - The JSON Pointer to convert
 * @returns JSON Schema pointer string
 *
 * @example
 * ```typescript
 * // Data pointer to schema pointer
 * jsonPointerToSchemaPointer('/user/name')        // '/properties/user/properties/name'
 * jsonPointerToSchemaPointer('/users/0/id')       // '/properties/users/items/properties/id'
 * jsonPointerToSchemaPointer('/tags/1')           // '/properties/tags/items'
 * jsonPointerToSchemaPointer('/config/0/enabled') // '/properties/config/items/properties/enabled'
 *
 * // Usage with schema navigation
 * const schema = {
 *   type: 'object',
 *   properties: {
 *     users: {
 *       type: 'array',
 *       items: {
 *         type: 'object',
 *         properties: {
 *           name: { type: 'string' }
 *         }
 *       }
 *     }
 *   }
 * }
 *
 * const dataPointer = '/users/0/name'
 * const schemaPointer = jsonPointerToSchemaPointer(dataPointer)
 * // schemaPointer: '/properties/users/items/properties/name'
 *
 * // Navigate to schema definition
 * const nameSchema = getJsonValueAtPointer(schema, schemaPointer)
 * // nameSchema: { type: 'string' }
 * ```
 *
 * @category Conversion
 */
export function jsonPointerToSchemaPointer<P extends string>(pointer: P): string {
  if (pointer === '' || pointer === '/') {
    return '/'
  }

  const segments = pointer.split('/').slice(1) // Remove empty first element
  const schemaSegments: string[] = []

  for (const segment of segments) {
    // Check if segment is a numeric array index
    if (/^\d+$/.test(segment)) {
      schemaSegments.push('items')
    }
    else {
      schemaSegments.push('properties', segment)
    }
  }

  return `/${schemaSegments.join('/')}`
}

/**
 * Convert JSON Schema pointer path to JSON Pointer path
 *
 * Transforms a JSON Schema pointer (used for schema navigation) into a JSON Pointer
 * (used for data access). Removes 'properties' prefixes and converts 'items' to
 * array index '0' for typical data access patterns.
 *
 * @template P - The JSON Schema pointer string type
 * @param schemaPointer - The JSON Schema pointer to convert
 * @returns JSON Pointer string
 *
 * @example
 * ```typescript
 * // Schema pointer to data pointer
 * schemaPointerToJsonPointer('/properties/user/properties/name')  // '/user/name'
 * schemaPointerToJsonPointer('/properties/users/items/properties/id')  // '/users/0/id'
 * schemaPointerToJsonPointer('/properties/tags/items')  // '/tags/0'
 *
 * // Usage with data access
 * const data = {
 *   users: [
 *     { name: 'Alice', id: 1 },
 *     { name: 'Bob', id: 2 }
 *   ]
 * }
 *
 * const schemaPointer = '/properties/users/items/properties/name'
 * const dataPointer = schemaPointerToJsonPointer(schemaPointer)
 * // dataPointer: '/users/0/name'
 *
 * const value = getJsonValueAtPointer(data, dataPointer)
 * // value: 'Alice'
 * ```
 *
 * @category Conversion
 */
export function schemaPointerToJsonPointer<P extends string>(schemaPointer: P): string {
  if (schemaPointer === '' || schemaPointer === '/') {
    return '/'
  }

  const segments = schemaPointer.split('/').slice(1) // Remove empty first element
  const dataSegments: string[] = []

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i]

    if (segment === 'properties') {
      // Skip 'properties' and use the next segment as the property name
      if (i + 1 < segments.length) {
        dataSegments.push(segments[i + 1])
        i++ // Skip the next segment since we used it
      }
    }
    else if (segment === 'items') {
      // Convert 'items' to array index 0
      dataSegments.push('0')
    }
    // Skip any other segments that aren't property names or items
  }

  return dataSegments.length > 0 ? `/${dataSegments.join('/')}` : '/'
}

/**
 * Check if two JSON schemas are compatible (one can accept data valid for the other)
 *
 * Determines if data that is valid for the source schema would also be valid
 * for the target schema. This is useful for schema evolution, API versioning,
 * and migration scenarios.
 *
 * @template S1 - The source schema type
 * @template S2 - The target schema type
 * @param sourceSchema - The schema that data currently conforms to
 * @param targetSchema - The schema to check compatibility against
 * @returns True if schemas are compatible, false otherwise
 *
 * @example
 * ```typescript
 * const v1Schema = {
 *   type: 'object',
 *   properties: {
 *     name: { type: 'string' },
 *     age: { type: 'number' }
 *   },
 *   required: ['name', 'age']
 * } satisfies JSONSchemaObject
 *
 * const v2Schema = {
 *   type: 'object',
 *   properties: {
 *     name: { type: 'string' },
 *     age: { type: 'number' },
 *     email: { type: 'string' }  // New optional field
 *   },
 *   required: ['name', 'age']
 * } satisfies JSONSchemaObject
 *
 * const v3Schema = {
 *   type: 'object',
 *   properties: {
 *     name: { type: 'string' },
 *     age: { type: 'number' },
 *     email: { type: 'string' }
 *   },
 *   required: ['name', 'age', 'email']  // Email now required
 * } satisfies JSONSchemaObject
 *
 * // API migration checking
 * console.log(schemasCompatible(v1Schema, v2Schema))  // true - v1 data works with v2
 * console.log(schemasCompatible(v1Schema, v3Schema))  // false - v1 data missing required email
 * console.log(schemasCompatible(v2Schema, v1Schema))  // true - v2 data works with v1
 *
 * // Schema evolution validation
 * function canMigrateSchema(oldSchema: JSONSchema, newSchema: JSONSchema) {
 *   if (schemasCompatible(oldSchema, newSchema)) {
 *     console.log('✅ Safe to migrate - existing data will remain valid')
 *     return true
 *   } else {
 *     console.log('⚠️  Migration requires data transformation')
 *     return false
 *   }
 * }
 * ```
 *
 * @category Conversion
 */
export function schemasCompatible<S1 extends JSONSchema, S2 extends JSONSchema>(
  sourceSchema: S1,
  targetSchema: S2,
): boolean {
  // Basic type compatibility
  if (sourceSchema.type !== targetSchema.type) {
    return false
  }

  if (sourceSchema.type === 'object' && targetSchema.type === 'object') {
    const source = sourceSchema as JSONSchemaObject
    const target = targetSchema as JSONSchemaObject

    // Check that all required properties in target exist in source
    if (target.required) {
      const sourceRequired = source.required || []
      for (const requiredProp of target.required) {
        if (!sourceRequired.includes(requiredProp)) {
          // Target requires a property that source doesn't require
          // This is only compatible if source has this property (even if optional)
          if (!source.properties?.[requiredProp]) {
            return false
          }
        }
      }
    }

    // Check property compatibility
    if (target.properties && source.properties) {
      for (const [propName, targetPropSchema] of Object.entries(target.properties)) {
        const sourcePropSchema = source.properties[propName]
        if (sourcePropSchema) {
          // Recursively check property schema compatibility
          if (!schemasCompatible(sourcePropSchema as JSONSchema, targetPropSchema as JSONSchema)) {
            return false
          }
        }
      }
    }

    return true
  }

  if (sourceSchema.type === 'array' && targetSchema.type === 'array') {
    const source = sourceSchema as JSONSchemaArray
    const target = targetSchema as JSONSchemaArray

    // Check items compatibility
    if (source.items && target.items) {
      if (Array.isArray(source.items) && Array.isArray(target.items)) {
        // Tuple compatibility - target must have at least as many items as source
        if (target.items.length < source.items.length) {
          return false
        }

        // Each corresponding item must be compatible
        for (let i = 0; i < source.items.length; i++) {
          if (!schemasCompatible(source.items[i] as JSONSchema, target.items[i] as JSONSchema)) {
            return false
          }
        }
      }
      else if (!Array.isArray(source.items) && !Array.isArray(target.items)) {
        // Single item schema compatibility
        return schemasCompatible(source.items as JSONSchema, target.items as JSONSchema)
      }
      else {
        // Mixed tuple/single item - generally not compatible
        return false
      }
    }

    return true
  }

  // For primitive types, they're compatible if they're the same type
  return true
}

/**
 * Create a type-safe data accessor for a specific schema
 *
 * Returns a function that provides type-safe access to data that conforms
 * to the given schema. The accessor validates data at runtime and provides
 * compile-time type safety for property access.
 *
 * @template S - The JSON Schema type
 * @param schema - The schema that defines the data structure
 * @returns Type-safe accessor function
 *
 * @example
 * ```typescript
 * const userSchema = {
 *   type: 'object',
 *   properties: {
 *     profile: {
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
 *     },
 *     tags: {
 *       type: 'array',
 *       items: { type: 'string' }
 *     }
 *   }
 * } satisfies JSONSchemaObject
 *
 * const userAccessor = createSchemaAccessor(userSchema)
 *
 * // API data processing
 * async function processUserData(rawData: unknown) {
 *   const user = userAccessor(rawData)
 *
 *   if (user) {
 *     // Fully typed access with IntelliSense
 *     const name = user.get('/profile/name')        // string | undefined
 *     const theme = user.get('/profile/settings/theme')  // string | undefined
 *     const firstTag = user.get('/tags/0')          // string | undefined
 *
 *     // Type-safe data access
 *     console.log(`User: ${name}, Theme: ${theme}`)
 *
 *     // Access validated data directly
 *     const validatedData = user.data  // Fully typed!
 *     console.log(validatedData.profile?.name)
 *   }
 * }
 *
 * // Form validation with type safety
 * function handleFormSubmit(formData: FormData) {
 *   const rawData = Object.fromEntries(formData)
 *   const user = userAccessor(rawData)
 *
 *   if (user) {
 *     // Process valid form data with full type safety
 *     submitUser(user.data)
 *   } else {
 *     showValidationErrors()
 *   }
 * }
 * ```
 *
 * @category Conversion
 */
export function createSchemaAccessor<S extends JSONSchema>(schema: S) {
  type DataType = InferFromSchema<S>
  type PointerType = JSONPointers<DataType>

  return function accessor(data: unknown): {
    data: DataType
    get: <P extends PointerType>(pointer: P) => any
  } | null {
    if (!validateDataAgainstSchemaType(data, schema)) {
      return null
    }

    const validatedData = data as DataType

    return {
      data: validatedData,
      get: <P extends PointerType>(pointer: P) => {
        return getJsonValueAtPointer(validatedData, pointer)
      },
    }
  }
}

/**
 * Transform data from one schema format to another
 *
 * Converts data that conforms to a source schema into the format expected
 * by a target schema. Useful for API versioning, data migration, and format
 * conversion scenarios.
 *
 * @template S1 - The source schema type
 * @template S2 - The target schema type
 * @param data - The source data to transform
 * @param sourceSchema - The schema the data currently conforms to
 * @param targetSchema - The schema to transform the data to
 * @param transformer - Function to handle the transformation logic
 * @returns Transformed data or null if transformation fails
 *
 * @example
 * ```typescript
 * const v1Schema = {
 *   type: 'object',
 *   properties: {
 *     fullName: { type: 'string' },
 *     age: { type: 'number' }
 *   }
 * } satisfies JSONSchemaObject
 *
 * const v2Schema = {
 *   type: 'object',
 *   properties: {
 *     firstName: { type: 'string' },
 *     lastName: { type: 'string' },
 *     age: { type: 'number' },
 *     email: { type: 'string' }
 *   }
 * } satisfies JSONSchemaObject
 *
 * // API migration
 * const v1Data = { fullName: 'John Doe', age: 30 }
 *
 * const v2Data = transformSchemaData(
 *   v1Data,
 *   v1Schema,
 *   v2Schema,
 *   (source) => {
 *     const [firstName, lastName] = source.fullName.split(' ')
 *     return {
 *       firstName,
 *       lastName: lastName || '',
 *       age: source.age,
 *       email: `${firstName.toLowerCase()}@example.com`
 *     }
 *   }
 * )
 * // Result: { firstName: 'John', lastName: 'Doe', age: 30, email: 'john@example.com' }
 *
 * // Database migration
 * function migrateUserRecords(oldRecords: unknown[]) {
 *   return oldRecords.map(record =>
 *     transformSchemaData(record, v1Schema, v2Schema, transformUserV1ToV2)
 *   ).filter(Boolean) // Remove failed transformations
 * }
 * ```
 *
 * @category Conversion
 */
export function transformSchemaData<S1 extends JSONSchema, S2 extends JSONSchema>(
  data: unknown,
  sourceSchema: S1,
  targetSchema: S2,
  transformer: (source: InferFromSchema<S1>) => InferFromSchema<S2>,
): InferFromSchema<S2> | null {
  // Validate source data
  if (!validateDataAgainstSchemaType(data, sourceSchema)) {
    return null
  }

  try {
    // Apply transformation
    const transformed = transformer(data)

    // Validate transformed data
    if (!validateDataAgainstSchemaType(transformed, targetSchema)) {
      return null
    }

    return transformed
  }
  catch {
    return null
  }
}
