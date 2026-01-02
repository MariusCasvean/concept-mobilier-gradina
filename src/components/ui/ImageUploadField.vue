<script setup>
import { computed, ref } from 'vue'
import { storage } from '../../lib/firebase'
import { deleteObject, getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage'

const props = defineProps({
  modelValue: { type: [String, Array], default: '' },
  folder: { type: String, default: 'uploads' },
  entityId: { type: String, default: '' },
  label: { type: String, default: 'Imagine' },
  multiple: { type: Boolean, default: false },
  showPreview: { type: Boolean, default: true },
  allowDelete: { type: Boolean, default: false },
  allowPrimary: { type: Boolean, default: false },
  deleteFromStorage: { type: Boolean, default: true },
  storeAs: {
    type: String,
    default: 'storage',
    validator: (v) => ['storage', 'dataUrl', 'auto'].includes(v),
  },
})

const emit = defineEmits(['update:modelValue', 'deleted'])

const uploading = ref(false)
const optimizing = ref(false)
const error = ref('')
const confirmOpen = ref(false)
const confirmUrl = ref('')
const confirmLoading = ref(false)
const inputEl = ref(null)
const pendingFile = ref(null)
const pendingFiles = ref([])
const pendingFilesObjectUrls = ref([])
const optimizedFile = ref(null)
const optimizedObjectUrl = ref('')
let optimizePromise = null

const hasStorage = computed(() => Boolean(storage))

const OPT_MAX_DIM = 1920
const OPT_TARGET_BYTES = 500 * 1024
const OPT_QUALITY_START = 0.82
const OPT_QUALITY_MIN = 0.45

const isMultiple = computed(() => Boolean(props.multiple))

function normalizeUrlList(value) {
  if (!value) return []
  if (Array.isArray(value)) return value.map((x) => String(x ?? '').trim()).filter(Boolean)
  const s = String(value ?? '').trim()
  return s ? [s] : []
}

const modelUrls = computed(() => normalizeUrlList(props.modelValue))

function mergeUrls(existing, added) {
  const list = [...normalizeUrlList(existing), ...normalizeUrlList(added)]
  const seen = new Set()
  const out = []
  for (const u of list) {
    const s = String(u || '').trim()
    if (!s) continue
    if (seen.has(s)) continue
    seen.add(s)
    out.push(s)
  }
  return out
}

function isFirebaseStorageUrl(url) {
  const s = String(url || '')
  if (!s) return false
  if (s.startsWith('data:')) return false
  return (
    s.startsWith('gs://') ||
    s.includes('firebasestorage.googleapis.com') ||
    s.includes('storage.googleapis.com')
  )
}

function supportsWebPEncode() {
  try {
    const canvas = document.createElement('canvas')
    if (!canvas?.toDataURL) return false
    return canvas.toDataURL('image/webp').startsWith('data:image/webp')
  } catch {
    return false
  }
}

function getExtForMime(mime) {
  const m = String(mime || '').toLowerCase()
  if (m.includes('webp')) return 'webp'
  if (m.includes('png')) return 'png'
  return 'jpg'
}

function baseNameNoExt(name) {
  const s = String(name || 'image')
  const idx = s.lastIndexOf('.')
  return idx > 0 ? s.slice(0, idx) : s
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n))
}

function computeResize(width, height, maxDim) {
  const w = Number(width)
  const h = Number(height)
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return null
  const maxSide = Math.max(w, h)
  if (maxSide <= maxDim) return { width: w, height: h, scale: 1 }
  const scale = maxDim / maxSide
  return {
    width: Math.max(1, Math.round(w * scale)),
    height: Math.max(1, Math.round(h * scale)),
    scale,
  }
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob(
        (blob) => {
          if (!blob) reject(new Error('Nu am putut genera imaginea optimizată.'))
          else resolve(blob)
        },
        type,
        quality
      )
    } catch (e) {
      reject(e)
    }
  })
}

async function fileToImageBitmapOrImage(file) {
  // Prefer createImageBitmap when available (faster); fall back to <img>.
  if (typeof createImageBitmap === 'function') {
    try {
      // Some browsers support orientation hints; harmless if ignored.
      return await createImageBitmap(file, { imageOrientation: 'from-image' })
    } catch {
      // fall through
    }
    try {
      return await createImageBitmap(file)
    } catch {
      // fall through
    }
  }

  const dataUrl = await fileToDataUrl(file)
  return await new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Nu am putut încărca imaginea pentru optimizare.'))
    img.src = dataUrl
  })
}

async function optimizeImageFile(file) {
  const type = String(file?.type || '').toLowerCase()
  if (!type.startsWith('image/')) return file
  // Avoid touching SVGs (keep them as-is)
  if (type.includes('svg')) return file

  // Requirement: always store as WebP in Firebase Storage.
  if (!supportsWebPEncode()) {
    throw new Error('Browserul nu suportă conversia imaginilor în WebP. Folosește un browser modern (Chrome/Edge/Firefox/Safari actualizat).')
  }

  // Decode
  const decoded = await fileToImageBitmapOrImage(file)
  const srcW = decoded.width
  const srcH = decoded.height
  const resize = computeResize(srcW, srcH, OPT_MAX_DIM)
  if (!resize) return file

  // Convert all raster images to WebP (regardless of original format/size).
  const outType = 'image/webp'

  // We'll progressively lower quality; if still too large, downscale further.
  let currentW = resize.width
  let currentH = resize.height
  let bestBlob = null
  let bestScore = Number.POSITIVE_INFINITY

  for (let pass = 0; pass < 6; pass++) {
    const canvas = document.createElement('canvas')
    canvas.width = currentW
    canvas.height = currentH
    const ctx = canvas.getContext('2d', { alpha: true })
    if (!ctx) break

    try {
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
    } catch {}
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(decoded, 0, 0, currentW, currentH)

    let quality = OPT_QUALITY_START
    for (let i = 0; i < 10; i++) {
      const blob = await canvasToBlob(canvas, outType, quality)
      const score = blob.size
      if (score < bestScore) {
        bestScore = score
        bestBlob = blob
      }

      if (blob.size <= OPT_TARGET_BYTES) {
        bestBlob = blob
        bestScore = blob.size
        pass = 999 // stop outer loop
        break
      }
      if (quality <= OPT_QUALITY_MIN) break
      quality = clamp(quality - 0.06, OPT_QUALITY_MIN, OPT_QUALITY_START)
    }

    // Still too large: reduce dimensions and try again.
    currentW = Math.max(320, Math.round(currentW * 0.85))
    currentH = Math.max(320, Math.round(currentH * 0.85))
  }

  if (!bestBlob) return file

  const ext = 'webp'
  const base = baseNameNoExt(file.name)
  const newName = `${base}.${ext}`
  return new File([bestBlob], newName, { type: outType, lastModified: Date.now() })
}

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
  const files = Array.from(e?.target?.files || [])

  if (isMultiple.value) {
    pendingFiles.value = files
    if (pendingFilesObjectUrls.value.length) {
      for (const u of pendingFilesObjectUrls.value) {
        try {
          URL.revokeObjectURL(u)
        } catch {}
      }
    }
    pendingFilesObjectUrls.value = files
      .map((f) => {
        try {
          return URL.createObjectURL(f)
        } catch {
          return ''
        }
      })
      .filter(Boolean)

    // Reset single-file state.
    pendingFile.value = null
    optimizedFile.value = null
    optimizing.value = false
    optimizePromise = null
    if (optimizedObjectUrl.value) {
      try {
        URL.revokeObjectURL(optimizedObjectUrl.value)
      } catch {}
      optimizedObjectUrl.value = ''
    }
    return
  }

  const f = files[0] || null
  pendingFile.value = f

  // Reset optimization state and preview when picking a new file.
  optimizedFile.value = null
  optimizing.value = false
  optimizePromise = null
  if (optimizedObjectUrl.value) {
    try {
      URL.revokeObjectURL(optimizedObjectUrl.value)
    } catch {}
    optimizedObjectUrl.value = ''
  }

  if (!f) return

  // Start optimization immediately so the user can see the optimized size/preview
  // before saving.
  optimizing.value = true
  optimizePromise = (async () => {
    try {
      const opt = await optimizeImageFile(f)
      optimizedFile.value = opt
      optimizedObjectUrl.value = URL.createObjectURL(opt)
    } finally {
      optimizing.value = false
    }
  })().catch((e2) => {
    error.value = e2?.message || String(e2)
    optimizedFile.value = null
    optimizing.value = false
    optimizePromise = null
  })
}

function clearPendingFile() {
  if (pendingFilesObjectUrls.value.length) {
    for (const u of pendingFilesObjectUrls.value) {
      try {
        URL.revokeObjectURL(u)
      } catch {}
    }
  }
  pendingFilesObjectUrls.value = []
  pendingFiles.value = []

  if (optimizedObjectUrl.value) {
    try {
      URL.revokeObjectURL(optimizedObjectUrl.value)
    } catch {}
    optimizedObjectUrl.value = ''
  }
  optimizedFile.value = null
  optimizing.value = false
  optimizePromise = null
  pendingFile.value = null
  if (inputEl.value) inputEl.value.value = ''
}

function formatBytes(bytes) {
  const n = Number(bytes)
  if (!Number.isFinite(n) || n <= 0) return '0 KB'
  const kb = n / 1024
  if (kb < 1024) return `${Math.round(kb)} KB`
  return `${(kb / 1024).toFixed(1)} MB`
}

const previewSrc = computed(() => {
  if (optimizedObjectUrl.value) return optimizedObjectUrl.value
  // If a new file was chosen but optimization hasn't finished yet, hide the old modelValue.
  if (pendingFile.value) return ''
  return typeof props.modelValue === 'string' ? props.modelValue : ''
})

const previewItems = computed(() => {
  if (!props.showPreview) return []
  if (!isMultiple.value) {
    const src = String(previewSrc.value || '').trim()
    if (!src) return []
    return [{ url: src, source: 'model' }]
  }

  const fromModel = modelUrls.value.map((url) => ({ url, source: 'model' }))
  const fromPending = pendingFilesObjectUrls.value.map((url) => ({ url, source: 'pending' }))
  return [...fromModel, ...fromPending]
})

const canPickPrimary = computed(() => Boolean(props.allowPrimary) && isMultiple.value && modelUrls.value.length > 0)

function isPrimaryUrl(url) {
  const u = String(url || '').trim()
  if (!u) return false
  return String(modelUrls.value[0] || '') === u
}

function setPrimaryUrl(url) {
  if (!canPickPrimary.value) return
  const u = String(url || '').trim()
  if (!u) return
  if (isPrimaryUrl(u)) return
  const next = [u, ...modelUrls.value.filter((x) => String(x) !== u)]
  emit('update:modelValue', next)
}

const optimizedSizeLabel = computed(() => {
  if (!pendingFile.value) return ''
  if (optimizing.value) return 'Se optimizează…'
  const opt = optimizedFile.value
  if (!opt) return ''
  return `Dimensiune: ${formatBytes(opt.size)}`
})

async function uploadSelected(options = {}) {
  error.value = ''

  if (isMultiple.value) {
    if (!pendingFiles.value.length) return []

    const mode = String(options?.storeAs || props.storeAs || 'storage')

    if (mode === 'dataUrl') {
      uploading.value = true
      try {
        const urls = []
        for (const f of pendingFiles.value) {
          const dataUrl = await fileToDataUrl(f)
          if (dataUrl) urls.push(dataUrl)
        }
        emit('update:modelValue', mergeUrls(modelUrls.value, urls))
        clearPendingFile()
        return urls
      } catch (e) {
        error.value = e?.message || String(e)
        throw e
      } finally {
        uploading.value = false
      }
    }

    if (mode === 'auto' && !hasStorage.value) {
      uploading.value = true
      try {
        const urls = []
        for (const f of pendingFiles.value) {
          const dataUrl = await fileToDataUrl(f)
          if (dataUrl) urls.push(dataUrl)
        }
        emit('update:modelValue', mergeUrls(modelUrls.value, urls))
        clearPendingFile()
        return urls
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
      const eid = String(options?.entityId ?? props.entityId ?? '').trim()
      const base = eid ? `${props.folder}/${eid}` : props.folder

      const uploadedUrls = []
      for (let i = 0; i < pendingFiles.value.length; i++) {
        const f = pendingFiles.value[i]
        const optimized = await optimizeImageFile(f)
        const safeName = String(optimized.name || f.name || 'image').replace(/[^a-zA-Z0-9._-]/g, '_')
        const path = `${base}/${Date.now()}_${i}_${safeName}`
        const r = storageRef(storage, path)
        await uploadBytes(r, optimized)
        const url = await getDownloadURL(r)
        if (url) uploadedUrls.push(url)
      }

      emit('update:modelValue', mergeUrls(modelUrls.value, uploadedUrls))
      clearPendingFile()
      return uploadedUrls
    } catch (e) {
      error.value = e?.message || String(e)
      throw e
    } finally {
      uploading.value = false
    }
  }

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
    if (optimizePromise) await optimizePromise
		const optimized = optimizedFile.value || (await optimizeImageFile(pendingFile.value))
    const safeName = String(optimized.name || pendingFile.value.name || 'image').replace(/[^a-zA-Z0-9._-]/g, '_')
    const eid = String(options?.entityId ?? props.entityId ?? '').trim()
    const base = eid ? `${props.folder}/${eid}` : props.folder
    const path = `${base}/${Date.now()}_${safeName}`
    const r = storageRef(storage, path)
    await uploadBytes(r, optimized)
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

async function removeImageUrl(url) {
  const clean = String(url || '').trim()
  if (!clean) return

  let nextValue = ''

  if (isMultiple.value) {
    nextValue = modelUrls.value.filter((x) => String(x) !== clean)
    emit('update:modelValue', nextValue)
  } else {
    nextValue = ''
    emit('update:modelValue', '')
  }

  if (!props.deleteFromStorage) return
  if (!hasStorage.value) return
  if (!isFirebaseStorageUrl(clean)) return
  try {
    await deleteObject(storageRef(storage, clean))
  } catch (e) {
    error.value = e?.message || String(e)
  }

  return nextValue
}

function askDeleteImage(url) {
  if (!props.allowDelete) return
  if (confirmLoading.value) return
  confirmUrl.value = String(url || '').trim()
  if (!confirmUrl.value) return
  confirmOpen.value = true
}

async function confirmDeleteImage() {
  if (confirmLoading.value) return
  const url = String(confirmUrl.value || '').trim()
  if (!url) return
  confirmLoading.value = true
  try {
    const nextValue = await removeImageUrl(url)
    emit('deleted', {
      removedUrl: url,
      nextUrls: Array.isArray(nextValue) ? nextValue : normalizeUrlList(nextValue),
    })
    confirmOpen.value = false
    confirmUrl.value = ''
  } finally {
    confirmLoading.value = false
  }
}

defineExpose({
  uploadSelected,
  clearPendingFile,
  hasPendingFile: computed(() => (isMultiple.value ? pendingFiles.value.length > 0 : Boolean(pendingFile.value))),
})
</script>

<template>
  <div class="stack">
    <div class="row sp-between">
      <p class="muted">{{ label }}</p>
      <span v-if="uploading" class="muted">Se încarcă…</span>
    </div>



		<div v-if="previewSrc" class="previewWrap">
			<img class="preview" :src="previewSrc" alt="" />
		</div>

    <div v-else-if="previewItems.length" class="previewWrap previewGrid">
      <div v-for="(item, idx) in previewItems" :key="`${item.source}-${idx}`" class="thumbWrap">
        <img class="preview previewThumb" :src="item.url" alt="" />

        <v-btn
          v-if="canPickPrimary && item.source === 'model'"
          class="starBtn"
          :class="{ starBtnMain: isPrimaryUrl(item.url) }"
          variant="text"
          :icon="isPrimaryUrl(item.url) ? 'mdi-star' : 'mdi-star-outline'"
          density="compact"
          @click="setPrimaryUrl(item.url)"
        />

        <v-btn
          v-if="allowDelete && item.source === 'model'"
          class="deleteBtn"
          variant="text"
          icon="mdi-delete"
          density="compact"
          color="red"
          @click="askDeleteImage(item.url)"
        />
      </div>
    </div>

    <div v-else-if="pendingFile && optimizing" class="previewWrap">
      <div class="previewLoader" aria-label="Se optimizează imaginea">
        <v-progress-circular indeterminate size="22" width="3" color="cyan" />
      </div>
    </div>

    <p v-if="pendingFile" class="muted meta">
      <span class="filename">Nume: {{ pendingFile.name }}</span>
      <span v-if="optimizedSizeLabel" class="size">{{ optimizedSizeLabel }}</span>
    </p>

    <div class="row">
      <input ref="inputEl" class="hiddenInput" type="file" accept="image/*" :multiple="multiple" :disabled="uploading" @change="onFileChange" />
      <v-btn color="cyan" variant="outlined" :disabled="uploading" size="small" @click="openPicker">
        {{ multiple ? 'Încarcă imagini' : 'Încarcă imagine' }}
      </v-btn>
    </div>

    <p v-if="error" class="error">{{ error }}</p>

    <v-dialog v-model="confirmOpen" max-width="420" persistent>
      <v-card class="card" elevation="2">
        <v-overlay :model-value="confirmLoading" contained class="align-center justify-center">
          <v-progress-circular indeterminate color="cyan" />
        </v-overlay>
        <v-card-title>Șterge imaginea?</v-card-title>
        <v-card-text class="muted">Imaginea va fi eliminată din produs.</v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" :disabled="confirmLoading" @click="confirmOpen = false">Renunță</v-btn>
          <v-btn color="red" variant="flat" :loading="confirmLoading" :disabled="confirmLoading" @click="confirmDeleteImage">Șterge</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<style scoped>
.meta {
	margin: 0;
	display: grid;
	gap: .15rem;
}
.meta .filename {
	font-size: .9rem;
}
.meta .size {
	font-size: .85rem;
}
.previewWrap {
	width: 100%;
}
.previewGrid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: .5rem;
}

@media (min-width: 960px) {
  .previewGrid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}
.thumbWrap {
  position: relative;
}
.preview {
  width: 100%;
  max-height: 180px;
  object-fit: cover;
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,.08);
}
.previewThumb {
  height: 90px;
  max-height: 90px;
}
.deleteBtn {
  position: absolute;
  right: .25rem;
  bottom: .25rem;
  background: rgba(255,255,255,.92);
  width: 24px;
  height: 24px;
  min-width: 24px;
  min-height: 24px;
  /* border: 1px solid rgb(172, 167, 167); */
}

.deleteBtn :deep(.v-icon) {
  font-size: 16px;
}

.starBtn {
  position: absolute;
  right: .25rem;
  top: .25rem;
  background: rgba(255,255,255,.92);
  width: 24px;
  height: 24px;
  min-width: 24px;
  min-height: 24px;
  background: linear-gradient(135deg, var(--accent), var(--accent-2));
  /* border: 1px solid rgb(172, 167, 167); */
}

.starBtn :deep(.v-icon) {
  font-size: 16px;
  color: #5878b9;
}

.starBtnMain :deep(.v-icon) {
  color: #0b1220;
}
.previewLoader {
  width: 100%;
  height: 180px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,.08);
  background: rgba(255,255,255,.03);
}
.hiddenInput {
  display: none;
}
.error {
  margin: 0;
  color: #fca5a5;
}
</style>
