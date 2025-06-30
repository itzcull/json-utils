import type {
  InferFromSchema,
  JsonPointers,
  JSONSchemaObject,
  MakeSchemaOptional,
  MergeSchemas,
  OmitSchemaProperties,
  PickSchemaProperties,
} from './types'
import { describe, expect, expectTypeOf, it } from 'vitest'
import {
  createSchemaAccessor,
  transformSchemaData,
  validateDataAgainstSchemaType,
} from './conversion'

// Real-world API schema examples
const userApiSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    username: { type: 'string' },
    email: { type: 'string' },
    profile: {
      type: 'object',
      properties: {
        firstName: { type: 'string' },
        lastName: { type: 'string' },
        avatar: { type: 'string' },
        bio: { type: 'string' },
        location: { type: 'string' },
        website: { type: 'string' },
        socialLinks: {
          type: 'object',
          properties: {
            twitter: { type: 'string' },
            github: { type: 'string' },
            linkedin: { type: 'string' },
          },
        },
      },
      required: ['firstName', 'lastName'],
    },
    preferences: {
      type: 'object',
      properties: {
        theme: { type: 'string' },
        language: { type: 'string' },
        notifications: {
          type: 'object',
          properties: {
            email: { type: 'boolean' },
            push: { type: 'boolean' },
            sms: { type: 'boolean' },
          },
        },
        privacy: {
          type: 'object',
          properties: {
            profileVisibility: { type: 'string' },
            showEmail: { type: 'boolean' },
          },
        },
      },
    },
    metadata: {
      type: 'object',
      properties: {
        createdAt: { type: 'string' },
        updatedAt: { type: 'string' },
        lastLoginAt: { type: 'string' },
        isVerified: { type: 'boolean' },
        accountStatus: { type: 'string' },
      },
    },
  },
  required: ['id', 'username', 'email'],
} as const satisfies JSONSchemaObject

const blogPostSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    title: { type: 'string' },
    slug: { type: 'string' },
    content: { type: 'string' },
    excerpt: { type: 'string' },
    author: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        username: { type: 'string' },
        displayName: { type: 'string' },
      },
      required: ['id', 'username'],
    },
    tags: {
      type: 'array',
      items: { type: 'string' },
    },
    categories: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          slug: { type: 'string' },
        },
        required: ['id', 'name'],
      },
    },
    publishedAt: { type: 'string' },
    updatedAt: { type: 'string' },
    status: { type: 'string' },
    featuredImage: { type: 'string' },
    readingTime: { type: 'number' },
    viewCount: { type: 'number' },
    isPublished: { type: 'boolean' },
  },
  required: ['id', 'title', 'content', 'author'],
} as const satisfies JSONSchemaObject

describe('real-world API integration tests', () => {
  it('should handle complex user profile data with type safety', () => {
    type User = InferFromSchema<typeof userApiSchema>
    type UserPointers = JsonPointers<User>

    // Test that we get proper type inference for nested structures
    expectTypeOf<User['id']>().toEqualTypeOf<string>()
    expectTypeOf<User['profile']>().toEqualTypeOf<{
      firstName: string
      lastName: string
      avatar?: string
      bio?: string
      location?: string
      website?: string
      socialLinks?: {
        twitter?: string
        github?: string
        linkedin?: string
      }
    } | undefined>()

    // Test JSON Pointer types for nested access
    expectTypeOf<'/profile/firstName'>().toMatchTypeOf<UserPointers>()
    expectTypeOf<'/profile/socialLinks/github'>().toMatchTypeOf<UserPointers>()
    expectTypeOf<'/preferences/notifications/email'>().toMatchTypeOf<UserPointers>()

    // Test runtime validation with type safety
    const validUser = {
      id: '123',
      username: 'john_doe',
      email: 'john@example.com',
      profile: {
        firstName: 'John',
        lastName: 'Doe',
        bio: 'Software developer',
        socialLinks: {
          github: 'johndoe',
          twitter: '@johndoe',
        },
      },
      preferences: {
        theme: 'dark',
        notifications: {
          email: true,
          push: false,
        },
      },
    }

    expect(validateDataAgainstSchemaType(validUser, userApiSchema)).toBe(true)

    if (validateDataAgainstSchemaType(validUser, userApiSchema)) {
      // TypeScript should know this is properly typed
      expect(validUser.id).toBe('123')
      expect(validUser.profile.firstName).toBe('John')
      expect(validUser.profile.socialLinks?.github).toBe('johndoe')
    }
  })

  it('should create type-safe accessors for complex schemas', () => {
    const userAccessor = createSchemaAccessor(userApiSchema)
    const blogAccessor = createSchemaAccessor(blogPostSchema)

    const userData = {
      id: '123',
      username: 'blogger',
      email: 'blogger@example.com',
      profile: {
        firstName: 'Jane',
        lastName: 'Smith',
        bio: 'Content creator',
      },
      preferences: {
        theme: 'light',
        language: 'en',
        notifications: {
          email: true,
          push: true,
          sms: false,
        },
      },
    }

    const blogData = {
      id: 'post-123',
      title: 'Advanced TypeScript Patterns',
      content: 'In this post, we explore...',
      author: {
        id: '123',
        username: 'blogger',
        displayName: 'Jane Smith',
      },
      tags: ['typescript', 'programming', 'web-development'],
      categories: [
        { id: 'cat-1', name: 'Programming', slug: 'programming' },
        { id: 'cat-2', name: 'TypeScript', slug: 'typescript' },
      ],
      publishedAt: '2024-01-01T00:00:00Z',
      status: 'published',
      isPublished: true,
      readingTime: 5,
      viewCount: 142,
    }

    const user = userAccessor(userData)
    const post = blogAccessor(blogData)

    expect(user).not.toBeNull()
    expect(post).not.toBeNull()

    if (user && post) {
      // Type-safe property access
      expect(user.get('/username')).toBe('blogger')
      expect(user.get('/profile/firstName')).toBe('Jane')
      expect(user.get('/preferences/notifications/email')).toBe(true)

      expect(post.get('/title')).toBe('Advanced TypeScript Patterns')
      expect(post.get('/author/displayName')).toBe('Jane Smith')
      expect(post.get('/tags/0')).toBe('typescript')
      expect(post.get('/categories/0/name')).toBe('Programming')
    }
  })
})

describe('schema transformation workflows', () => {
  it('should support API versioning with schema transformations', () => {
    // V1 API schema
    const userV1Schema = {
      type: 'object',
      properties: {
        id: { type: 'string' },
        fullName: { type: 'string' },
        emailAddress: { type: 'string' },
        isActive: { type: 'boolean' },
      },
      required: ['id', 'fullName', 'emailAddress'],
    } as const satisfies JSONSchemaObject

    // V2 API schema - split fullName, renamed email field
    const userV2Schema = {
      type: 'object',
      properties: {
        id: { type: 'string' },
        firstName: { type: 'string' },
        lastName: { type: 'string' },
        email: { type: 'string' },
        isActive: { type: 'boolean' },
        profile: {
          type: 'object',
          properties: {
            bio: { type: 'string' },
            avatar: { type: 'string' },
          },
        },
      },
      required: ['id', 'firstName', 'lastName', 'email'],
    } as const satisfies JSONSchemaObject

    type UserV1 = InferFromSchema<typeof userV1Schema>
    type UserV2 = InferFromSchema<typeof userV2Schema>

    // Test type inference
    expectTypeOf<UserV1>().toMatchTypeOf<{
      id: string
      fullName: string
      emailAddress: string
      isActive?: boolean
    }>()

    expectTypeOf<UserV2>().toMatchTypeOf<{
      id: string
      firstName: string
      lastName: string
      email: string
      isActive?: boolean
      profile?: {
        bio?: string
        avatar?: string
      }
    }>()

    // Test transformation
    const v1Data = {
      id: '123',
      fullName: 'John Doe',
      emailAddress: 'john@example.com',
      isActive: true,
    }

    const v2Data = transformSchemaData(
      v1Data,
      userV1Schema,
      userV2Schema,
      (source) => {
        const [firstName, ...lastNameParts] = source.fullName.split(' ')
        return {
          id: source.id,
          firstName,
          lastName: lastNameParts.join(' ') || '',
          email: source.emailAddress,
          isActive: source.isActive,
        }
      },
    )

    expect(v2Data).toEqual({
      id: '123',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      isActive: true,
    })

    // Verify the transformed data validates against V2 schema
    expect(validateDataAgainstSchemaType(v2Data, userV2Schema)).toBe(true)
  })

  it('should support creating specialized schemas for different use cases', () => {
    // Public profile schema - omit sensitive fields
    type PublicUserSchema = OmitSchemaProperties<
      typeof userApiSchema,
      'email' | 'preferences' | 'metadata'
    >
    type PublicUser = InferFromSchema<PublicUserSchema>

    expectTypeOf<PublicUser>().toMatchTypeOf<{
      id: string
      username: string
      profile?: {
        firstName: string
        lastName: string
        avatar?: string
        bio?: string
        location?: string
        website?: string
        socialLinks?: {
          twitter?: string
          github?: string
          linkedin?: string
        }
      }
    }>()

    // Update schema - make most fields optional
    type UserUpdateSchema = MakeSchemaOptional<
      PickSchemaProperties<typeof userApiSchema, 'username' | 'email' | 'profile'>,
      'username' | 'email'
    >
    type UserUpdate = InferFromSchema<UserUpdateSchema>

    expectTypeOf<UserUpdate>().toMatchTypeOf<{
      username?: string
      email?: string
      profile?: {
        firstName: string
        lastName: string
        avatar?: string
        bio?: string
        location?: string
        website?: string
        socialLinks?: {
          twitter?: string
          github?: string
          linkedin?: string
        }
      }
    }>()

    // Registration schema - partial user with required email
    type UserRegistrationSchema = PickSchemaProperties<
      typeof userApiSchema,
      'username' | 'email' | 'profile'
    >
    type UserRegistration = InferFromSchema<UserRegistrationSchema>

    expectTypeOf<UserRegistration>().toMatchTypeOf<{
      username: string
      email: string
      profile?: {
        firstName: string
        lastName: string
        avatar?: string
        bio?: string
        location?: string
        website?: string
        socialLinks?: {
          twitter?: string
          github?: string
          linkedin?: string
        }
      }
    }>()
  })

  it('should support merging schemas from different domains', () => {
    // Merge user and blog post for author information
    type AuthorWithPostsSchema = MergeSchemas<
      PickSchemaProperties<typeof userApiSchema, 'id' | 'username' | 'profile'>,
      PickSchemaProperties<typeof blogPostSchema, 'id' | 'title' | 'publishedAt'>
    >
    type AuthorWithPosts = InferFromSchema<AuthorWithPostsSchema>

    expectTypeOf<AuthorWithPosts>().toMatchTypeOf<{
      id: string // Required from both schemas
      username: string // Required from user schema
      profile?: {
        firstName: string
        lastName: string
        avatar?: string
        bio?: string
        location?: string
        website?: string
        socialLinks?: {
          twitter?: string
          github?: string
          linkedin?: string
        }
      }
      title: string // Required from blog schema
      publishedAt?: string // Optional from blog schema
    }>()
  })
})

describe('dynamic schema building patterns', () => {
  it('should support building schemas progressively', () => {
    // Start with a base schema
    const baseSchema = {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
      },
      required: ['id', 'name'],
    } as const satisfies JSONSchemaObject

    // Use schema at runtime to satisfy linter
    void baseSchema

    // Add optional fields
    type WithOptionalEmail = MergeSchemas<
      typeof baseSchema,
      {
        type: 'object'
        properties: {
          email: { type: 'string' }
        }
      }
    >

    // Make some fields optional
    type FlexibleSchema = MakeSchemaOptional<WithOptionalEmail, 'name'>

    // Pick specific fields for a view
    type ListView = PickSchemaProperties<FlexibleSchema, 'id' | 'name'>

    type ListViewType = InferFromSchema<ListView>

    expectTypeOf<ListViewType>().toMatchTypeOf<{
      id: string
      name?: string
    }>()
  })

  it('should handle conditional schema composition', () => {
    // Different schemas for different user roles
    const adminUserExtension = {
      type: 'object',
      properties: {
        permissions: {
          type: 'array',
          items: { type: 'string' },
        },
        lastAdminAction: { type: 'string' },
        adminLevel: { type: 'number' },
      },
      required: ['permissions', 'adminLevel'],
    } as const satisfies JSONSchemaObject

    const regularUserExtension = {
      type: 'object',
      properties: {
        subscription: {
          type: 'object',
          properties: {
            plan: { type: 'string' },
            expiresAt: { type: 'string' },
          },
          required: ['plan'],
        },
        usage: {
          type: 'object',
          properties: {
            apiCalls: { type: 'number' },
            storageUsed: { type: 'number' },
          },
        },
      },
    } as const satisfies JSONSchemaObject

    // Use schemas at runtime to satisfy linter
    void adminUserExtension
    void regularUserExtension

    type AdminUser = InferFromSchema<
      MergeSchemas<typeof userApiSchema, typeof adminUserExtension>
    >
    type RegularUser = InferFromSchema<
      MergeSchemas<typeof userApiSchema, typeof regularUserExtension>
    >

    // Test that admin users have admin-specific fields
    expectTypeOf<AdminUser['permissions']>().toEqualTypeOf<string[]>()
    expectTypeOf<AdminUser['adminLevel']>().toEqualTypeOf<number>()

    // Test that regular users have subscription fields
    expectTypeOf<RegularUser['subscription']>().toMatchTypeOf<{
      plan: string
      expiresAt?: string
    } | undefined>()
  })
})

describe('performance and edge cases', () => {
  it('should handle deeply nested schemas efficiently', () => {
    const deepSchema = {
      type: 'object',
      properties: {
        level1: {
          type: 'object',
          properties: {
            level2: {
              type: 'object',
              properties: {
                level3: {
                  type: 'object',
                  properties: {
                    level4: {
                      type: 'object',
                      properties: {
                        level5: {
                          type: 'object',
                          properties: {
                            value: { type: 'string' },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    } as const satisfies JSONSchemaObject

    type DeepType = InferFromSchema<typeof deepSchema>
    type DeepPointers = JsonPointers<DeepType>

    // Should be able to access deeply nested properties
    expectTypeOf<'/level1/level2/level3/level4/level5/value'>().toMatchTypeOf<DeepPointers>()

    const deepData = {
      level1: {
        level2: {
          level3: {
            level4: {
              level5: {
                value: 'deep value',
              },
            },
          },
        },
      },
    }

    const accessor = createSchemaAccessor(deepSchema)
    const result = accessor(deepData)

    expect(result).not.toBeNull()
    if (result) {
      expect(result.get('/level1/level2/level3/level4/level5/value')).toBe('deep value')
    }
  })

  it('should handle schemas with complex array structures', () => {
    const complexArraySchema = {
      type: 'object',
      properties: {
        users: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              posts: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    comments: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'string' },
                          text: { type: 'string' },
                        },
                        required: ['id', 'text'],
                      },
                    },
                  },
                  required: ['id'],
                },
              },
            },
            required: ['id'],
          },
        },
      },
    } as const satisfies JSONSchemaObject

    type ComplexArrayType = InferFromSchema<typeof complexArraySchema>
    type ComplexPointers = JsonPointers<ComplexArrayType>

    expectTypeOf<'/users/0/posts/0/comments/0/text'>().toMatchTypeOf<ComplexPointers>()

    const complexData = {
      users: [
        {
          id: 'user1',
          posts: [
            {
              id: 'post1',
              comments: [
                { id: 'comment1', text: 'Great post!' },
                { id: 'comment2', text: 'Thanks for sharing!' },
              ],
            },
          ],
        },
      ],
    }

    const accessor = createSchemaAccessor(complexArraySchema)
    const result = accessor(complexData)

    expect(result).not.toBeNull()
    if (result) {
      expect(result.get('/users/0/id')).toBe('user1')
      expect(result.get('/users/0/posts/0/comments/0/text')).toBe('Great post!')
    }
  })
})
