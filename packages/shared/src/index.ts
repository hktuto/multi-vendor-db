// Shared types and utilities

export interface User {
  id: string
  email: string
  name: string
  role: 'admin' | 'user'
  createdAt: Date
}

export interface Company {
  id: string
  name: string
  slug: string
  ownerId: string
  createdAt: Date
}

// Add more shared types as needed