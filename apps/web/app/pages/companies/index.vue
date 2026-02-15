<script setup lang="ts">
definePageMeta({
  middleware: ['auth']
})
</script>

<template>
  <UDashboardPage>
    <UDashboardPanel grow>
      <UDashboardNavbar title="Companies" />
      
      <UContainer class="py-6">
        <UCard>
          <template #header>
            <h2 class="text-lg font-semibold">Your Companies</h2>
          </template>
          <p class="text-muted">
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
    </UDashboardPanel>
  </UDashboardPage>
</template>
