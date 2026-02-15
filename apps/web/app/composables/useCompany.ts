import { createSharedComposable } from '@vueuse/core'

interface Company {
  id: string
  name: string
  slug: string
  ownerId: string
  settings: {
    timezone?: string
    dateFormat?: string
    defaultLanguage?: string
    theme?: Record<string, any>
  }
  createdAt: string
  updatedAt: string
  owner?: {
    id: string
    name: string
    email: string
    avatarUrl?: string
  }
  memberCount?: number
  myRole?: 'owner' | 'admin' | 'member'
}

interface CompanyMember {
  id: string
  companyId: string
  userId: string
  role: 'owner' | 'admin' | 'member'
  joinedAt: string
  invitedBy: string | null
  user: {
    id: string
    name: string
    email: string
    avatarUrl?: string
    isActive: boolean
  }
  invitedByUser?: {
    id: string
    name: string
  } | null
}

interface InviteLink {
  id: string
  companyId: string
  token: string
  role: 'admin' | 'member'
  maxUses: number | null
  usedCount: number
  expiresAt: string | null
  isActive: boolean
  createdAt: string
  createdByUser?: {
    id: string
    name: string
    avatarUrl?: string
  }
}

const _useCompany = (companyId: string) => {
  const { data: companyData, pending, refresh } = 
    useFetch(`/api/companies/${companyId}`, {
      key: `company-${companyId}`,
      watch: false
    })
  
  const company = computed<Company | null>(() => companyData.value?.company || null)
  
  // Update company
  async function update(data: Partial<Company>) {
    const response = await $fetch(`/api/companies/${companyId}`, {
      method: 'PATCH',
      body: data
    })
    await refresh()
    return response
  }
  
  // Delete company
  async function remove() {
    await $fetch(`/api/companies/${companyId}`, {
      method: 'DELETE'
    })
  }
  
  return {
    company,
    pending,
    refresh,
    update,
    remove,
  }
}

export const useCompany = createSharedComposable(_useCompany)

// Invite management composable
const _useInvites = (companyId: string) => {
  const { data: invitesData, pending, refresh } = 
    useFetch(`/api/companies/${companyId}/invites`, {
      key: `invites-${companyId}`,
      watch: false
    })
  
  const invites = computed<InviteLink[]>(() => invitesData.value?.invites || [])
  
  // Create invite
  async function create(data: {
    role?: 'admin' | 'member'
    maxUses?: number
    expiresAt?: string
  }) {
    const response = await $fetch(`/api/companies/${companyId}/invites`, {
      method: 'POST',
      body: data
    })
    await refresh()
    return response
  }
  
  // Cancel invite
  async function cancel(token: string) {
    await $fetch(`/api/companies/${companyId}/invites/${token}`, {
      method: 'DELETE'
    })
    await refresh()
  }
  
  return {
    invites,
    pending,
    refresh,
    create,
    cancel,
  }
}

export const useInvites = createSharedComposable(_useInvites)
