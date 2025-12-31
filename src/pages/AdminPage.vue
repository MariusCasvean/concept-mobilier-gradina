<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useDisplay } from 'vuetify'
import draggable from 'vuedraggable'
import { rtdb, storage } from '../lib/firebase'
import { ref as dbRef, update, remove, push, set } from 'firebase/database'
import { deleteObject, ref as storageRef } from 'firebase/storage'
import { useAdminAuthStore } from '../stores/adminAuth'
import {
  addFooterText,
  addIntroText,
  deleteMessage,
  deleteFooterText,
  deleteIntroText,
  listCategories,
  listFooterTexts,
  listIntroTexts,
  listMessages,
  listProducts,
  saveFooterRanks,
  saveIntroRanks,
  subscribeMessages,
  updateFooterText,
  updateIntroText,
} from '../services/productsService'
import ImageUploadField from '../components/ui/ImageUploadField.vue'
import PageLoader from '../components/ui/PageLoader.vue'

const adminAuth = useAdminAuthStore()

const loading = ref(true)
const error = ref('')
const categories = ref([])
const products = ref([])

const introTexts = ref([])
const introAddOpen = ref(false)
const introAddValue = ref('')
const introEditId = ref('')
const introEditValue = ref('')
const introAddTouched = ref(false)
const introEditTouched = ref(false)

const footerTexts = ref([])
const footerAddOpen = ref(false)
const footerAddValue = ref('')
const footerEditId = ref('')
const footerEditValue = ref('')
const footerAddTouched = ref(false)
const footerEditTouched = ref(false)

const messages = ref([])
const messagesSectionOpen = ref(false)

const categoriesSectionOpen = ref(false)
const productsSectionOpen = ref(false)
const introSectionOpen = ref(false)
const footerSectionOpen = ref(false)

const chevronFor = (open) => (open ? 'mdi-chevron-up' : 'mdi-chevron-down')

const introAddTrimmed = computed(() => String(introAddValue.value ?? '').trim())
const introEditTrimmed = computed(() => String(introEditValue.value ?? '').trim())

const footerAddTrimmed = computed(() => String(footerAddValue.value ?? '').trim())
const footerEditTrimmed = computed(() => String(footerEditValue.value ?? '').trim())

const canSaveIntroAdd = computed(() => Boolean(introAddTrimmed.value))
const canSaveIntroEdit = computed(() => Boolean(introEditId.value) && Boolean(introEditTrimmed.value))

const canSaveFooterAdd = computed(() => Boolean(footerAddTrimmed.value))
const canSaveFooterEdit = computed(() => Boolean(footerEditId.value) && Boolean(footerEditTrimmed.value))

const introRequiredError = 'Câmp obligatoriu.'

const categoryEditOpen = ref(false)
const productEditOpen = ref(false)
const confirmOpen = ref(false)

const savingCategory = ref(false)
const savingProduct = ref(false)
const confirmLoading = ref(false)

const snackbarOpen = ref(false)
const snackbarText = ref('')
const snackbarColor = ref('success')

const confirmTitle = ref('')
const confirmText = ref('')
let confirmAction = null
const confirmSuccessMessage = ref('')

const editingCategory = ref(null)
const editingProduct = ref(null)

const categoryForm = ref({
  id: '',
  title: '',
  description: '',
  background: '#0b1220',
  image: '',
  productIds: [],
})

const productForm = ref({
  id: '',
  title: '',
  description: '',
  price: '',
  reducedPrice: '',
  showProductDiscount: false,
  background: '#0b1220',
  image: '',
})

const categoryImageFieldRef = ref(null)
const productImageFieldRef = ref(null)

const productsByCategoryId = computed(() => {
  const map = new Map()
  for (const p of products.value) {
    const cid = String(p.categoryId ?? '')
    if (!cid) continue
    if (!map.has(cid)) map.set(cid, [])
    map.get(cid).push(p)
  }
  return map
})

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

async function deleteStorageObjectByUrl(url) {
  if (!storage) return
  if (!isFirebaseStorageUrl(url)) return
  try {
    await deleteObject(storageRef(storage, url))
  } catch (e) {
    // Don't block DB deletion on Storage cleanup failures.
    // eslint-disable-next-line no-console
    console.warn('[storage] Failed to delete object:', url, e?.message || e)
  }
}

const productOptions = computed(() => {
  return products.value.map((p) => ({ title: p.title, value: p.id }))
})

function getCategoryTitleById(categoryId) {
  const cid = String(categoryId || '').trim()
  if (!cid) return '—'
  return categories.value.find((c) => String(c.id) === cid)?.title || '—'
}

const display = useDisplay()
const actionBtnSize = computed(() => (display.xs.value ? 'x-small' : 'small'))
const dialogActionBtnSize = computed(() => (display.xs.value ? 'small' : 'default'))
const isMobile = computed(() => display.xs.value)

const requiredRule = (v) => (String(v ?? '').trim() ? true : '')

function hasPendingImage(fieldComponent) {
  if (!fieldComponent) return false
  const raw = fieldComponent.hasPendingFile
  if (raw && typeof raw === 'object' && 'value' in raw) return Boolean(raw.value)
  return Boolean(raw)
}

const categoryHasImage = computed(() => {
  const urlOk = Boolean(String(categoryForm.value.image || '').trim())
  const pendingOk = hasPendingImage(categoryImageFieldRef.value)
  return urlOk || pendingOk
})

const productHasImage = computed(() => {
  const urlOk = Boolean(String(productForm.value.image || '').trim())
  const pendingOk = hasPendingImage(productImageFieldRef.value)
  return urlOk || pendingOk
})

const isCategoryValid = computed(() => {
  const c = categoryForm.value
  return (
    Boolean(String(c.title || '').trim()) &&
    Boolean(String(c.description || '').trim()) &&
    categoryHasImage.value
  )
})

const isProductValid = computed(() => {
  const p = productForm.value
  return (
    Boolean(String(p.title || '').trim()) &&
    Boolean(String(p.description || '').trim()) &&
    Boolean(String(p.price || '').trim()) &&
    productHasImage.value
  )
})

const canShowDiscountToggle = computed(() => {
  const p = productForm.value
  return Boolean(String(p.price || '').trim()) && Boolean(String(p.reducedPrice || '').trim())
})

watch(canShowDiscountToggle, (ok) => {
  if (!ok) productForm.value.showProductDiscount = false
})

async function refresh() {
  loading.value = true
  error.value = ''
  try {
    const [cats, prods, intro, footer, msgs] = await Promise.all([
      listCategories(),
      listProducts(),
      listIntroTexts(),
      listFooterTexts(),
      listMessages(),
    ])
    categories.value = cats
    products.value = prods
    introTexts.value = intro
    footerTexts.value = footer
    messages.value = msgs
    introAddOpen.value = false
    introAddValue.value = ''
    introEditId.value = ''
    introEditValue.value = ''
    introAddTouched.value = false
    introEditTouched.value = false

    footerAddOpen.value = false
    footerAddValue.value = ''
    footerEditId.value = ''
    footerEditValue.value = ''
    footerAddTouched.value = false
    footerEditTouched.value = false
  } catch (e) {
    error.value = e?.message || String(e)
  } finally {
    loading.value = false
  }
}

onMounted(refresh)

let unsubscribeMessages = null
onMounted(() => {
  unsubscribeMessages = subscribeMessages(
    (items) => {
      messages.value = items
    },
    () => {}
  )
})

onBeforeUnmount(() => {
  unsubscribeMessages?.()
  unsubscribeMessages = null
})

function textOrDash(v) {
  const s = String(v ?? '').trim()
  return s ? s : '—'
}

function formatCreatedAt(value) {
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0) return '—'
  try {
    return new Intl.DateTimeFormat('ro-RO', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(n))
  } catch {
    return '—'
  }
}

async function removeMessage(messageId) {
  error.value = ''
  try {
    await deleteMessage(messageId)
  } catch (e) {
    error.value = e?.message || String(e)
		throw e
  }
}

watch(categoryEditOpen, (open) => {
  if (!open) categoryImageFieldRef.value?.clearPendingFile?.()
})

watch(productEditOpen, (open) => {
  if (!open) productImageFieldRef.value?.clearPendingFile?.()
})

function openCategoryEdit(c) {
  editingCategory.value = c
  categoryImageFieldRef.value?.clearPendingFile?.()
  const linked = products.value.filter((p) => String(p.categoryId ?? '') === String(c.id))
  categoryForm.value = {
    id: c.id,
    title: c.title || '',
    description: c.description || '',
    background: c.background || '#0b1220',
    image: c.image || '',
    productIds: linked.map((p) => p.id),
  }
  categoryEditOpen.value = true
}

function openCategoryCreate() {
  editingCategory.value = null
  categoryImageFieldRef.value?.clearPendingFile?.()
  categoryForm.value = {
    id: '',
    title: '',
    description: '',
    background: '#0b1220',
    image: '',
    productIds: [],
  }
  categoryEditOpen.value = true
}

function openProductEdit(p) {
  editingProduct.value = p
  productImageFieldRef.value?.clearPendingFile?.()
  productForm.value = {
    id: p.id,
    title: p.title || '',
    description: p.description || '',
    price: p.price || '',
    reducedPrice: p.reducedPrice || '',
    showProductDiscount: Boolean(p.showProductDiscount),
    background: p.background || '#0b1220',
    image: p.image || '',
  }
  productEditOpen.value = true
}

function openProductCreate() {
  editingProduct.value = null
  productImageFieldRef.value?.clearPendingFile?.()
  productForm.value = {
    id: '',
    title: '',
    description: '',
    price: '',
    reducedPrice: '',
    showProductDiscount: false,
    background: '#0b1220',
    image: '',
  }
  productEditOpen.value = true
}

function askConfirm({ title, text, action }) {
  confirmTitle.value = title
  confirmText.value = text
  confirmAction = action
  confirmSuccessMessage.value = ''
  confirmOpen.value = true
}

function askConfirmWithSuccess({ title, text, action, successMessage }) {
  askConfirm({ title, text, action })
  confirmSuccessMessage.value = String(successMessage || '').trim()
}

function showSuccess(message) {
  snackbarColor.value = 'success'
  snackbarText.value = String(message || '').trim() || 'Succes.'
  snackbarOpen.value = true
}

function showError() {
  snackbarColor.value = 'error'
  snackbarText.value = 'A apărut o eroare'
  snackbarOpen.value = true
}

watch(confirmOpen, (open) => {
  if (!open && !confirmLoading.value) {
    confirmAction = null
    confirmSuccessMessage.value = ''
  }
})

async function confirmYes() {
  if (!confirmAction || confirmLoading.value) return
  confirmLoading.value = true
  try {
    await confirmAction()
    confirmOpen.value = false
    showSuccess(confirmSuccessMessage.value || 'Elementul a fost șters.')
    confirmAction = null
    confirmSuccessMessage.value = ''
  } catch (e) {
    error.value = e?.message || String(e)
    showError()
  } finally {
    confirmLoading.value = false
  }
}

async function saveCategory() {
  if (!rtdb) {
    error.value = 'Realtime Database nu este configurat.'
    showError()
    return
  }

  error.value = ''

  const c = categoryForm.value
  const title = String(c.title || '').trim()
  if (!title) {
    error.value = 'Titlul categoriei este obligatoriu.'
    return
  }

  savingCategory.value = true

  let categoryId = String(c.id || '')
  const isNew = !categoryId
  const newRef = isNew ? push(dbRef(rtdb, 'categories')) : null
  if (isNew) {
    categoryId = String(newRef?.key || '')
    if (!categoryId) {
      error.value = 'Nu am putut genera ID pentru categorie.'
      return
    }
    categoryForm.value.id = categoryId
  }

  try {
    const uploadedUrl = await categoryImageFieldRef.value?.uploadSelected?.({ entityId: categoryId, storeAs: 'storage' })
    if (uploadedUrl) categoryForm.value.image = uploadedUrl

  const payload = {
    title,
    description: String(c.description || '').trim(),
    background: c.background || '#0b1220',
    image: c.image || '',
    updatedAt: Date.now(),
  }

  if (isNew) {
    await set(newRef, {
      ...payload,
      createdAt: Date.now(),
    })
  } else {
    await update(dbRef(rtdb, `categories/${categoryId}`), payload)
  }

  const selectedProductIds = new Set((c.productIds || []).map((id) => String(id)))
  const linkOps = []
  for (const p of products.value) {
    const pid = String(p?.id ?? '')
    if (!pid) continue
    const currentCategoryId = String(p?.categoryId ?? '')

    if (selectedProductIds.has(pid) && currentCategoryId !== String(categoryId)) {
      linkOps.push(update(dbRef(rtdb, `products/${pid}`), { categoryId: String(categoryId), updatedAt: Date.now() }))
    }

    if (!selectedProductIds.has(pid) && currentCategoryId === String(categoryId)) {
      linkOps.push(update(dbRef(rtdb, `products/${pid}`), { categoryId: '', updatedAt: Date.now() }))
    }
  }
  await Promise.all(linkOps)

  categoryEditOpen.value = false
  showSuccess('Categoria a fost salvată')
  await refresh()
  } catch (e) {
    error.value = e?.message || String(e)
    showError()
  } finally {
    savingCategory.value = false
  }
}

async function saveProduct() {
  if (!rtdb) {
    error.value = 'Realtime Database nu este configurat.'
    showError()
    return
  }

  error.value = ''

  const p = productForm.value
  const title = String(p.title || '').trim()
  if (!title) {
    error.value = 'Titlul produsului este obligatoriu.'
    return
  }

  savingProduct.value = true

  let productId = String(p.id || '')
  const isNew = !productId
  const newRef = isNew ? push(dbRef(rtdb, 'products')) : null
  if (isNew) {
    productId = String(newRef?.key || '')
    if (!productId) {
      error.value = 'Nu am putut genera ID pentru produs.'
      return
    }
    productForm.value.id = productId
  }

  try {
    const uploadedUrl = await productImageFieldRef.value?.uploadSelected?.({ entityId: productId, storeAs: 'storage' })
    if (uploadedUrl) productForm.value.image = uploadedUrl

  const payload = {
    title,
    description: String(p.description || '').trim(),
    price: String(p.price || '').trim(),
    reducedPrice: String(p.reducedPrice || '').trim(),
    showProductDiscount: Boolean(p.showProductDiscount) && canShowDiscountToggle.value,
    background: p.background || '#0b1220',
    image: p.image || '',
    updatedAt: Date.now(),
  }

  if (isNew) {
    await set(newRef, {
      ...payload,
      categoryId: '',
      createdAt: Date.now(),
    })
  } else {
    await update(dbRef(rtdb, `products/${productId}`), payload)
  }

  productEditOpen.value = false
  showSuccess('Produsul a fost salvat')
  await refresh()
  } catch (e) {
    error.value = e?.message || String(e)
    showError()
  } finally {
    savingProduct.value = false
  }
}

async function deleteCategory(categoryId) {
  if (!rtdb) return

	const category = categories.value.find((c) => String(c?.id ?? '') === String(categoryId))
	const categoryImageUrl = category?.image || ''

  // Unlink products first
  const linked = products.value.filter((p) => String(p.categoryId ?? '') === String(categoryId))
  await Promise.all(
    linked.map((p) => update(dbRef(rtdb, `products/${p.id}`), { categoryId: '', updatedAt: Date.now() }))
  )

  await remove(dbRef(rtdb, `categories/${categoryId}`))
	await deleteStorageObjectByUrl(categoryImageUrl)
  await refresh()
}

async function deleteProduct(productId) {
  if (!rtdb) return
	const product = products.value.find((p) => String(p?.id ?? '') === String(productId))
	const productImageUrl = product?.image || ''
  await remove(dbRef(rtdb, `products/${productId}`))
	await deleteStorageObjectByUrl(productImageUrl)
  await refresh()
}

function startIntroAdd() {
  introAddOpen.value = true
  introAddValue.value = ''
  introEditId.value = ''
  introEditValue.value = ''
  introAddTouched.value = false
  introEditTouched.value = false
}

function cancelIntroAdd() {
  introAddOpen.value = false
  introAddValue.value = ''
  introAddTouched.value = false
}

async function saveIntroAdd() {
  error.value = ''
  try {
    introAddTouched.value = true
    if (!canSaveIntroAdd.value) return
    await addIntroText(introAddTrimmed.value)
    await refresh()
  } catch (e) {
    error.value = e?.message || String(e)
  }
}

function startIntroEdit(item) {
  introEditId.value = String(item?.id || '')
  introEditValue.value = String(item?.text || '')
  introAddOpen.value = false
  introAddValue.value = ''
  introEditTouched.value = false
}

function cancelIntroEdit() {
  introEditId.value = ''
  introEditValue.value = ''
  introEditTouched.value = false
}

async function saveIntroEdit(itemId) {
  error.value = ''
  try {
    introEditTouched.value = true
    if (!canSaveIntroEdit.value) return
    const current = introTexts.value.find((x) => String(x?.id) === String(itemId))
    await updateIntroText(itemId, introEditTrimmed.value, current?.rank)
    await refresh()
  } catch (e) {
    error.value = e?.message || String(e)
  }
}

async function removeIntro(itemId) {
  error.value = ''
  try {
    await deleteIntroText(itemId)
    await refresh()
  } catch (e) {
    error.value = e?.message || String(e)
		throw e
  }
}

async function persistIntroOrder() {
  if (!rtdb) return
  error.value = ''

  // Reset edit/add states to avoid editing the wrong item after a reorder.
  introEditId.value = ''
  introEditValue.value = ''
  introEditTouched.value = false
  introAddOpen.value = false
  introAddValue.value = ''
  introAddTouched.value = false

  // Ensure local ranks reflect the new order immediately.
  introTexts.value = introTexts.value.map((t, idx) => ({ ...t, rank: idx }))

  try {
    await saveIntroRanks(introTexts.value)
  } catch (e) {
    error.value = e?.message || String(e)
  }
}

function startFooterAdd() {
  footerAddOpen.value = true
  footerAddValue.value = ''
  footerEditId.value = ''
  footerEditValue.value = ''
  footerAddTouched.value = false
  footerEditTouched.value = false
}

function cancelFooterAdd() {
  footerAddOpen.value = false
  footerAddValue.value = ''
  footerAddTouched.value = false
}

async function saveFooterAdd() {
  error.value = ''
  try {
    footerAddTouched.value = true
    if (!canSaveFooterAdd.value) return
    await addFooterText(footerAddTrimmed.value)
    await refresh()
  } catch (e) {
    error.value = e?.message || String(e)
  }
}

function startFooterEdit(item) {
  footerEditId.value = String(item?.id || '')
  footerEditValue.value = String(item?.text || '')
  footerAddOpen.value = false
  footerAddValue.value = ''
  footerEditTouched.value = false
}

function cancelFooterEdit() {
  footerEditId.value = ''
  footerEditValue.value = ''
  footerEditTouched.value = false
}

async function saveFooterEdit(itemId) {
  error.value = ''
  try {
    footerEditTouched.value = true
    if (!canSaveFooterEdit.value) return
    const current = footerTexts.value.find((x) => String(x?.id) === String(itemId))
    await updateFooterText(itemId, footerEditTrimmed.value, current?.rank)
    await refresh()
  } catch (e) {
    error.value = e?.message || String(e)
  }
}

async function removeFooter(itemId) {
  error.value = ''
  try {
    await deleteFooterText(itemId)
    await refresh()
  } catch (e) {
    error.value = e?.message || String(e)
		throw e
  }
}

async function persistFooterOrder() {
  if (!rtdb) return
  error.value = ''

  footerEditId.value = ''
  footerEditValue.value = ''
  footerEditTouched.value = false
  footerAddOpen.value = false
  footerAddValue.value = ''
  footerAddTouched.value = false

  footerTexts.value = footerTexts.value.map((t, idx) => ({ ...t, rank: idx }))

  try {
    await saveFooterRanks(footerTexts.value)
  } catch (e) {
    error.value = e?.message || String(e)
  }
}
</script>

<template>
  <div class="stack-lg">
    <header class="row sp-between">
      <h1>Administrare</h1>
      <div v-if="!loading" class="row">
      </div>
    </header>

    <PageLoader v-if="loading" />

    <div v-else-if="error" class="card">
      <strong>Eroare</strong>
      <p class="muted">{{ error }}</p>
    </div>

    <div v-else class="stack">
      <section class="stack">
        <div class="row sp-between">
          <h2 class="sectionTitle">Categorii</h2>
          <div class="row" style="gap: .25rem;">
            <span class="pill">{{ categories.length }} {{ categories.length === 1 ? 'categorie' : 'categorii' }}</span>
            <v-btn
              :size="actionBtnSize"
              variant="text"
              :icon="chevronFor(categoriesSectionOpen)"
              @click="categoriesSectionOpen = !categoriesSectionOpen"
            />
          </div>
        </div>

        <v-expand-transition>
          <div v-show="categoriesSectionOpen" class="stack">
            <div class="row d-flex justify-end">
              <v-btn
                color="cyan"
                variant="flat"
                class="ok"
                :size="actionBtnSize"
                @click="openCategoryCreate"
              >
                Adaugă categorie nouă
              </v-btn>
            </div>
          </div>
        </v-expand-transition>
      </section>

      <v-expand-transition>
        <div v-show="categoriesSectionOpen" class="stack">
          <div v-for="c in categories" :key="c.id" class="card category" :style="{ borderLeftColor: c.background || 'transparent' }">
            <div class="row sp-between categoryHead">
              <div class="stack">
                <strong>{{ c.title }}</strong>
                <p v-if="c.description" class="muted">{{ c.description }}</p>
              </div>
              <div class="catThumb" aria-hidden="true">
                <img v-if="c.image" class="catThumbImg" :src="c.image" alt="" />
                <div v-else class="catThumbEmpty">
                  <v-icon size="56">mdi-cloud-upload</v-icon>
                </div>
              </div>
            </div>

            <div class="divider" />

            <div class="grid">
              <v-card
                v-for="p in (productsByCategoryId.get(String(c.id)) || [])"
                :key="p.id"
                class="product productInCategory"
                elevation="2"
                :style="{ borderLeftColor: p.background || 'transparent' }"
              >
                <div class="imgSlot" aria-hidden="true">
                  <v-img v-if="p.image" :src="p.image" height="120" cover alt="" />
                  <div v-else class="imgPlaceholder" />
                </div>
                <v-card-text class="info">
                  <div class="row sp-between">
                    <strong class="name mb-2">{{ p.title }}</strong>
                  </div>
                  <p class="muted desc" :class="{ placeholder: !p.description }">{{ p.description || '' }}</p>
                </v-card-text>
              </v-card>
            </div>

            <div v-if="(productsByCategoryId.get(String(c.id)) || []).length === 0" class="muted empty">
              Nu există produse asociate acestei categorii.
            </div>

            <div class="row d-flex justify-end mt-4">
              <v-btn :size="actionBtnSize" variant="outlined" color="cyan" @click="openCategoryEdit(c)">
                Editează categorie
              </v-btn>
              <v-btn
                :size="actionBtnSize"
                variant="outlined"
                color="red"
                @click="askConfirmWithSuccess({ title: 'Șterge categoria', text: `Sigur vrei să ștergi categoria ${c.title}?`, action: () => deleteCategory(c.id), successMessage: 'Categoria a fost ștearsă' })"
              >
                Șterge categorie
              </v-btn>
            </div>
          </div>
        </div>
      </v-expand-transition>

      <div class="divider" />

      <section v-if="!loading" class="stack">
        <div class="row sp-between">
          <h2 class="sectionTitle">Produse</h2>
          <div class="row" style="gap: .25rem;">
            <span class="pill">{{ products.length }} produse</span>
            <v-btn
              :size="actionBtnSize"
              variant="text"
              :icon="chevronFor(productsSectionOpen)"
              @click="productsSectionOpen = !productsSectionOpen"
            />
          </div>
        </div>

        <v-expand-transition>
          <div v-show="productsSectionOpen" class="stack">
            <div class="row d-flex justify-end">
              <v-btn
                color="cyan"
                variant="flat"
                :size="actionBtnSize"
                @click="openProductCreate"
              >
                Adaugă produs nou
              </v-btn>
            </div>

            <div class="productsGrid">
              <v-card
                v-for="p in products"
                :key="p.id"
                class="productSimple"
                elevation="2"
                :style="{ borderLeftColor: p.background || 'transparent' }"
              >
                <div class="productSimpleMedia" aria-hidden="true">
                  <v-img v-if="p.image" :src="p.image" height="120" cover alt="" />
                  <div v-else class="imgPlaceholder" />
                </div>

                <v-card-text class="productSimpleBody">
                  <div class="row sp-between">
                    <strong class="name">{{ p.title }}</strong>
                    <div class="row prices">
                      <span v-if="p.price" class="pill" :class="{ priceOld: p.reducedPrice }">{{ p.price }} RON</span>
                      <span v-if="p.reducedPrice" class="pill priceNew">{{ p.reducedPrice }} RON</span>
                      <span v-if="p.showProductDiscount" class="pill discountPill">Reducere</span>
                    </div>
                  </div>
                  <div class="row sp-between align-center">
                    <span class="muted"><strong>Categorie:</strong> {{ getCategoryTitleById(p.categoryId) }}</span>
                  </div>
                  <p class="muted desc" :class="{ placeholder: !p.description }"><strong>Descriere:</strong> {{ p.description || '' }}</p>
                  <div class="row d-flex productActions mt-2">
                    <v-btn :size="actionBtnSize" variant="outlined" color="cyan" @click="openProductEdit(p)">
                      Editează produs
                    </v-btn>
                    <v-btn
                      :size="actionBtnSize"
                      variant="outlined"
                      color="red"
                      @click="askConfirmWithSuccess({ title: 'Șterge produsul', text: `Sigur vrei să ștergi produsul ${p.title}?`, action: () => deleteProduct(p.id), successMessage: 'Produsul a fost șters' })"
                    >
                      Șterge produs
                    </v-btn>
                  </div>
                </v-card-text>
              </v-card>
            </div>
          </div>
        </v-expand-transition>
      </section>

      <div class="divider" />

      <section class="stack">
        <div class="row sp-between">
          <h2 class="sectionTitle">Texte de introducere site</h2>
          <div class="row" style="gap: .25rem;">
            <span class="pill">{{ introTexts.length }} texte</span>
            <v-btn
              :size="actionBtnSize"
              variant="text"
              :icon="chevronFor(introSectionOpen)"
              @click="introSectionOpen = !introSectionOpen"
            />
          </div>
        </div>

        <v-expand-transition>
          <div v-show="introSectionOpen" class="stack">
            <div v-if="!rtdb" class="card">
              <strong>Eroare</strong>
              <p class="muted">Realtime Database nu este configurat.</p>
            </div>

            <template v-else>
              <div class="row d-flex justify-end">
                <v-btn v-if="!introAddOpen" color="cyan" variant="flat" :size="actionBtnSize" @click="startIntroAdd">
                  Adaugă text nou
                </v-btn>
              </div>

              <div class="card" v-if="introAddOpen">
                <div class="stack">
                  <v-text-field
                    v-model="introAddValue"
                    label="Text nou *"
                    variant="outlined"
                    density="compact"
                    hide-details
                    autocomplete="off"
                    :error="introAddTouched && !introAddTrimmed"
                    :error-messages="introAddTouched && !introAddTrimmed ? introRequiredError : ''"
                    @blur="introAddTouched = true"
                  />
                  <div class="row d-flex justify-end">
                    <v-btn :size="actionBtnSize" variant="text" @click="cancelIntroAdd">Renunță</v-btn>
                    <v-btn :size="actionBtnSize" color="cyan" variant="flat" :disabled="!canSaveIntroAdd" @click="saveIntroAdd">Salvează</v-btn>
                  </div>
                </div>
              </div>

              <div v-if="introTexts.length === 0" class="card">
                <strong>Nu există texte încă.</strong>
                <p class="muted">Adaugă primul text și va apărea pe pagina Acasă.</p>
              </div>

              <draggable
                v-model="introTexts"
                item-key="id"
                :delay="300"
                :delay-on-touch-only="true"
                @end="persistIntroOrder"
              >
                <template #item="{ element: t }">
                  <div class="card mb-2">
                    <div v-if="introEditId === String(t.id)" class="stack">
                      <v-text-field
                        v-model="introEditValue"
                        label="Text *"
                        variant="outlined"
                        density="compact"
                        hide-details
                        autocomplete="off"
                        :error="introEditTouched && !introEditTrimmed"
                        :error-messages="introEditTouched && !introEditTrimmed ? introRequiredError : ''"
                        @blur="introEditTouched = true"
                      />
                      <div class="row d-flex justify-end mt-4">
                        <v-btn :size="actionBtnSize" variant="text" @click="cancelIntroEdit">Renunță</v-btn>
                        <v-btn :size="actionBtnSize" color="cyan" variant="flat" :disabled="!canSaveIntroEdit" @click="saveIntroEdit(t.id)">Salvează</v-btn>
                      </div>
                    </div>

                    <div v-else class="stack">
                      <div class="muted" style="line-height: 1.5;">{{ t.text }}</div>
                      <div class="row d-flex justify-end mt-4">
                        <v-btn :size="actionBtnSize" variant="outlined" color="cyan" @click="startIntroEdit(t)">Editează text</v-btn>
                        <v-btn
                          :size="actionBtnSize"
                          variant="outlined"
                          color="red"
                          @click="askConfirmWithSuccess({ title: 'Șterge textul', text: 'Sigur vrei să ștergi acest text?', action: () => removeIntro(t.id), successMessage: 'Elementul a fost șters.' })"
                        >
                          Șterge text
                        </v-btn>
                      </div>
                    </div>
                  </div>
                </template>
              </draggable>

            </template>
          </div>
        </v-expand-transition>
      </section>

      <div class="divider" />

      <section class="stack">
        <div class="row sp-between">
          <h2 class="sectionTitle">Texte footer</h2>
          <div class="row" style="gap: .25rem;">
            <span class="pill">{{ footerTexts.length }} texte</span>
            <v-btn
              :size="actionBtnSize"
              variant="text"
              :icon="chevronFor(footerSectionOpen)"
              @click="footerSectionOpen = !footerSectionOpen"
            />
          </div>
        </div>

        <v-expand-transition>
          <div v-show="footerSectionOpen" class="stack">
            <div v-if="!rtdb" class="card">
              <strong>Eroare</strong>
              <p class="muted">Realtime Database nu este configurat.</p>
            </div>

            <template v-else>
              <div class="row d-flex justify-end">
                <v-btn v-if="!footerAddOpen" color="cyan" variant="flat" :size="actionBtnSize" @click="startFooterAdd">
                  Adaugă text nou
                </v-btn>
              </div>

              <div class="card" v-if="footerAddOpen">
                <div class="stack">
                  <v-text-field
                    v-model="footerAddValue"
                    label="Text nou *"
                    variant="outlined"
                    density="compact"
                    hide-details
                    autocomplete="off"
                    :error="footerAddTouched && !footerAddTrimmed"
                    :error-messages="footerAddTouched && !footerAddTrimmed ? introRequiredError : ''"
                    @blur="footerAddTouched = true"
                  />
                  <div class="row d-flex justify-end">
                    <v-btn :size="actionBtnSize" variant="text" @click="cancelFooterAdd">Renunță</v-btn>
                    <v-btn :size="actionBtnSize" color="cyan" variant="flat" :disabled="!canSaveFooterAdd" @click="saveFooterAdd">Salvează</v-btn>
                  </div>
                </div>
              </div>

              <div v-if="footerTexts.length === 0" class="card">
                <strong>Nu există texte încă.</strong>
                <p class="muted">Adaugă primul text și va apărea în footer.</p>
              </div>

              <draggable
                v-model="footerTexts"
                item-key="id"
                :delay="300"
                :delay-on-touch-only="true"
                @end="persistFooterOrder"
              >
                <template #item="{ element: t }">
                  <div class="card mb-2">
                    <div v-if="footerEditId === String(t.id)" class="stack">
                      <v-text-field
                        v-model="footerEditValue"
                        label="Text *"
                        variant="outlined"
                        density="compact"
                        hide-details
                        autocomplete="off"
                        :error="footerEditTouched && !footerEditTrimmed"
                        :error-messages="footerEditTouched && !footerEditTrimmed ? introRequiredError : ''"
                        @blur="footerEditTouched = true"
                      />
                      <div class="row d-flex justify-end mt-4">
                        <v-btn :size="actionBtnSize" variant="text" @click="cancelFooterEdit">Renunță</v-btn>
                        <v-btn :size="actionBtnSize" color="cyan" variant="flat" :disabled="!canSaveFooterEdit" @click="saveFooterEdit(t.id)">Salvează</v-btn>
                      </div>
                    </div>

                    <div v-else class="stack">
                      <div class="muted" style="line-height: 1.5;">{{ t.text }}</div>
                      <div class="row d-flex justify-end mt-4">
                        <v-btn :size="actionBtnSize" variant="outlined" color="cyan" @click="startFooterEdit(t)">Editează text</v-btn>
                        <v-btn
                          :size="actionBtnSize"
                          variant="outlined"
                          color="red"
                          @click="askConfirmWithSuccess({ title: 'Șterge textul', text: 'Sigur vrei să ștergi acest text?', action: () => removeFooter(t.id), successMessage: 'Elementul a fost șters.' })"
                        >
                          Șterge text
                        </v-btn>
                      </div>
                    </div>
                  </div>
                </template>
              </draggable>
            </template>
          </div>
        </v-expand-transition>
      </section>

      <div class="divider" />

      <section class="stack">
        <div class="row sp-between">
          <h2 class="sectionTitle">Mesaje primite</h2>
          <div class="row" style="gap: .25rem;">
            <span class="pill">{{ messages.length }} mesaje</span>
            <v-btn
              :size="actionBtnSize"
              variant="text"
              :icon="chevronFor(messagesSectionOpen)"
              @click="messagesSectionOpen = !messagesSectionOpen"
            />
          </div>
        </div>

        <v-expand-transition>
          <div v-show="messagesSectionOpen" class="stack">
            <div v-if="!rtdb" class="card">
              <strong>Eroare</strong>
              <p class="muted">Realtime Database nu este configurat.</p>
            </div>

            <template v-else>
              <div v-if="messages.length === 0" class="card">
                <strong>Nu există mesaje.</strong>
                <p class="muted">Mesajele trimise din site vor apărea aici.</p>
              </div>

              <div v-else class="messagesList">
                <div v-for="m in messages" :key="m.id" class="card messageCard">
                  <div class="row sp-between messageHead">
                    <div class="stack" style="gap:.25rem; min-width:0;">
                      <div class="muted"><strong>Subiect: </strong>{{ textOrDash(m.subject) }}</div>
                      <div class="muted"><strong>De la: </strong> {{ textOrDash(m.name) }}</div>
                    </div>
                  </div>

                  <div class="divider messageDivider" />

                  <p class="muted messageBody"><strong>Mesaj: </strong><span class="message">{{ textOrDash(m.message) }}</span></p>

                  <div class="messageMeta muted">
                    <div><strong>Telefon:</strong> {{ textOrDash(m.phone) }}</div>
                    <div><strong>E-mail:</strong> {{ textOrDash(m.email) }}</div>
                    <div><strong>Primit:</strong> {{ formatCreatedAt(m.createdAt) }}</div>
                  </div>

                  <div class="row d-flex justify-end mt-4">
                    <v-btn
                      :size="actionBtnSize"
                      variant="outlined"
                      color="red"
                      @click="askConfirmWithSuccess({ title: 'Șterge mesajul', text: 'Sigur vrei să ștergi acest mesaj?', action: () => removeMessage(m.id), successMessage: 'Mesajul a fost șters' })"
                    >
                      Șterge
                    </v-btn>
                  </div>
                </div>
              </div>
            </template>
          </div>
        </v-expand-transition>
      </section>
    </div>

    <!-- Category Edit Dialog -->
    <v-dialog v-model="categoryEditOpen" max-width="720" :persistent="savingCategory">
      <v-card class="card" elevation="2">
			<v-overlay :model-value="savingCategory" contained class="align-center justify-center">
				<v-progress-circular indeterminate color="cyan" />
			</v-overlay>
        <v-card-title>{{ editingCategory ? 'Editează categoria' : 'Adaugă categorie nouă' }}</v-card-title>
        <v-card-text>
          <v-text-field v-model="categoryForm.title" label="Titlu *" variant="outlined" density="compact" autocomplete="off" :rules="[requiredRule]" />
          <v-textarea v-model="categoryForm.description" label="Descriere *" variant="outlined" density="compact" rows="3" autocomplete="off" :rules="[requiredRule]" />
          <v-autocomplete
            v-model="categoryForm.productIds"
            :items="productOptions"
            item-title="title"
            item-value="value"
            density="compact"
            multiple
            chips
            label="Produse asociate"
            variant="outlined"
            autocomplete="off"
          />
          <v-text-field v-model="categoryForm.background" label="Fundal" variant="outlined" density="compact" type="color" autocomplete="off" />
          <ImageUploadField ref="categoryImageFieldRef" v-model="categoryForm.image" folder="categories" :entity-id="categoryForm.id" store-as="storage" label="Imagine categorie *" />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn :size="dialogActionBtnSize" variant="text" :disabled="savingCategory" @click="categoryEditOpen = false">Renunță</v-btn>
          <v-btn :size="dialogActionBtnSize" color="cyan" variant="flat" :loading="savingCategory" :disabled="!isCategoryValid || savingCategory" @click="saveCategory">Salvează</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Product Edit Dialog -->
    <v-dialog v-model="productEditOpen" max-width="720" :persistent="savingProduct">
      <v-card class="card" elevation="2">
			<v-overlay :model-value="savingProduct" contained class="align-center justify-center">
				<v-progress-circular indeterminate color="cyan" />
			</v-overlay>
        <v-card-title>{{ editingProduct ? 'Editează produsul' : 'Adaugă produs' }}</v-card-title>
        <v-card-text>
          <v-text-field v-model="productForm.title" label="Titlu *" variant="outlined" density="compact" autocomplete="off" :rules="[requiredRule]" />
          <v-textarea v-model="productForm.description" label="Descriere *" variant="outlined" density="compact" rows="3" autocomplete="off" :rules="[requiredRule]" />
          <v-text-field v-model="productForm.price" label="Preț (RON) *" variant="outlined" density="compact" type="number" autocomplete="off" :rules="[requiredRule]" />
          <v-text-field v-model="productForm.reducedPrice" label="Preț redus (RON)" variant="outlined" density="compact" type="number" autocomplete="off" />
          <v-checkbox
            v-model="productForm.showProductDiscount"
            class="mt-n2 mb-4"
            :disabled="!canShowDiscountToggle"
            density="compact"
            hide-details
            label="Afișează în pagina de Reduceri"
          />
          <v-text-field v-model="productForm.background" label="Fundal" variant="outlined" density="compact" type="color" autocomplete="off" />
          <ImageUploadField ref="productImageFieldRef" v-model="productForm.image" folder="products" :entity-id="productForm.id" store-as="storage" label="Imagine produs *" />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn :size="dialogActionBtnSize" variant="text" :disabled="savingProduct" @click="productEditOpen = false">Renunță</v-btn>
          <v-btn :size="dialogActionBtnSize" color="cyan" variant="flat" class="ok" :loading="savingProduct" :disabled="!isProductValid || savingProduct" @click="saveProduct">Salvează</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Confirmation Dialog -->
    <v-dialog v-model="confirmOpen" max-width="520" :persistent="confirmLoading">
      <v-card class="card" elevation="2">
      <v-overlay :model-value="confirmLoading" contained class="align-center justify-center">
        <v-progress-circular indeterminate color="cyan" />
      </v-overlay>
        <v-card-title>{{ confirmTitle }}</v-card-title>
        <v-card-text class="muted">{{ confirmText }}</v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn :size="dialogActionBtnSize" variant="text" :disabled="confirmLoading" @click="confirmOpen = false">Renunță</v-btn>
          <v-btn :size="dialogActionBtnSize" color="red" variant="flat" class="ok" :loading="confirmLoading" :disabled="confirmLoading" @click="confirmYes">Șterge</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbarOpen" class="snackbarFit" :color="snackbarColor" location="bottom end" timeout="3000">
      {{ snackbarText }}
    </v-snackbar>
  </div>
</template>

<style scoped>
.field {
  width: 100%;
  background: rgba(255,255,255,.06);
  border: 1px solid rgba(255,255,255,.12);
  border-radius: 10px;
  padding: .7rem .8rem;
  color: var(--text);
}
.color {
  width: 56px;
  height: 34px;
  padding: 0;
  border: 1px solid rgba(255,255,255,.12);
  border-radius: 10px;
  background: transparent;
}

.snackbarFit :deep(.v-snackbar__wrapper) {
  width: fit-content;
  min-width: 0;
  max-width: min(92vw, 720px);
}

.snackbarFit :deep(.v-snackbar__content) {
  width: fit-content;
  white-space: normal;
}
.category {
  border: 1px solid rgba(255,255,255,.06);
  border-left: 0.5rem solid transparent;
  border-radius: 6px;
}
.categoryHead {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: .75rem;
  align-items: flex-start;
}
.categoryHead > .stack {
  min-width: 0;
}
.divider {
  height: 2px;
  background: rgba(255,255,255,.22);
  margin: .9rem 0 0;
}
.sectionDivider {
  margin: 1.25rem 0;
}
.sectionTitle {
  margin: 0;
  font-size: 1.1rem;
}
.message {
  color: var(--accent-);
}
.messagesList {
  display: grid;
  gap: .75rem;
}
.messageCard {
  border: 1px solid rgba(255,255,255,.06);
}
.messageHead {
  align-items: flex-start;
  gap: .75rem;
}
.messageSubject {
  line-height: 1.2;
  word-break: break-word;
}
.messageDivider {
  margin: .75rem 0;
}
.messageBody {
  margin: 0;
  white-space: pre-wrap;
  line-height: 1.55;
}
.messageMeta {
  display: grid;
  gap: .25rem;
  margin-top: .75rem;
  font-size: .85rem;
}
.productsGrid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: .75rem;
}
.productSimple {
  border: 1px solid rgba(255,255,255,.06);
  border-left: 0.5rem solid transparent;
  border-radius: 6px;
}
.productSimpleBody {
  display: grid;
  gap: .5rem;
}
.productSimpleMedia {
  height: 120px;
}
.productActions {
  justify-content: flex-end;
}
.prices {
  justify-content: flex-end;
  gap: .5rem;
}
.priceOld {
  opacity: .9;
  text-decoration: line-through;
  text-decoration-thickness: 2px;
}
.priceNew {
  border-color: color-mix(in srgb, var(--accent) 35%, transparent);
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--accent) 18%, transparent),
    color-mix(in srgb, var(--accent-2) 14%, transparent)
  );
}
.discountPill {
  border-color: color-mix(in srgb, var(--accent-2) 35%, transparent);
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--accent-2) 18%, transparent),
    color-mix(in srgb, var(--accent) 14%, transparent)
  );
}
.catThumb {
  width: min(144px, 38vw);
  aspect-ratio: 1 / 1;
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,.08);
  overflow: hidden;
  display: grid;
  place-items: center;
}
.catThumbImg {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.catThumbEmpty {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  color: rgba(255,255,255,.65);
}
.grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: .75rem;
  margin-top: 1rem;
}
.product {
  overflow: hidden;
  border: 1px solid rgba(255,255,255,.06);
  border-left: 0.5rem solid transparent;
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  height: 100%;
}
.imgSlot {
  height: 120px;
}
.productInCategory .imgSlot {
  height: 88px;
}
.productInCategory :deep(.v-img) {
  height: 88px !important;
}
.productInCategory .info {
  padding-top: .6rem;
  padding-bottom: .6rem;
}
.imgPlaceholder {
  height: 120px;
  background: linear-gradient(180deg, rgba(255,255,255,.04), rgba(255,255,255,.02));
}
.info {
  display: flex;
  flex-direction: column;
  gap: .4rem;
  flex: 1;
}
.name {
  font-size: .98rem;
  line-height: 1.2;
}
.desc {
  display: -webkit-box;
  line-clamp: 2;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin: 0;
  line-height: 1.35;
  min-height: calc(1.35em * 2);
}
.desc.placeholder {
  visibility: hidden;
}
.empty {
  margin-top: .75rem;
}
@media (max-width: 599px) {
  .catThumb {
    width: min(120px, 34vw);
    border-radius: 10px;
  }
  .divider {
    margin-top: .75rem;
  }
  .grid {
    grid-template-columns: 1fr;
    gap: .5rem;
    margin-top: .75rem;
  }
  .productsGrid {
    grid-template-columns: 1fr;
    gap: .5rem;
  }
  .info {
    gap: .3rem;
  }
  .name {
    font-size: .9rem;
  }
  .product :deep(.v-img) {
    height: 96px !important;
  }
}
@media (min-width: 600px) {
  .grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1rem;
  }
}
</style>
