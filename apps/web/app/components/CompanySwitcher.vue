<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

defineProps<{
  collapsed?: boolean
}>()

// Fetch companies
const { data } = await useFetch('/api/companies')
const companies = computed(() => data.value?.companies || [])

const currentCompany = useState<string | null>('currentCompany', () => null)

const selectedCompany = computed(() => {
  const found = companies.value.find(c => c.id === currentCompany.value)
  if (found) {
    return {
      label: found.name,
      avatar: {
        src: `https://ui-avatars.com/api/?name=${encodeURIComponent(found.name)}&background=random`,
        alt: found.name
      }
    }
  }
  
  // Default to first company or show "Select Company"
  if (companies.value.length > 0) {
    const first = companies.value[0]
    currentCompany.value = first.id
    return {
      label: first.name,
      avatar: {
        src: `https://ui-avatars.com/api/?name=${encodeURIComponent(first.name)}&background=random`,
        alt: first.name
      }
    }
  }
  
  return {
    label: 'No Companies',
    avatar: {
      src: 'https://ui-avatars.com/api/?name=No+Company&background=gray',
      alt: 'No Company'
    }
  }
})

const companyItems = computed<DropdownMenuItem[][]>(() => {
  const items: DropdownMenuItem[] = companies.value.map(company => ({
    label: company.name,
    avatar: {
      src: `https://ui-avatars.com/api/?name=${encodeURIComponent(company.name)}&background=random`,
      alt: company.name
    },
    checked: company.id === currentCompany.value,
    onSelect() {
      currentCompany.value = company.id
    }
  }))
  
  return [items, [
    {
      label: 'Create company',
      icon: 'i-lucide-circle-plus',
      to: '/companies/new'
    },
    {
      label: 'Manage companies',
      icon: 'i-lucide-cog',
      to: '/companies'
    }
  ]]
})
</script>

<template>
  <UDropdownMenu
    :items="companyItems"
    :content="{ align: 'center', collisionPadding: 12 }"
    :ui="{ content: collapsed ? 'w-40' : 'w-(--reka-dropdown-menu-trigger-width)' }"
  >
    <UButton
      v-bind="{
        ...selectedCompany,
        label: collapsed ? undefined : selectedCompany?.label,
        trailingIcon: collapsed ? undefined : 'i-lucide-chevrons-up-down'
      }"
      color="neutral"
      variant="ghost"
      block
      :square="collapsed"
      class="data-[state=open]:bg-elevated"
      :class="[!collapsed && 'py-2']"
      :ui="{
        trailingIcon: 'text-dimmed'
      }"
    />
  </UDropdownMenu>
</template>
