<script setup lang="ts">
// This page requires authentication
definePageMeta({
  middleware: ['auth']
})

const { user } = useUserSession()
</script>

<template>
  <UDashboardPage>
    <UDashboardPanel grow>
      <UDashboardNavbar title="Dashboard">
        <template #right>
          <UButton
            icon="i-lucide-plus"
            size="md"
            class="hidden sm:flex"
            to="/companies/new"
          >
            New Company
          </UButton>
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar>
        <template #left>
          <p class="text-sm text-muted">
            Welcome back, {{ user?.name }}
          </p>
        </template>
      </UDashboardToolbar>

      <UContainer class="py-6">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <!-- Welcome Card -->
          <UCard>
            <template #header>
              <h2 class="text-lg font-semibold">Welcome Back!</h2>
            </template>
            <p class="text-muted">
              You're logged in as <strong>{{ user?.email }}</strong>
            </p>
            <template #footer>
              <p class="text-xs text-dimmed">
                User ID: {{ user?.id }}
              </p>
            </template>
          </UCard>

          <!-- Quick Actions -->
          <UCard>
            <template #header>
              <h2 class="text-lg font-semibold">Quick Actions</h2>
            </template>
            <div class="space-y-2">
              <UButton to="/companies" block color="primary">
                <UIcon name="i-lucide-building-2" class="mr-2" />
                Manage Companies
              </UButton>
            </div>
          </UCard>

          <!-- Status Card -->
          <UCard>
            <template #header>
              <h2 class="text-lg font-semibold">Status</h2>
            </template>
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-check-circle" class="text-success" />
              <span>Authenticated</span>
            </div>
            <p class="text-sm text-dimmed mt-2">
              Session is active
            </p>
          </UCard>
        </div>
      </UContainer>
    </UDashboardPanel>
  </UDashboardPage>
</template>
