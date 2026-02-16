<script setup lang="ts">
definePageMeta({
  middleware: ['auth']
})

const { user: sessionUser } = useUserSession()
const userSync = useUserSync()

// Start syncing user data from Electric
onMounted(async () => {
  await userSync.sync()
})

// Use synced user data if available, fallback to session
const user = computed(() => userSync.data.value[0] || sessionUser.value)
</script>

<template>
  <UDashboardPanel id="dashboard">
    <template #header>
      <UDashboardNavbar title="Dashboard">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
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
          <p class="text-sm text-dimmed">
            Welcome back, {{ user?.name }}
          </p>
        </template>
      </UDashboardToolbar>
    </template>

    <template #body>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
        <!-- Welcome Card -->
        <UCard>
          <template #header>
            <h2 class="text-lg font-semibold">Welcome Back!</h2>
          </template>
          <p class="text-dimmed">
            You're logged in as <strong>{{ user?.email }}</strong>
          </p>
          <template #footer>
            <p class="text-xs text-muted">
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
    </template>
  </UDashboardPanel>
</template>
