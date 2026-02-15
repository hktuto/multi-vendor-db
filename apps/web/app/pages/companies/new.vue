<script setup lang="ts">
definePageMeta({
  middleware: ['auth']
})

const router = useRouter()
const toast = useToast()

const form = reactive({
  name: '',
  slug: ''
})

const isSubmitting = ref(false)
const errors = reactive<Record<string, string>>({})

// Auto-generate slug from name
watch(() => form.name, (name) => {
  if (!form.slug || form.slug === generateSlug(form.name.slice(0, -1))) {
    form.slug = generateSlug(name)
  }
})

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50)
}

function validate(): boolean {
  errors.name = ''
  errors.slug = ''
  
  if (!form.name.trim()) {
    errors.name = 'Company name is required'
  } else if (form.name.length > 255) {
    errors.name = 'Company name must be less than 255 characters'
  }
  
  if (!form.slug.trim()) {
    errors.slug = 'Company slug is required'
  } else if (!/^[a-z0-9-]+$/.test(form.slug)) {
    errors.slug = 'Slug can only contain lowercase letters, numbers, and hyphens'
  } else if (form.slug.length > 255) {
    errors.slug = 'Slug must be less than 255 characters'
  }
  
  return !errors.name && !errors.slug
}

async function onSubmit() {
  if (!validate()) return
  
  isSubmitting.value = true
  
  try {
    const response = await $fetch('/api/companies', {
      method: 'POST',
      body: {
        name: form.name.trim(),
        slug: form.slug.trim()
      }
    })
    
    toast.add({
      title: 'Company created',
      description: `${form.name} has been created successfully`,
      color: 'success'
    })
    
    // Redirect to the new company
    router.push(`/companies/${response.company.id}`)
  } catch (error: any) {
    toast.add({
      title: 'Error',
      description: error.statusMessage || 'Failed to create company',
      color: 'error'
    })
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <UDashboardPanel id="new-company">
    <template #header>
      <UDashboardNavbar title="Create Company">
        <template #leading>
          <UButton color="neutral" variant="ghost" icon="i-lucide-arrow-left" to="/companies" />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <UContainer class="py-6 max-w-2xl">
        <UCard>
          <template #header>
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <UIcon name="i-lucide-building-2" class="text-xl text-primary" />
              </div>
              <div>
                <h2 class="text-lg font-semibold">Create New Company</h2>
                <p class="text-sm text-dimmed">Set up a new company workspace</p>
              </div>
            </div>
          </template>

          <form @submit.prevent="onSubmit" class="space-y-6">
            <UFormField label="Company Name" :error="errors.name" required>
              <UInput
                v-model="form.name"
                placeholder="e.g., Acme Corporation"
                class="w-full"
                autofocus
              />
            </UFormField>

            <UFormField label="Company Slug" :error="errors.slug" required>
              <template #hint>
                <span class="text-xs text-dimmed">Used in URLs</span>
              </template>
              <UInput
                v-model="form.slug"
                placeholder="e.g., acme-corp"
                class="w-full font-mono"
              />
              <template #help>
                <span class="text-xs text-dimmed">
                  Your company URL will be: /companies/{{ form.slug || 'your-slug' }}
                </span>
              </template>
            </UFormField>

            <div class="flex items-center gap-4 pt-4">
              <UButton type="submit" color="primary" :loading="isSubmitting">
                <UIcon name="i-lucide-plus" class="mr-2" />
                Create Company
              </UButton>
              <UButton color="neutral" variant="ghost" to="/companies">
                Cancel
              </UButton>
            </div>
          </form>
        </UCard>
      </UContainer>
    </template>
  </UDashboardPanel>
</template>
