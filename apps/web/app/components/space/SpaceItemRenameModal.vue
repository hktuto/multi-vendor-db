<script setup lang="ts">import type { SyncedSpaceItem } from '~/composables/useSpaces'

const props = defineProps<{
  open: boolean
  item: SyncedSpaceItem | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  confirm: [newName: string]
}>()

const name = ref('')

const isOpen = computed({
  get: () => props.open,
  set: (val) => emit('update:open', val)
})

watch(() => props.item, (item) => {
  if (item) {
    name.value = item.name
  }
}, { immediate: true })

watch(() => props.open, (val) => {
  if (val && props.item) {
    name.value = props.item.name
  }
})

function handleConfirm() {
  if (!name.value.trim() || name.value.trim() === props.item?.name) {
    isOpen.value = false
    return
  }
  emit('confirm', name.value.trim())
  isOpen.value = false
}

function handleClose() {
  isOpen.value = false
}
</script>

<template>
  <UModal v-model:open="isOpen" title="Rename Item" @close="handleClose">
    <template #body>
      <UFormField label="Name" required>
        <UInput
          v-model="name"
          placeholder="Enter new name"
          autofocus
          @keyup.enter="handleConfirm"
        />
      </UFormField>
    </template>
    <template #footer>
      <UButton color="neutral" variant="ghost" @click="handleClose">
        Cancel
      </UButton>
      <UButton color="primary" :disabled="!name.trim() || name.trim() === item?.name" @click="handleConfirm">
        Rename
      </UButton>
    </template>
  </UModal>
</template>
