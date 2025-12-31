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
const optimizing = ref(false)
const error = ref('')
const inputEl = ref(null)
const pendingFile = ref(null)
const optimizedFile = ref(null)
const optimizedObjectUrl = ref('')
let optimizePromise = null

const hasStorage = computed(() => Boolean(storage))

const OPT_MAX_DIM = 1920
const OPT_TARGET_BYTES = 500 * 1024
const OPT_QUALITY_START = 0.82
const OPT_QUALITY_MIN = 0.45

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
  const f = e?.target?.files?.[0] || null
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
  return props.modelValue
})

const optimizedSizeLabel = computed(() => {
  if (!pendingFile.value) return ''
  if (optimizing.value) return 'Se optimizează…'
  const opt = optimizedFile.value
  if (!opt) return ''
  return `Dimensiune: ${formatBytes(opt.size)}`
})

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



		<div v-if="previewSrc" class="previewWrap">
			<img class="preview" :src="previewSrc" alt="" />
		</div>

    <div v-else-if="pendingFile && optimizing" class="previewWrap">
      <div class="previewLoader" aria-label="Se optimizează imaginea">
        <v-progress-circular indeterminate size="22" width="3" />
      </div>
    </div>

    <p v-if="pendingFile" class="muted meta">
      <span class="filename">Nume: {{ pendingFile.name }}</span>
      <span v-if="optimizedSizeLabel" class="size">{{ optimizedSizeLabel }}</span>
    </p>

    <div class="row">
      <input ref="inputEl" class="hiddenInput" type="file" accept="image/*" :disabled="uploading" @change="onFileChange" />
      <v-btn color="cyan" variant="outlined" :disabled="uploading" size="small" @click="openPicker">Încarcă imagine</v-btn>
    </div>

    <p v-if="error" class="error">{{ error }}</p>
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
.preview {
  width: 100%;
  max-height: 180px;
  object-fit: cover;
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,.08);
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
