<script setup lang="ts">const props = defineProps<{
  open: boolean
  title: string
  icon: string
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  confirm: [name: string, config?: Record<string, any>]
}>()

const name = ref('')

const isOpen = computed({
  get: () => props.open,
  set: (val) => emit('update:open', val)
})

watch(() => props.open, (val) => {
  if (val) {
    name.value = ''
    nextTick(() => {
      // Focus input
    })
  }
})

function handleConfirm() {
  if (!name.value.trim()) return
  emit('confirm', name.value.trim())
  name.value = ''
  isOpen.value = false
}

function handleClose() {
  name.value = ''
  isOpen.value = false
}
</script>

<template>
  <UModal v-model:open="isOpen" :title="title" @close="handleClose">
    <template #body>
      <UFormField label="Name" required>
        <UInput
          v-model="name"
          placeholder="Enter name"
          autofocus
          @keyup.enter="handleConfirm"
        />
      </UFormField>
    </template>
    <template #footer>
      <UButton color="neutral" variant="ghost" @click="handleClose">
        Cancel
      </UButton>
      <UButton color="primary" :disabled="!name.trim()" @click="handleConfirm">
        Create
      </UButton>
    </template>
  </UModal>
</template>
