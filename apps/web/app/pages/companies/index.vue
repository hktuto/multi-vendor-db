<script setup lang="ts">
definePageMeta({
  middleware: ['auth']
})
</script>

<template>
  <UDashboardPanel id="companies">
    <template #header>
      <UDashboardNavbar title="Companies">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>
    
    <template #body>
      <UContainer class="py-6">
        <UCard>
          <template #header>
            <h2 class="text-lg font-semibold">Your Companies</h2>
          </template>
          <p class="text-dimmed">
            Company management will be implemented in the next feature.
          </p>
          <template #footer>
            <UButton to="/companies/new" color="primary">
              <UIcon name="i-lucide-plus" class="mr-2" />
              Create Company
            </UButton>
          </template>
        </UCard>
      </UContainer>
    </template>
  </UDashboardPanel>
</template>
