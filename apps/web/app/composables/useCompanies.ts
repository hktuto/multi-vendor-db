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
  memberCount: number
  myRole: 'owner' | 'admin' | 'member'
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

const _useCompanies = () => {
  const currentCompanyId = useState<string | null>('currentCompanyId', () => null)
  
  // Fetch all companies for current user
  const { data: companiesData, pending: companiesPending, refresh: refreshCompanies } = 
    useFetch('/api/companies')
  
  const companies = computed<Company[]>(() => companiesData.value?.companies || [])
  
  // Current company
  const currentCompany = computed<Company | null>(() => {
    if (!currentCompanyId.value) {
      // Auto-select first company
      if (companies.value.length > 0) {
        currentCompanyId.value = companies.value[0].id
        return companies.value[0]
      }
      return null
    }
    return companies.value.find(c => c.id === currentCompanyId.value) || null
  })
  
  // Set current company
  function setCurrentCompany(companyId: string) {
    const exists = companies.value.find(c => c.id === companyId)
    if (exists) {
      currentCompanyId.value = companyId
    }
  }
  
  // Fetch single company
  async function fetchCompany(companyId: string) {
    return await $fetch(`/api/companies/${companyId}`)
  }
  
  // Create company
  async function createCompany(name: string, slug: string) {
    return await $fetch('/api/companies', {
      method: 'POST',
      body: { name, slug }
    })
  }
  
  // Update company
  async function updateCompany(companyId: string, data: Partial<Company>) {
    return await $fetch(`/api/companies/${companyId}`, {
      method: 'PUT',
      body: data
    })
  }
  
  // Delete company
  async function deleteCompany(companyId: string) {
    await $fetch(`/api/companies/${companyId}`, {
      method: 'DELETE'
    })
  }
  
  // Fetch company members
  async function fetchCompanyMembers(companyId: string) {
    return await $fetch(`/api/companies/${companyId}/members`)
  }
  
  // Add company member
  async function addCompanyMember(companyId: string, email: string, role: 'admin' | 'member') {
    return await $fetch(`/api/companies/${companyId}/members`, {
      method: 'POST',
      body: { email, role }
    })
  }
  
  // Remove company member
  async function removeCompanyMember(companyId: string, userId: string) {
    await $fetch(`/api/companies/${companyId}/members/${userId}`, {
      method: 'DELETE'
    })
  }
  
  // Update member role
  async function updateMemberRole(companyId: string, userId: string, role: 'admin' | 'member') {
    return await $fetch(`/api/companies/${companyId}/members/${userId}`, {
      method: 'PUT',
      body: { role }
    })
  }
  
  return {
    // State
    companies,
    companiesPending,
    currentCompany,
    currentCompanyId,
    
    // Actions
    refreshCompanies,
    setCurrentCompany,
    fetchCompany,
    createCompany,
    updateCompany,
    deleteCompany,
    fetchCompanyMembers,
    addCompanyMember,
    removeCompanyMember,
    updateMemberRole,
  }
}

export const useCompanies = createSharedComposable(_useCompanies)
