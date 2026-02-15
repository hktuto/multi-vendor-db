<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'

definePageMeta({
  middleware: ['auth']
})

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

const { data, pending, refresh } = await useFetch('/api/companies')
const companies = computed(() => data.value?.companies || [])

const toast = useToast()
const router = useRouter()

const columns: TableColumn<Company>[] = [
  {
    accessorKey: 'name',
    header: 'Company',
    cell: ({ row }) => {
      const company = row.original
      return h('div', { class: 'flex items-center gap-3' }, [
        h('div', { 
          class: 'w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-semibold' 
        }, company.name.charAt(0).toUpperCase()),
        h('div', {}, [
          h('div', { class: 'font-medium' }, company.name),
          h('div', { class: 'text-xs text-dimmed' }, `@${company.slug}`)
        ])
      ])
    }
  },
  {
    accessorKey: 'myRole',
    header: 'Your Role',
    cell: ({ row }) => {
      const role = row.original.myRole
      const roleColors: Record<string, string> = {
        owner: 'text-amber-500',
        admin: 'text-blue-500',
        member: 'text-green-500'
      }
      return h('span', { 
        class: `text-sm font-medium capitalize ${roleColors[role] || ''}` 
      }, role)
    }
  },
  {
    accessorKey: 'memberCount',
    header: 'Members',
    cell: ({ row }) => h('span', { class: 'text-sm text-dimmed' }, 
      `${row.original.memberCount} member${row.original.memberCount !== 1 ? 's' : ''}`
    )
  },
  {
    accessorKey: 'createdAt',
    header: 'Created',
    cell: ({ row }) => h('span', { class: 'text-sm text-dimmed' }, 
      new Date(row.original.createdAt).toLocaleDateString()
    )
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) => {
      const company = row.original
      const canManage = company.myRole === 'owner' || company.myRole === 'admin'
      
      return h('div', { class: 'flex items-center justify-end gap-2' }, [
        h(resolveComponent('UButton'), {
          color: 'neutral',
          variant: 'ghost',
          size: 'sm',
          icon: 'i-lucide-settings',
          to: `/companies/${company.id}`,
          label: 'Manage'
        }),
        canManage && h(resolveComponent('UDropdownMenu'), {
          items: [[
            {
              label: 'Settings',
              icon: 'i-lucide-settings-2',
              to: `/companies/${company.id}`
            },
            {
              label: 'Members',
              icon: 'i-lucide-users',
              to: `/companies/${company.id}/members`
            },
            ...(company.myRole === 'owner' ? [{
              label: 'Delete',
              icon: 'i-lucide-trash-2',
              color: 'error' as const,
              onSelect: () => deleteCompany(company)
            }] : [])
          ]]
        }, () => h(resolveComponent('UButton'), {
          color: 'neutral',
          variant: 'ghost',
          size: 'sm',
          icon: 'i-lucide-more-vertical'
        }))
      ])
    }
  }
]

const deleteModalOpen = ref(false)
const companyToDelete = ref<Company | null>(null)
const isDeleting = ref(false)

function deleteCompany(company: Company) {
  companyToDelete.value = company
  deleteModalOpen.value = true
}

async function confirmDelete() {
  if (!companyToDelete.value) return
  
  isDeleting.value = true
  try {
    await $fetch(`/api/companies/${companyToDelete.value.id}`, {
      method: 'DELETE'
    })
    
    toast.add({
      title: 'Company deleted',
      description: `${companyToDelete.value.name} has been deleted successfully`,
      color: 'success'
    })
    
    await refresh()
  } catch (error: any) {
    toast.add({
      title: 'Error',
      description: error.statusMessage || 'Failed to delete company',
      color: 'error'
    })
  } finally {
    isDeleting.value = false
    deleteModalOpen.value = false
    companyToDelete.value = null
  }
}

function cancelDelete() {
  deleteModalOpen.value = false
  companyToDelete.value = null
}
</script>

<template>
  <UDashboardPanel id="companies">
    <template #header>
      <UDashboardNavbar title="Companies">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <UButton to="/companies/new" color="primary" icon="i-lucide-plus">
            New Company
          </UButton>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <UContainer class="py-6">
        <!-- Empty State -->
        <UCard v-if="!pending && companies.length === 0" class="text-center py-12">
          <div class="flex flex-col items-center gap-4">
            <div class="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <UIcon name="i-lucide-building-2" class="text-3xl text-dimmed" />
            </div>
            <div>
              <h3 class="text-lg font-semibold">No companies yet</h3>
              <p class="text-dimmed mt-1">Create your first company to get started</p>
            </div>
            <UButton to="/companies/new" color="primary" icon="i-lucide-plus">
              Create Company
            </UButton>
          </div>
        </UCard>

        <!-- Companies Table -->
        <UCard v-else>
          <template #header>
            <div class="flex items-center justify-between">
              <h2 class="text-lg font-semibold">Your Companies</h2>
              <UButton 
                color="neutral" 
                variant="ghost" 
                icon="i-lucide-refresh-cw"
                :loading="pending"
                @click="refresh()"
              />
            </div>
          </template>
          
          <UTable
            :data="companies"
            :columns="columns"
            :loading="pending"
            class="w-full"
          />
        </UCard>
      </UContainer>
    </template>
  </UDashboardPanel>

  <!-- Delete Confirmation Modal -->
  <UModal v-model:open="deleteModalOpen" title="Delete Company">
    <template #body>
      <p class="text-dimmed">
        Are you sure you want to delete <strong>{{ companyToDelete?.name }}</strong>?
        This action cannot be undone.
      </p>
    </template>
    <template #footer>
      <UButton color="neutral" variant="ghost" @click="cancelDelete">
        Cancel
      </UButton>
      <UButton color="error" :loading="isDeleting" @click="confirmDelete">
        Delete Company
      </UButton>
    </template>
  </UModal>
</template>
