<script setup>
import { computed, ref } from 'vue'
import { storage } from '../../lib/firebase'
import { getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage'

const props = defineProps({
  modelValue: { type: String, default: '' },
  folder: { type: String, default: 'uploads' },
  entityId: { type: String, default: '' },
  label: { type: String, default: 'Imagine' },
  storeAs: {
    type: String,
    default: 'storage',
    validator: (v) => ['storage', 'dataUrl', 'auto'].includes(v),
  },
})

const emit = defineEmits(['update:modelValue'])

const uploading = ref(false)
const error = ref('')
const inputEl = ref(null)
const pendingFile = ref(null)

const hasStorage = computed(() => Boolean(storage))

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error || new Error('Nu am putut citi fișierul.'))
    reader.onload = () => resolve(String(reader.result || ''))
    reader.readAsDataURL(file)
  })
}

function shouldFallbackToDataUrl(err) {
  const msg = String(err?.message || err || '').toLowerCase()
  const code = String(err?.code || '').toLowerCase()
  return (
    msg.includes('cors') ||
    msg.includes('cross-origin') ||
    msg.includes('blocked') ||
    msg.includes('network') ||
    msg.includes('failed to fetch') ||
    msg.includes('load failed') ||
    code.includes('storage')
  )
}

function openPicker() {
  error.value = ''
  if (uploading.value) return
  inputEl.value?.click?.()
}

function onFileChange(e) {
  const f = e?.target?.files?.[0] || null
  pendingFile.value = f
}

function clearPendingFile() {
  pendingFile.value = null
  if (inputEl.value) inputEl.value.value = ''
}

async function uploadSelected(options = {}) {
  error.value = ''
  if (!pendingFile.value) {
    return null
  }

  const mode = String(options?.storeAs || props.storeAs || 'storage')

  if (mode === 'dataUrl') {
    uploading.value = true
    try {
      const dataUrl = await fileToDataUrl(pendingFile.value)
      if (!dataUrl) throw new Error('Conversia imaginii a eșuat.')
      emit('update:modelValue', dataUrl)
      clearPendingFile()
      return dataUrl
    } catch (e) {
      error.value = e?.message || String(e)
      throw e
    } finally {
      uploading.value = false
    }
  }

  if (mode === 'auto' && !hasStorage.value) {
    // No Storage available; fall back to RTDB-friendly base64 string.
    uploading.value = true
    try {
      const dataUrl = await fileToDataUrl(pendingFile.value)
      if (!dataUrl) throw new Error('Conversia imaginii a eșuat.')
      emit('update:modelValue', dataUrl)
      clearPendingFile()
      return dataUrl
    } catch (e) {
      error.value = e?.message || String(e)
      throw e
    } finally {
      uploading.value = false
    }
  }

  if (!hasStorage.value) {
    error.value = 'Storage nu este configurat.'
    throw new Error(error.value)
  }

  uploading.value = true
  try {
    const safeName = String(pendingFile.value.name || 'image').replace(/[^a-zA-Z0-9._-]/g, '_')
    const eid = String(options?.entityId ?? props.entityId ?? '').trim()
    const base = eid ? `${props.folder}/${eid}` : props.folder
    const path = `${base}/${Date.now()}_${safeName}`
    const r = storageRef(storage, path)
    await uploadBytes(r, pendingFile.value)
    const url = await getDownloadURL(r)
    emit('update:modelValue', url)
    clearPendingFile()
    return url
  } catch (e) {
    if (mode === 'auto' && shouldFallbackToDataUrl(e)) {
      try {
        const dataUrl = await fileToDataUrl(pendingFile.value)
        if (!dataUrl) throw new Error('Conversia imaginii a eșuat.')
        emit('update:modelValue', dataUrl)
        clearPendingFile()
        return dataUrl
      } catch (e2) {
        error.value = e2?.message || String(e2)
        throw e2
      }
    }

    error.value = e?.message || String(e)
    throw e
  } finally {
    uploading.value = false
  }
}

defineExpose({
  uploadSelected,
  clearPendingFile,
  hasPendingFile: computed(() => Boolean(pendingFile.value)),
})
</script>

<template>
  <div class="stack">
    <div class="row sp-between">
      <p class="muted">{{ label }}</p>
      <span v-if="uploading" class="muted">Se încarcă…</span>
    </div>

    <img v-if="modelValue" class="preview" :src="modelValue" alt="" />

    <div class="row">
      <input ref="inputEl" class="hiddenInput" type="file" accept="image/*" :disabled="uploading" @change="onFileChange" />
      <v-btn color="cyan" variant="outlined" :disabled="uploading" size="small" @click="openPicker">Încarcă imagine</v-btn>
    </div>

    <p v-if="pendingFile" class="filename muted">{{ pendingFile.name }}</p>

    <p v-if="error" class="error">{{ error }}</p>
  </div>
</template>

<style scoped>
.preview {
  width: 100%;
  max-height: 180px;
  object-fit: cover;
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,.08);
}
.hiddenInput {
  display: none;
}
.filename {
  margin: 0;
  font-size: .9rem;
}
.error {
  margin: 0;
  color: #fca5a5;
}
</style>
