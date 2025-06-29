# JSON Utilities

This module provides comprehensive utilities for working with JSON data, including JSON Pointer support, schema validation, and type-safe operations.

## Features

### JSON Pointer Support
- **Type-safe pointer generation**: `JsonPointers<T>` utility type generates all possible JSON Pointers for a readonly JSON object
- **Runtime pointer extraction**: `getAllJsonPointers()` function extracts all JSON Pointers from actual objects
- **Value retrieval**: `getJsonValueAtPointer()` safely retrieves values using JSON Pointer strings
- **Schema conversion**: Convert between JSON Pointers and JSON Schema pointers
- **RFC 6901 compliant**: Full support for JSON Pointer specification with proper character escaping

### Key Functions

#### `JsonPointers<T>` - Utility Type
Generates all possible JSON Pointers for a readonly JSON object as TypeScript union types.

```typescript
interface User {
  readonly id: number
  readonly profile: {
    readonly name: string
    readonly settings: {
      readonly theme: string
    }
  }
}

type UserPointers = JsonPointers<User>
// Result: "" | "/id" | "/profile" | "/profile/name" | "/profile/settings" | "/profile/settings/theme"
```

#### `getAllJsonPointers(obj)` - Runtime Function
Extracts all JSON Pointers from an object at runtime.

```typescript
const user = {
  id: 1,
  profile: {
    name: 'John',
    settings: { theme: 'dark' }
  }
}

const pointers = getAllJsonPointers(user)
// Returns: ["", "/id", "/profile", "/profile/name", "/profile/settings", "/profile/settings/theme"]
```

#### `getJsonValueAtPointer(obj, pointer)` - Value Access
Safely retrieves values using JSON Pointer strings.

```typescript
const value = getJsonValueAtPointer(user, '/profile/name') // 'John'
const theme = getJsonValueAtPointer(user, '/profile/settings/theme') // 'dark'
```

## RFCs and Standards
- [JSON Pointer (RFC 6901)](https://datatracker.ietf.org/doc/html/rfc6901)
- [JSON Reference](https://datatracker.ietf.org/doc/html/draft-pbryan-zyp-json-ref-03)
