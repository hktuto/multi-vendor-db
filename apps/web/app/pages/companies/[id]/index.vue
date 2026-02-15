<script setup lang="ts">
definePageMeta({
  middleware: ['auth']
})

const route = useRoute()
const router = useRouter()
const toast = useToast()

const companyId = route.params.id as string

const { data, pending, refresh } = await useFetch(`/api/companies/${companyId}`)
const company = computed(() => data.value?.company)

// Redirect if not found
watch(() => company.value, (val) => {
  if (!pending.value && !val) {
    toast.add({
      title: 'Company not found',
      description: 'The company you are looking for does not exist',
      color: 'error'
    })
    router.push('/companies')
  }
})

const canManage = computed(() => {
  if (!company.value) return false
  return company.value.myRole === 'owner' || company.value.myRole === 'admin'
})

const isOwner = computed(() => company.value?.myRole === 'owner')

// Navigation items for secondary nav
const navItems = computed(() => [
  { label: 'General', to: `/companies/${companyId}` },
  { label: 'Members', to: `/companies/${companyId}/members` }
])

// Edit form
const editForm = reactive({
  name: '',
  settings: {
    timezone: 'UTC',
    dateFormat: 'YYYY-MM-DD',
    defaultLanguage: 'en',
  }
})

const isEditing = ref(false)
const isSaving = ref(false)
const editErrors = reactive<Record<string, string>>({})

watch(() => company.value, (val) => {
  if (val) {
    editForm.name = val.name
    editForm.settings = {
      timezone: val.settings?.timezone || 'UTC',
      dateFormat: val.settings?.dateFormat || 'YYYY-MM-DD',
      defaultLanguage: val.settings?.defaultLanguage || 'en',
    }
  }
}, { immediate: true })

function validateEdit(): boolean {
  editErrors.name = ''
  
  if (!editForm.name.trim()) {
    editErrors.name = 'Company name is required'
  } else if (editForm.name.length > 255) {
    editErrors.name = 'Company name must be less than 255 characters'
  }
  
  return !editErrors.name
}

async function saveChanges() {
  if (!validateEdit()) return
  
  isSaving.value = true
  
  try {
    await $fetch(`/api/companies/${companyId}`, {
      method: 'PUT',
      body: {
        name: editForm.name.trim(),
        settings: editForm.settings
      }
    })
    
    toast.add({
      title: 'Settings saved',
      description: 'Company settings have been updated',
      color: 'success'
    })
    
    isEditing.value = false
    await refresh()
  } catch (error: any) {
    toast.add({
      title: 'Error',
      description: error.statusMessage || 'Failed to save changes',
      color: 'error'
    })
  } finally {
    isSaving.value = false
  }
}

function cancelEdit() {
  if (company.value) {
    editForm.name = company.value.name
    editForm.settings = {
      timezone: (company.value.settings as any)?.timezone || 'UTC',
      dateFormat: (company.value.settings as any)?.dateFormat || 'YYYY-MM-DD',
      defaultLanguage: (company.value.settings as any)?.defaultLanguage || 'en',
    }
  }
  isEditing.value = false
  editErrors.name = ''
}

// Delete
const deleteModalOpen = ref(false)
const isDeleting = ref(false)

async function confirmDelete() {
  isDeleting.value = true
  
  try {
    await $fetch(`/api/companies/${companyId}`, {
      method: 'DELETE'
    })
    
    toast.add({
      title: 'Company deleted',
      description: `${company.value?.name} has been deleted`,
      color: 'success'
    })
    
    router.push('/companies')
  } catch (error: any) {
    toast.add({
      title: 'Error',
      description: error.statusMessage || 'Failed to delete company',
      color: 'error'
    })
  } finally {
    isDeleting.value = false
    deleteModalOpen.value = false
  }
}

const timezones = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Singapore',
  'Asia/Dubai',
  'Australia/Sydney',
  'Pacific/Auckland',
]

const dateFormats = [
  { value: 'YYYY-MM-DD', label: '2024-01-15 (ISO)' },
  { value: 'MM/DD/YYYY', label: '01/15/2024 (US)' },
  { value: 'DD/MM/YYYY', label: '15/01/2024 (EU)' },
  { value: 'DD.MM.YYYY', label: '15.01.2024 (German)' },
]

const languages = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'zh', label: 'Chinese' },
  { value: 'ja', label: 'Japanese' },
]
</script>

<template>
  <UDashboardPanel id="company-settings">
    <template #header>
      <UDashboardNavbar :title="company?.name || 'Company Settings'">
        <template #leading>
          <UButton color="neutral" variant="ghost" icon="i-lucide-arrow-left" to="/companies" />
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar>
        <template #left>
          <div class="flex items-center gap-2">
            <UBadge v-if="company?.myRole" variant="soft" :color="company.myRole === 'owner' ? 'warning' : 'primary'">
              {{ company.myRole }}
            </UBadge>
            <span class="text-sm text-dimmed">@{{ company?.slug }}</span>
          </div>
        </template>
      </UDashboardToolbar>

      <!-- Secondary Navigation -->
      <UDashboardToolbar class="border-b border-default">
        <template #left>
          <UNavigationMenu
            :items="navItems"
            orientation="horizontal"
            variant="link"
            class="-mx-2"
          />
        </template>
      </UDashboardToolbar>
    </template>

    <template #body>
      <UContainer v-if="company" class="py-6">
        <div class="max-w-3xl">
          <div class="flex items-center justify-between mb-6">
            <UButton 
              v-if="canManage && !isEditing"
              color="primary" 
              variant="ghost" 
              icon="i-lucide-pencil"
              @click="isEditing = true"
            >
              Edit Settings
            </UButton>
          </div>

          <!-- View Mode -->
          <template v-if="!isEditing">
            <div class="space-y-6">
              <!-- Company Info Card -->
              <UCard>
                <template #header>
                  <h3 class="font-semibold">Company Information</h3>
                </template>
                
                <div class="space-y-4">
                  <div class="grid grid-cols-2 gap-4">
                    <div>
                      <label class="text-sm text-dimmed">Name</label>
                      <p class="font-medium">{{ company.name }}</p>
                    </div>
                    <div>
                      <label class="text-sm text-dimmed">Slug</label>
                      <p class="font-mono text-sm">@{{ company.slug }}</p>
                    </div>
                    <div>
                      <label class="text-sm text-dimmed">Created</label>
                      <p>{{ new Date(company.createdAt).toLocaleDateString() }}</p>
                    </div>
                    <div>
                      <label class="text-sm text-dimmed">Owner</label>
                      <div class="flex items-center gap-2">
                        <UAvatar :src="company.owner?.avatarUrl" :alt="company.owner?.name" size="xs" />
                        <span>{{ company.owner?.name }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </UCard>

              <!-- Settings Card -->
              <UCard>
                <template #header>
                  <h3 class="font-semibold">Settings</h3>
                </template>
                
                <div class="grid grid-cols-3 gap-4">
                  <div>
                    <label class="text-sm text-dimmed">Timezone</label>
                    <p class="font-medium">{{ company.settings?.timezone || 'UTC' }}</p>
                  </div>
                  <div>
                    <label class="text-sm text-dimmed">Date Format</label>
                    <p class="font-medium">{{ company.settings?.dateFormat || 'YYYY-MM-DD' }}</p>
                  </div>
                  <div>
                    <label class="text-sm text-dimmed">Language</label>
                    <p class="font-medium">{{ company.settings?.defaultLanguage || 'en' }}</p>
                  </div>
                </div>
              </UCard>

              <!-- Danger Zone -->
              <UCard v-if="isOwner" class="border-error">
                <template #header>
                  <div class="flex items-center gap-2 text-error">
                    <UIcon name="i-lucide-alert-triangle" />
                    <h3 class="font-semibold">Danger Zone</h3>
                  </div>
                </template>
                
                <div class="flex items-center justify-between">
                  <div>
                    <p class="font-medium">Delete this company</p>
                    <p class="text-sm text-dimmed">This action cannot be undone</p>
                  </div>
                  <UButton color="error" variant="outline" @click="deleteModalOpen = true">
                    Delete Company
                  </UButton>
                </div>
              </UCard>
            </div>
          </template>

          <!-- Edit Mode -->
          <form v-else @submit.prevent="saveChanges" class="space-y-6">
            <UCard>
              <template #header>
                <div class="flex items-center justify-between">
                  <h3 class="font-semibold">Edit Company</h3>
                </div>
              </template>
              
              <div class="space-y-4">
                <UFormField label="Company Name" :error="editErrors.name" required>
                  <UInput v-model="editForm.name" class="w-full" />
                </UFormField>
              </div>
            </UCard>

            <UCard>
              <template #header>
                <h3 class="font-semibold">Settings</h3>
              </template>
              
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <UFormField label="Timezone">
                  <USelect v-model="editForm.settings.timezone" :items="timezones" class="w-full" />
                </UFormField>

                <UFormField label="Date Format">
                  <USelect 
                    v-model="editForm.settings.dateFormat" 
                    :items="dateFormats.map(f => ({ label: f.label, value: f.value }))" 
                    class="w-full" 
                  />
                </UFormField>

                <UFormField label="Language">
                  <USelect 
                    v-model="editForm.settings.defaultLanguage" 
                    :items="languages.map(l => ({ label: l.label, value: l.value }))" 
                    class="w-full" 
                  />
                </UFormField>
              </div>
            </UCard>

            <div class="flex items-center gap-4">
              <UButton type="submit" color="primary" :loading="isSaving">
                Save Changes
              </UButton>
              <UButton color="neutral" variant="ghost" @click="cancelEdit">
                Cancel
              </UButton>
            </div>
          </form>
        </div>
      </UContainer>

      <!-- Loading State -->
      <UContainer v-if="pending" class="py-6 max-w-3xl">
        <div class="space-y-6">
          <USkeleton class="h-40" />
          <USkeleton class="h-32" />
        </div>
      </UContainer>
    </template>
  </UDashboardPanel>

  <!-- Delete Confirmation Modal -->
  <UModal v-model:open="deleteModalOpen" title="Delete Company">
    <template #body>
      <p class="text-dimmed">
        Are you sure you want to delete <strong>{{ company?.name }}</strong>?
        This action cannot be undone.
      </p>
    </template>
    <template #footer>
      <UButton color="neutral" variant="ghost" @click="deleteModalOpen = false">
        Cancel
      </UButton>
      <UButton color="error" :loading="isDeleting" @click="confirmDelete">
        Delete Company
      </UButton>
    </template>
  </UModal>
</template>
