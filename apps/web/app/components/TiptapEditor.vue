<script setup lang="ts">
/**
 * TiptapEditor - A rich text editor component using TipTap
 * 
 * Features:
 * - View mode (rendered HTML)
 * - Edit mode (full editor toolbar)
 * - Click to edit
 * - Save/Cancel
 */
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'

const props = defineProps<{
  modelValue: string
  placeholder?: string
  disabled?: boolean
  editable?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'save': [value: string]
  'cancel': []
}>()

// State
const isEditing = ref(false)
const editValue = ref('')

// Create editor
const editor = useEditor({
  extensions: [
    StarterKit,
    Placeholder.configure({
      placeholder: props.placeholder || 'Write something...',
    }),
  ],
  content: props.modelValue,
  editable: false,
  onUpdate: ({ editor }) => {
    editValue.value = editor.getHTML()
  },
})

// Watch for external changes
watch(() => props.modelValue, (newValue) => {
  if (editor.value && !isEditing.value) {
    editor.value.commands.setContent(newValue)
  }
})

// Start editing
function startEdit() {
  if (props.disabled || !props.editable) return
  
  isEditing.value = true
  editValue.value = props.modelValue
  
  nextTick(() => {
    editor.value?.setEditable(true)
    editor.value?.commands.focus()
  })
}

// Save changes
function save() {
  const content = editor.value?.getHTML() || ''
  emit('update:modelValue', content)
  emit('save', content)
  
  isEditing.value = false
  editor.value?.setEditable(false)
}

// Cancel editing
function cancel() {
  isEditing.value = false
  editValue.value = props.modelValue
  editor.value?.commands.setContent(props.modelValue)
  editor.value?.setEditable(false)
  emit('cancel')
}

// Formatting commands
function toggleBold() {
  editor.value?.chain().focus().toggleBold().run()
}

function toggleItalic() {
  editor.value?.chain().focus().toggleItalic().run()
}

function toggleHeading(level: 1 | 2 | 3) {
  editor.value?.chain().focus().toggleHeading({ level }).run()
}

function toggleBulletList() {
  editor.value?.chain().focus().toggleBulletList().run()
}

function toggleOrderedList() {
  editor.value?.chain().focus().toggleOrderedList().run()
}

// Cleanup
onBeforeUnmount(() => {
  editor.value?.destroy()
})

defineExpose({
  startEdit,
  save,
  cancel,
  isEditing: computed(() => isEditing.value),
  editor
})
</script>

<template>
  <div class="tiptap-editor">
    <!-- Toolbar (Edit Mode Only) -->
    <div v-if="isEditing && editor" class="editor-toolbar">
      <div class="toolbar-group">
        <UButton
          size="xs"
          color="neutral"
          variant="ghost"
          icon="i-lucide-bold"
          :class="{ 'bg-primary-100': editor.isActive('bold') }"
          @click="toggleBold"
        />
        <UButton
          size="xs"
          color="neutral"
          variant="ghost"
          icon="i-lucide-italic"
          :class="{ 'bg-primary-100': editor.isActive('italic') }"
          @click="toggleItalic"
        />
      </div>

      <div class="toolbar-divider" />

      <div class="toolbar-group">
        <UButton
          size="xs"
          color="neutral"
          variant="ghost"
          icon="i-lucide-heading-1"
          :class="{ 'bg-primary-100': editor.isActive('heading', { level: 1 }) }"
          @click="toggleHeading(1)"
        />
        <UButton
          size="xs"
          color="neutral"
          variant="ghost"
          icon="i-lucide-heading-2"
          :class="{ 'bg-primary-100': editor.isActive('heading', { level: 2 }) }"
          @click="toggleHeading(2)"
        />
      </div>

      <div class="toolbar-divider" />

      <div class="toolbar-group">
        <UButton
          size="xs"
          color="neutral"
          variant="ghost"
          icon="i-lucide-list"
          :class="{ 'bg-primary-100': editor.isActive('bulletList') }"
          @click="toggleBulletList"
        />
        <UButton
          size="xs"
          color="neutral"
          variant="ghost"
          icon="i-lucide-list-ordered"
          :class="{ 'bg-primary-100': editor.isActive('orderedList') }"
          @click="toggleOrderedList"
        />
      </div>

      <div class="flex-1" />

      <!-- Save/Cancel -->
      <div class="toolbar-group">
        <UButton
          size="xs"
          color="neutral"
          variant="ghost"
          icon="i-lucide-x"
          @click="cancel"
        >
          Cancel
        </UButton>
        <UButton
          size="xs"
          color="primary"
          icon="i-lucide-check"
          @click="save"
        >
          Save
        </UButton>
      </div>
    </div>

    <!-- Editor Content -->
    <div
      :class="[
        'editor-content',
        { 'editing': isEditing, 'clickable': !isEditing && !disabled && editable }
      ]"
      @click="!isEditing && startEdit()"
    >
      <EditorContent :editor="editor" />

      <!-- Edit Hint -->
      <div v-if="!isEditing && !disabled && editable && !modelValue" class="edit-hint">
        <UIcon name="i-lucide-pencil" class="w-4 h-4" />
        <span>Click to edit</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tiptap-editor {
  border: 1px solid var(--color-gray-200);
  border-radius: 8px;
  overflow: hidden;
}

.dark .tiptap-editor {
  border-color: var(--color-gray-700);
}

.editor-toolbar {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 12px;
  background: var(--color-gray-50);
  border-bottom: 1px solid var(--color-gray-200);
}

.dark .editor-toolbar {
  background: var(--color-gray-800);
  border-color: var(--color-gray-700);
}

.toolbar-group {
  display: flex;
  align-items: center;
  gap: 2px;
}

.toolbar-divider {
  width: 1px;
  height: 20px;
  background: var(--color-gray-300);
  margin: 0 4px;
}

.dark .toolbar-divider {
  background: var(--color-gray-600);
}

.editor-content {
  padding: 12px 16px;
  min-height: 100px;
}

.editor-content.clickable {
  cursor: pointer;
}

.editor-content.clickable:hover {
  background: var(--color-gray-50);
}

.dark .editor-content.clickable:hover {
  background: var(--color-gray-800);
}

.editor-content.editing {
  cursor: text;
}

.edit-hint {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  padding: 8px;
  color: var(--color-gray-500);
  font-size: 12px;
  background: var(--color-gray-100);
  border-radius: 4px;
}

.dark .edit-hint {
  color: var(--color-gray-400);
  background: var(--color-gray-800);
}

/* TipTap Content Styles */
:deep(.ProseMirror) {
  outline: none;
  min-height: 80px;
}

:deep(.ProseMirror p) {
  margin: 0 0 0.5em 0;
}

:deep(.ProseMirror p:last-child) {
  margin-bottom: 0;
}

:deep(.ProseMirror h1) {
  font-size: 1.5em;
  font-weight: 600;
  margin: 0 0 0.5em 0;
}

:deep(.ProseMirror h2) {
  font-size: 1.25em;
  font-weight: 600;
  margin: 0 0 0.5em 0;
}

:deep(.ProseMirror ul),
:deep(.ProseMirror ol) {
  margin: 0 0 0.5em 0;
  padding-left: 1.5em;
}

:deep(.ProseMirror li) {
  margin-bottom: 0.25em;
}

:deep(.ProseMirror p.is-editor-empty:first-child::before) {
  content: attr(data-placeholder);
  float: left;
  color: var(--color-gray-400);
  pointer-events: none;
  height: 0;
}

.dark :deep(.ProseMirror p.is-editor-empty:first-child::before) {
  color: var(--color-gray-500);
}
</style>