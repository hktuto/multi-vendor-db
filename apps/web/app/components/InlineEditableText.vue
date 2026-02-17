<script setup lang="ts">
/**
 * InlineEditableText - A reusable component for in-place text editing
 * 
 * Features:
 * - Double-click to edit
 * - Click outside or press Enter to save
 * - Press Escape to cancel
 * - Auto-focus on input
 * - Loading state support
 */

const props = defineProps<{
  modelValue: string
  placeholder?: string
  disabled?: boolean
  loading?: boolean
  inputClass?: string
  textClass?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'save': [value: string]
  'cancel': []
}>()

// State
const isEditing = ref(false)
const editValue = ref('')
const inputRef = ref<HTMLInputElement | null>(null)

// Start editing on double click
function startEdit() {
  if (props.disabled || props.loading) return
  
  isEditing.value = true
  editValue.value = props.modelValue
  
  // Focus input after DOM update
  nextTick(() => {
    inputRef.value?.focus()
    inputRef.value?.select()
  })
}

// Save changes
async function save() {
  const trimmed = editValue.value.trim()
  
  // If empty and has placeholder, cancel
  if (!trimmed && props.placeholder) {
    cancel()
    return
  }
  
  // If no change, just exit edit mode
  if (trimmed === props.modelValue) {
    isEditing.value = false
    return
  }
  
  emit('update:modelValue', trimmed)
  emit('save', trimmed)
  isEditing.value = false
}

// Cancel editing
function cancel() {
  isEditing.value = false
  editValue.value = props.modelValue
  emit('cancel')
}

// Handle keyboard events
function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter') {
    event.preventDefault()
    save()
  } else if (event.key === 'Escape') {
    event.preventDefault()
    cancel()
  }
}

// Handle click outside
function onBlur() {
  // Small delay to allow other click handlers to run
  setTimeout(() => {
    save()
  }, 150)
}

// Expose methods for parent control
defineExpose({
  startEdit,
  save,
  cancel,
  isEditing: computed(() => isEditing.value)
})
</script>

<template>
  <div class="inline-editable-text">
    <!-- Display Mode -->
    <span
      v-if="!isEditing"
      :class="['editable-text', textClass]"
      @dblclick.prevent="startEdit"
      :title="disabled ? '' : 'Double-click to edit'"
    >
      <slot name="display" :value="modelValue">
        {{ modelValue || placeholder || '' }}
      </slot>
    </span>
    
    <!-- Edit Mode -->
    <div v-else class="edit-mode">
      <UInput
        ref="inputRef"
        v-model="editValue"
        size="xs"
        :loading="loading"
        :class="['inline-input', inputClass]"
        @keydown="onKeydown"
        @blur="onBlur"
      />
    </div>
  </div>
</template>

<style scoped>
.inline-editable-text {
  display: inline-flex;
  align-items: center;
  min-width: 0;
  flex: 1;
}

.editable-text {
  cursor: text;
  padding: 2px 4px;
  border-radius: 4px;
  transition: background-color 0.15s;
  min-width: 20px;
  display: inline-block;
}

.editable-text:hover:not(.disabled) {
  background-color: var(--color-gray-100);
}

.editable-text.disabled {
  cursor: default;
}

.edit-mode {
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
}

.inline-input {
  width: 100%;
  min-width: 80px;
}

.inline-input :deep(input) {
  padding: 2px 6px;
  font-size: inherit;
}
</style>