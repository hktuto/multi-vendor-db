<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const toast = useToast()
const { loggedIn } = useUserSession()

const token = route.params.token as string

const { data: inviteData, pending: invitePending, error: inviteError } = 
  await useFetch(`/api/invites/${token}`)

const invite = computed(() => inviteData.value?.invite)

const isAccepting = ref(false)

async function acceptInvite() {
  isAccepting.value = true
  
  try {
    const response = await $fetch(`/api/invites/${token}`, {
      method: 'POST'
    })
    
    toast.add({
      title: 'Welcome!',
      description: `You have joined ${response.company.name}`,
      color: 'success'
    })
    
    // Redirect to the company
    router.push(`/companies/${response.company.id}`)
  } catch (error: any) {
    toast.add({
      title: 'Error',
      description: error.statusMessage || 'Failed to accept invite',
      color: 'error'
    })
  } finally {
    isAccepting.value = false
  }
}

function redirectToSignup() {
  router.push(`/signup?invite=${token}`)
}

function redirectToLogin() {
  router.push(`/login?invite=${token}`)
}
</script>

<template>
  <UDashboardPanel id="invite">
    <template #header>
      <UDashboardNavbar title="Invitation">
        <template #leading>
          <UButton color="neutral" variant="ghost" icon="i-lucide-arrow-left" to="/companies" />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <UContainer class="py-12 max-w-md">
        <!-- Loading -->
        <div v-if="invitePending" class="text-center">
          <UIcon name="i-lucide-loader-2" class="animate-spin text-4xl text-primary" />
          <p class="mt-4 text-dimmed">Validating invitation...</p>
        </div>

        <!-- Error -->
        <UCard v-else-if="inviteError" class="text-center">
          <template #header>
            <div class="flex flex-col items-center gap-4">
              <div class="w-16 h-16 rounded-full bg-error/10 flex items-center justify-center">
                <UIcon name="i-lucide-x-circle" class="text-3xl text-error" />
              </div>
              <h2 class="text-xl font-semibold">Invalid Invitation</h2>
            </div>
          </template>
          
          <p class="text-dimmed">
            {{ inviteError.statusMessage || 'This invitation link is invalid or has expired.' }}
          </p>
          
          <template #footer>
            <UButton to="/companies" color="primary" block>
              Go to Companies
            </UButton>
          </template>
        </UCard>

        <!-- Valid Invite -->
        <UCard v-else-if="invite" class="text-center">
          <template #header>
            <div class="flex flex-col items-center gap-4">
              <div class="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <UIcon name="i-lucide-mail" class="text-3xl text-primary" />
              </div>
              <h2 class="text-xl font-semibold">You're Invited!</h2>
            </div>
          </template>
          
          <div class="space-y-4">
            <p>
              <strong>{{ invite.invitedBy?.name }}</strong> has invited you to join
            </p>
            
            <div class="py-4 px-6 bg-muted rounded-lg">
              <h3 class="text-lg font-semibold">{{ invite.company?.name }}</h3>
              <p class="text-sm text-dimmed">@{{ invite.company?.slug }}</p>
            </div>

            <div class="flex items-center justify-center gap-2">
              <UBadge variant="soft" :color="invite.role === 'admin' ? 'warning' : 'primary'">
                {{ invite.role }}
              </UBadge>
            </div>
          </div>
          
          <template #footer>
            <div class="space-y-3">
              <!-- Logged in: Show Accept button -->
              <template v-if="loggedIn">
                <UButton 
                  color="primary" 
                  block 
                  :loading="isAccepting"
                  @click="acceptInvite"
                >
                  Accept Invitation
                </UButton>
                
                <UButton to="/companies" color="neutral" variant="ghost" block>
                  Decline
                </UButton>
              </template>
              
              <!-- Not logged in: Show Create Account button -->
              <template v-else>
                <UButton 
                  color="primary" 
                  block 
                  @click="redirectToSignup"
                >
                  Create Account to Join
                </UButton>
                
                <p class="text-center text-sm text-dimmed">
                  Already have an account? 
                  <UButton variant="link" @click="redirectToLogin">
                    Sign in
                  </UButton>
                </p>
              </template>
            </div>
          </template>
        </UCard>
      </UContainer>
    </template>
  </UDashboardPanel>
</template>
