<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useDisplay } from 'vuetify'
import draggable from 'vuedraggable'
import { rtdb, storage } from '../lib/firebase'
import { get, ref as dbRef, update, remove, push, set } from 'firebase/database'
import { deleteObject, ref as storageRef } from 'firebase/storage'
import { useAdminAuthStore } from '../stores/adminAuth'
import {
  addIntroContactText,
  addIntroDiscountText,
  addIntroProductsText,
  addContactInfoItem,
  addFooterText,
  addIntroText,
  deleteMessage,
  deleteContactInfoItem,
  deleteIntroContactText,
  deleteIntroDiscountText,
  deleteIntroProductsText,
  deleteFooterText,
  deleteIntroText,
  listCategories,
  listContactInfo,
  listFooterTexts,
  listIntroContactTexts,
  listIntroDiscountTexts,
  listIntroProductsTexts,
  listIntroTexts,
  listMessages,
  listProducts,
  saveContactInfoRanks,
  saveIntroContactRanks,
  saveIntroDiscountRanks,
  saveIntroProductsRanks,
  saveFooterRanks,
  saveIntroRanks,
  subscribeMessages,
  updateContactInfoItem,
  updateIntroContactText,
  updateIntroDiscountText,
  updateIntroProductsText,
  updateFooterText,
  updateIntroText,
} from '../services/productsService'
import ImageUploadField from '../components/ui/ImageUploadField.vue'
import PageLoader from '../components/ui/PageLoader.vue'

import { getAdminPassword, setAdminPassword } from '../services/adminPasswordService'

const adminAuth = useAdminAuthStore()

const DEFAULT_BG_COLOR = '#543c0e'

const loading = ref(true)
const error = ref('')
const categories = ref([])
const products = ref([])

const productImagesSilentSaving = ref(false)
let productImagesQueuedUrls = null

const introTexts = ref([])
const introAddOpen = ref(false)
const introAddValue = ref('')
const introEditId = ref('')
const introEditValue = ref('')
const introAddTouched = ref(false)
const introEditTouched = ref(false)

const introProductsTexts = ref([])
const introProductsAddOpen = ref(false)
const introProductsAddValue = ref('')
const introProductsEditId = ref('')
const introProductsEditValue = ref('')
const introProductsAddTouched = ref(false)
const introProductsEditTouched = ref(false)

const introDiscountTexts = ref([])
const introDiscountAddOpen = ref(false)
const introDiscountAddValue = ref('')
const introDiscountEditId = ref('')
const introDiscountEditValue = ref('')
const introDiscountAddTouched = ref(false)
const introDiscountEditTouched = ref(false)

const introContactTexts = ref([])
const introContactAddOpen = ref(false)
const introContactAddValue = ref('')
const introContactEditId = ref('')
const introContactEditValue = ref('')
const introContactAddTouched = ref(false)
const introContactEditTouched = ref(false)

const footerTexts = ref([])
const footerAddOpen = ref(false)
const footerAddValue = ref('')
const footerEditId = ref('')
const footerEditValue = ref('')
const footerAddTouched = ref(false)
const footerEditTouched = ref(false)

const messages = ref([])
const messagesSectionOpen = ref(false)

const contactInfoItems = ref([])
const contactInfoSectionOpen = ref(false)
const contactInfoAddOpen = ref(false)
const contactInfoAddLabel = ref('')
const contactInfoAddTexts = ref('')
const contactInfoEditId = ref('')
const contactInfoEditLabel = ref('')
const contactInfoEditTexts = ref('')
const contactInfoAddTouched = ref(false)
const contactInfoEditTouched = ref(false)

const categoriesSectionOpen = ref(false)
const productsSectionOpen = ref(false)
const introSectionOpen = ref(false)
const introProductsSectionOpen = ref(false)
const introDiscountSectionOpen = ref(false)
const introContactSectionOpen = ref(false)
const footerSectionOpen = ref(false)
const generalConfigSectionOpen = ref(false)
const confidentialSectionOpen = ref(false)

const carouselImageNumber = ref(true)
const loadingGeneralConfig = ref(false)
const savingGeneralConfig = ref(false)

const newAdminPassword = ref('')
const newAdminPasswordTouched = ref(false)
const showNewAdminPassword = ref(false)
const savingAdminPassword = ref(false)

const currentAdminPassword = ref('')
const currentAdminPasswordTouched = ref(false)
const showCurrentAdminPassword = ref(false)

const chevronFor = (open) => (open ? 'mdi-chevron-up' : 'mdi-chevron-down')

const introAddTrimmed = computed(() => String(introAddValue.value ?? '').trim())
const introEditTrimmed = computed(() => String(introEditValue.value ?? '').trim())

const introProductsAddTrimmed = computed(() => String(introProductsAddValue.value ?? '').trim())
const introProductsEditTrimmed = computed(() => String(introProductsEditValue.value ?? '').trim())

const introDiscountAddTrimmed = computed(() => String(introDiscountAddValue.value ?? '').trim())
const introDiscountEditTrimmed = computed(() => String(introDiscountEditValue.value ?? '').trim())

const introContactAddTrimmed = computed(() => String(introContactAddValue.value ?? '').trim())
const introContactEditTrimmed = computed(() => String(introContactEditValue.value ?? '').trim())

const footerAddTrimmed = computed(() => String(footerAddValue.value ?? '').trim())
const footerEditTrimmed = computed(() => String(footerEditValue.value ?? '').trim())

const splitLines = (value) => {
  if (value == null) return []
  if (Array.isArray(value)) return value.map((s) => String(s ?? '').trim())

  const raw = String(value)
  // Keep intentional blank lines, but avoid turning a plain empty input into [''].
  if (raw === '' || (raw.trim() === '' && !/\r|\n/.test(raw))) return []

  return raw
    .split(/\r?\n/g)
    .map((s) => String(s).trim())
}

const hasAnyNonEmptyLine = (value) => {
  const lines = splitLines(value)
  return lines.some((s) => String(s).trim())
}

const joinLines = (value, separator = ' ') => {
  return splitLines(value).filter((s) => String(s).trim()).join(separator)
}

const contactInfoAddLabelTrimmed = computed(() => String(contactInfoAddLabel.value ?? '').trim())
const contactInfoEditLabelTrimmed = computed(() => String(contactInfoEditLabel.value ?? '').trim())
const contactInfoAddLines = computed(() => splitLines(contactInfoAddTexts.value))
const contactInfoEditLines = computed(() => splitLines(contactInfoEditTexts.value))

const canSaveIntroAdd = computed(() => Boolean(introAddTrimmed.value))
const canSaveIntroEdit = computed(() => Boolean(introEditId.value) && Boolean(introEditTrimmed.value))

const canSaveIntroProductsAdd = computed(() => Boolean(introProductsAddTrimmed.value))
const canSaveIntroProductsEdit = computed(() => Boolean(introProductsEditId.value) && Boolean(introProductsEditTrimmed.value))

const canSaveIntroDiscountAdd = computed(() => Boolean(introDiscountAddTrimmed.value))
const canSaveIntroDiscountEdit = computed(() => Boolean(introDiscountEditId.value) && Boolean(introDiscountEditTrimmed.value))

const canSaveIntroContactAdd = computed(() => Boolean(introContactAddTrimmed.value))
const canSaveIntroContactEdit = computed(() => Boolean(introContactEditId.value) && Boolean(introContactEditTrimmed.value))

const canSaveFooterAdd = computed(() => Boolean(footerAddTrimmed.value))
const canSaveFooterEdit = computed(() => Boolean(footerEditId.value) && Boolean(footerEditTrimmed.value))

const canSaveContactInfoAdd = computed(() => Boolean(contactInfoAddLabelTrimmed.value) && hasAnyNonEmptyLine(contactInfoAddTexts.value))
const canSaveContactInfoEdit = computed(() => Boolean(contactInfoEditId.value) && Boolean(contactInfoEditLabelTrimmed.value) && hasAnyNonEmptyLine(contactInfoEditTexts.value))

const introRequiredError = 'Câmp obligatoriu.'

const currentAdminPasswordTrimmed = computed(() => String(currentAdminPassword.value ?? '').trim())
const newAdminPasswordTrimmed = computed(() => String(newAdminPassword.value ?? '').trim())
const canSaveNewAdminPassword = computed(() => Boolean(currentAdminPasswordTrimmed.value) && Boolean(newAdminPasswordTrimmed.value))

const canCancelAdminPasswordChange = computed(() => {
  const currentRaw = String(currentAdminPassword.value ?? '')
  const nextRaw = String(newAdminPassword.value ?? '')
  return currentRaw !== '' || nextRaw !== ''
})

const categoryEditOpen = ref(false)
const productEditOpen = ref(false)
const confirmOpen = ref(false)

const savingCategory = ref(false)
const savingProduct = ref(false)
const savingIntroHome = ref(false)
const savingIntroProducts = ref(false)
const savingIntroDiscount = ref(false)
const savingIntroContact = ref(false)
const savingFooter = ref(false)
const savingContactInfo = ref(false)
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

const isAddingCategory = computed(() => Boolean(categoryEditOpen.value) && !editingCategory.value)
const isAddingProduct = computed(() => Boolean(productEditOpen.value) && !editingProduct.value)

const isEditingCategory = computed(() => Boolean(categoryEditOpen.value) && Boolean(editingCategory.value))
const isEditingProduct = computed(() => Boolean(productEditOpen.value) && Boolean(editingProduct.value))

const isAddingIntroHomeText = computed(() => Boolean(introAddOpen.value))
const isAddingIntroProductsText = computed(() => Boolean(introProductsAddOpen.value))
const isAddingIntroDiscountText = computed(() => Boolean(introDiscountAddOpen.value))
const isAddingIntroContactText = computed(() => Boolean(introContactAddOpen.value))
const isAddingFooterText = computed(() => Boolean(footerAddOpen.value))
const isAddingContactInfoSection = computed(() => Boolean(contactInfoAddOpen.value))

const isEditingIntroHomeText = computed(() => Boolean(introEditId.value))
const isEditingIntroProductsText = computed(() => Boolean(introProductsEditId.value))
const isEditingIntroDiscountText = computed(() => Boolean(introDiscountEditId.value))
const isEditingIntroContactText = computed(() => Boolean(introContactEditId.value))
const isEditingFooterText = computed(() => Boolean(footerEditId.value))
const isEditingContactInfoSection = computed(() => Boolean(contactInfoEditId.value))

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
  showProductPrice: false,
  showProductDiscount: false,
  background: '#0b1220',
  images: [],
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

const categoryDialogMaxWidth = computed(() => (display.mdAndUp.value ? 860 : 720))
const productDialogMaxWidth = computed(() => (display.mdAndUp.value ? 860 : 720))
const confirmDialogMaxWidth = computed(() => (display.mdAndUp.value ? 600 : 520))

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
  const raw = productForm.value?.images
  const urls = Array.isArray(raw)
    ? raw.map((u) => String(u ?? '').trim()).filter(Boolean)
    : []
  const urlOk = urls.length > 0
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
  const showPrice = Boolean(p?.showProductPrice)
  const hasPrice = Boolean(String(p.price || '').trim())
  const hasReduced = Boolean(String(p.reducedPrice || '').trim())
  const discountOk = !Boolean(p.showProductDiscount) || !showPrice || (hasPrice && hasReduced)
  return (
    Boolean(String(p.title || '').trim()) &&
    hasAnyNonEmptyLine(p.description) &&
    (!showPrice || hasPrice) &&
    discountOk &&
    productHasImage.value
  )
})

const isPriceRequired = computed(() => Boolean(productForm.value?.showProductPrice))
const isReducedPriceRequired = computed(() => Boolean(productForm.value?.showProductPrice) && Boolean(productForm.value?.showProductDiscount))

async function refresh() {
  loading.value = true
  error.value = ''
  try {
    const [cats, prods, intro, introProds, introDisc, introCont, footer, contactInfo, msgs] = await Promise.all([
      listCategories(),
      listProducts(),
      listIntroTexts(),
      listIntroProductsTexts(),
      listIntroDiscountTexts(),
      listIntroContactTexts(),
      listFooterTexts(),
      listContactInfo(),
      listMessages(),
    ])
    categories.value = cats
    products.value = prods
    introTexts.value = intro
    introProductsTexts.value = introProds
    introDiscountTexts.value = introDisc
    introContactTexts.value = introCont
    footerTexts.value = footer
    contactInfoItems.value = contactInfo
    messages.value = msgs
    introAddOpen.value = false
    introAddValue.value = ''
    introEditId.value = ''
    introEditValue.value = ''
    introAddTouched.value = false
    introEditTouched.value = false

    introProductsAddOpen.value = false
    introProductsAddValue.value = ''
    introProductsEditId.value = ''
    introProductsEditValue.value = ''
    introProductsAddTouched.value = false
    introProductsEditTouched.value = false

    introDiscountAddOpen.value = false
    introDiscountAddValue.value = ''
    introDiscountEditId.value = ''
    introDiscountEditValue.value = ''
    introDiscountAddTouched.value = false
    introDiscountEditTouched.value = false

    introContactAddOpen.value = false
    introContactAddValue.value = ''
    introContactEditId.value = ''
    introContactEditValue.value = ''
    introContactAddTouched.value = false
    introContactEditTouched.value = false

    footerAddOpen.value = false
    footerAddValue.value = ''
    footerEditId.value = ''
    footerEditValue.value = ''
    footerAddTouched.value = false
    footerEditTouched.value = false

    contactInfoAddOpen.value = false
    contactInfoAddLabel.value = ''
    contactInfoAddTexts.value = ''
    contactInfoEditId.value = ''
    contactInfoEditLabel.value = ''
    contactInfoEditTexts.value = ''
    contactInfoAddTouched.value = false
    contactInfoEditTouched.value = false
  } catch (e) {
    error.value = e?.message || String(e)
  } finally {
    loading.value = false
  }
}

onMounted(refresh)

async function loadGeneralConfig() {
  if (!rtdb) return

  loadingGeneralConfig.value = true
  try {
    const flagRef = dbRef(rtdb, 'configuration/carouselImageNumber')
    const snap = await get(flagRef)

    if (!snap.exists()) {
      await set(flagRef, true)
      carouselImageNumber.value = true
      return
    }

    const raw = snap.val()
    if (typeof raw === 'boolean') carouselImageNumber.value = raw
    else {
      await set(flagRef, true)
      carouselImageNumber.value = true
    }
  } catch (e) {
    // If config fails to load, keep safe default.
    carouselImageNumber.value = true
  } finally {
    loadingGeneralConfig.value = false
  }
}

async function saveCarouselImageNumber(next) {
  if (!rtdb) {
    showError('Realtime Database nu este configurat.')
    carouselImageNumber.value = true
    return
  }
  if (savingGeneralConfig.value) return

  savingGeneralConfig.value = true
  try {
    const value = Boolean(next)
    await set(dbRef(rtdb, 'configuration/carouselImageNumber'), value)
    carouselImageNumber.value = value
    showSuccess('Configurarea a fost salvată.')
  } catch (e) {
    error.value = e?.message || String(e)
    showError('Nu am putut salva configurarea.')
  } finally {
    savingGeneralConfig.value = false
  }
}

onMounted(loadGeneralConfig)

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
    background: c.background || DEFAULT_BG_COLOR,
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
    background: DEFAULT_BG_COLOR,
    image: '',
    productIds: [],
  }
  categoryEditOpen.value = true
}

async function openProductEdit(p) {
  // NOTE: The list in-memory can be stale if RTDB was edited manually.
  // Fetch latest snapshot so textarea line-count matches RTDB exactly.
  const pid = String(p?.id ?? '')
  let latest = p
  if (rtdb && pid) {
    try {
      const snap = await get(dbRef(rtdb, `products/${pid}`))
      const raw = snap.exists() ? snap.val() : null
      if (raw && typeof raw === 'object') {
        latest = { ...raw, id: pid }
      }
    } catch {
      // Ignore and fall back to the in-memory product.
    }
  }

  editingProduct.value = latest
  productImageFieldRef.value?.clearPendingFile?.()

  productForm.value = {
    id: String(latest?.id ?? ''),
    title: latest?.title || '',
    description: Array.isArray(latest?.description)
      ? latest.description.map((s) => String(s ?? '').trim()).join('\n')
      : String(latest?.description ?? ''),
    materials: Array.isArray(latest?.materials)
      ? latest.materials.map((s) => String(s ?? '').trim()).join('\n')
      : String(latest?.materials ?? ''),
    specifications: Array.isArray(latest?.specifications)
      ? latest.specifications.map((s) => String(s ?? '').trim()).join('\n')
      : String(latest?.specifications ?? ''),
    dimensions: Array.isArray(latest?.dimensions)
      ? latest.dimensions.map((s) => String(s ?? '').trim()).join('\n')
      : String(latest?.dimensions ?? ''),
    price: latest?.price || '',
    reducedPrice: latest?.reducedPrice || '',
    showProductPrice: latest?.showProductPrice !== false,
    showProductDiscount: Boolean(latest?.showProductDiscount),
    background: latest?.background || DEFAULT_BG_COLOR,
    images: Array.isArray(latest?.images)
      ? latest.images.map((u) => String(u ?? '').trim()).filter(Boolean)
      : (String(latest?.image ?? '').trim() ? [String(latest.image).trim()] : []),
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
    materials: '',
    specifications: '',
    dimensions: '',
    price: '',
    reducedPrice: '',
    showProductPrice: false,
    showProductDiscount: false,
    background: DEFAULT_BG_COLOR,
    images: [],
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

function showError(message) {
  snackbarColor.value = 'error'
  snackbarText.value = String(message || '').trim() || 'A apărut o eroare'
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
    background: c.background || DEFAULT_BG_COLOR,
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
  showSuccess('Categoria a fost salvată.')
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
    await productImageFieldRef.value?.uploadSelected?.({ entityId: productId, storeAs: 'storage' })

    const images = Array.isArray(p.images)
      ? p.images.map((u) => String(u ?? '').trim()).filter(Boolean)
      : []
    const primaryImage = images[0] || ''

  const payload = {
    title,
    description: splitLines(p?.description),
    materials: splitLines(p?.materials),
    specifications: splitLines(p?.specifications),
    dimensions: splitLines(p?.dimensions),
    price: String(p.price || '').trim(),
    reducedPrice: String(p.reducedPrice || '').trim(),
    showProductPrice: Boolean(p.showProductPrice),
    showProductDiscount: Boolean(p.showProductDiscount),
    background: p.background || DEFAULT_BG_COLOR,
    image: primaryImage,
    images,
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
  showSuccess('Produsul a fost salvat.')
  await refresh()
  } catch (e) {
    error.value = e?.message || String(e)
    showError()
  } finally {
    savingProduct.value = false
  }
}

async function persistProductImagesSilently(nextUrls) {
  if (!rtdb) return
  if (!isEditingProduct.value) return
  const productId = String(productForm.value?.id || '').trim()
  if (!productId) return

  const urls = Array.isArray(nextUrls)
    ? nextUrls.map((u) => String(u ?? '').trim()).filter(Boolean)
    : []

  // Keep only the latest requested state if multiple deletes happen quickly.
  if (productImagesSilentSaving.value) {
    productImagesQueuedUrls = urls
    return
  }

  productImagesSilentSaving.value = true
  try {
    await update(dbRef(rtdb, `products/${productId}`), {
      images: urls,
      image: urls[0] || '',
      updatedAt: Date.now(),
    })

    // Update local in-memory lists too, so UI doesn't keep a stale/broken URL.
    if (editingProduct.value && String(editingProduct.value?.id || '') === productId) {
      editingProduct.value = { ...editingProduct.value, images: urls, image: urls[0] || '' }
    }
    const idx = products.value.findIndex((p) => String(p?.id || '') === productId)
    if (idx >= 0) {
      products.value[idx] = { ...products.value[idx], images: urls, image: urls[0] || '' }
    }
  } catch (e) {
    // Silent background save: don't block the user, but surface an error.
    error.value = e?.message || String(e)
    showError(error.value)
  } finally {
    productImagesSilentSaving.value = false
    if (productImagesQueuedUrls) {
      const queued = productImagesQueuedUrls
      productImagesQueuedUrls = null
      // Re-run once with the latest queued state.
      await persistProductImagesSilently(queued)
    }
  }
}

function onProductImagesDeleted(payload) {
  // Payload comes from ImageUploadField: { removedUrl, nextUrls }
  persistProductImagesSilently(payload?.nextUrls)
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
  const productImages = Array.isArray(product?.images)
    ? product.images.map((u) => String(u ?? '').trim()).filter(Boolean)
    : []
  if (!productImages.length && String(product?.image || '').trim()) productImages.push(String(product.image).trim())
  await remove(dbRef(rtdb, `products/${productId}`))
  await Promise.all(productImages.map((u) => deleteStorageObjectByUrl(u)))
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
  if (savingIntroHome.value) return
  savingIntroHome.value = true
  try {
    introAddTouched.value = true
    if (!canSaveIntroAdd.value) return
    await addIntroText(introAddTrimmed.value)
    await refresh()
    showSuccess('Textul a fost salvat.')
  } catch (e) {
    error.value = e?.message || String(e)
    showError()
  } finally {
    savingIntroHome.value = false
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
  if (savingIntroHome.value) return
  savingIntroHome.value = true
  try {
    introEditTouched.value = true
    if (!canSaveIntroEdit.value) return
    const current = introTexts.value.find((x) => String(x?.id) === String(itemId))
    await updateIntroText(itemId, introEditTrimmed.value, current?.rank)
    await refresh()
    showSuccess('Textul a fost salvat.')
  } catch (e) {
    error.value = e?.message || String(e)
    showError()
  } finally {
    savingIntroHome.value = false
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

function startIntroProductsAdd() {
  introProductsAddOpen.value = true
  introProductsAddValue.value = ''
  introProductsEditId.value = ''
  introProductsEditValue.value = ''
  introProductsAddTouched.value = false
  introProductsEditTouched.value = false
}

function cancelIntroProductsAdd() {
  introProductsAddOpen.value = false
  introProductsAddValue.value = ''
  introProductsAddTouched.value = false
}

async function saveIntroProductsAdd() {
  error.value = ''
  if (savingIntroProducts.value) return
  savingIntroProducts.value = true
  try {
    introProductsAddTouched.value = true
    if (!canSaveIntroProductsAdd.value) return
    await addIntroProductsText(introProductsAddTrimmed.value)
    await refresh()
    showSuccess('Textul a fost salvat.')
  } catch (e) {
    error.value = e?.message || String(e)
    showError()
  } finally {
    savingIntroProducts.value = false
  }
}

function startIntroProductsEdit(item) {
  introProductsEditId.value = String(item?.id || '')
  introProductsEditValue.value = String(item?.text || '')
  introProductsAddOpen.value = false
  introProductsAddValue.value = ''
  introProductsEditTouched.value = false
}

function cancelIntroProductsEdit() {
  introProductsEditId.value = ''
  introProductsEditValue.value = ''
  introProductsEditTouched.value = false
}

async function saveIntroProductsEdit(itemId) {
  error.value = ''
  if (savingIntroProducts.value) return
  savingIntroProducts.value = true
  try {
    introProductsEditTouched.value = true
    if (!canSaveIntroProductsEdit.value) return
    const current = introProductsTexts.value.find((x) => String(x?.id) === String(itemId))
    await updateIntroProductsText(itemId, introProductsEditTrimmed.value, current?.rank)
    await refresh()
    showSuccess('Textul a fost salvat.')
  } catch (e) {
    error.value = e?.message || String(e)
    showError()
  } finally {
    savingIntroProducts.value = false
  }
}

async function removeIntroProducts(itemId) {
  error.value = ''
  try {
    await deleteIntroProductsText(itemId)
    await refresh()
  } catch (e) {
    error.value = e?.message || String(e)
		throw e
  }
}

async function persistIntroProductsOrder() {
  if (!rtdb) return
  error.value = ''
  introProductsEditId.value = ''
  introProductsEditValue.value = ''
  introProductsEditTouched.value = false
  introProductsAddOpen.value = false
  introProductsAddValue.value = ''
  introProductsAddTouched.value = false
  introProductsTexts.value = introProductsTexts.value.map((t, idx) => ({ ...t, rank: idx }))
  try {
    await saveIntroProductsRanks(introProductsTexts.value)
  } catch (e) {
    error.value = e?.message || String(e)
  }
}

function startIntroDiscountAdd() {
  introDiscountAddOpen.value = true
  introDiscountAddValue.value = ''
  introDiscountEditId.value = ''
  introDiscountEditValue.value = ''
  introDiscountAddTouched.value = false
  introDiscountEditTouched.value = false
}

function cancelIntroDiscountAdd() {
  introDiscountAddOpen.value = false
  introDiscountAddValue.value = ''
  introDiscountAddTouched.value = false
}

async function saveIntroDiscountAdd() {
  error.value = ''
  if (savingIntroDiscount.value) return
  savingIntroDiscount.value = true
  try {
    introDiscountAddTouched.value = true
    if (!canSaveIntroDiscountAdd.value) return
    await addIntroDiscountText(introDiscountAddTrimmed.value)
    await refresh()
    showSuccess('Textul a fost salvat.')
  } catch (e) {
    error.value = e?.message || String(e)
    showError()
  } finally {
    savingIntroDiscount.value = false
  }
}

function startIntroDiscountEdit(item) {
  introDiscountEditId.value = String(item?.id || '')
  introDiscountEditValue.value = String(item?.text || '')
  introDiscountAddOpen.value = false
  introDiscountAddValue.value = ''
  introDiscountEditTouched.value = false
}

function cancelIntroDiscountEdit() {
  introDiscountEditId.value = ''
  introDiscountEditValue.value = ''
  introDiscountEditTouched.value = false
}

async function saveIntroDiscountEdit(itemId) {
  error.value = ''
  if (savingIntroDiscount.value) return
  savingIntroDiscount.value = true
  try {
    introDiscountEditTouched.value = true
    if (!canSaveIntroDiscountEdit.value) return
    const current = introDiscountTexts.value.find((x) => String(x?.id) === String(itemId))
    await updateIntroDiscountText(itemId, introDiscountEditTrimmed.value, current?.rank)
    await refresh()
    showSuccess('Textul a fost salvat.')
  } catch (e) {
    error.value = e?.message || String(e)
    showError()
  } finally {
    savingIntroDiscount.value = false
  }
}

async function removeIntroDiscount(itemId) {
  error.value = ''
  try {
    await deleteIntroDiscountText(itemId)
    await refresh()
  } catch (e) {
    error.value = e?.message || String(e)
		throw e
  }
}

async function persistIntroDiscountOrder() {
  if (!rtdb) return
  error.value = ''
  introDiscountEditId.value = ''
  introDiscountEditValue.value = ''
  introDiscountEditTouched.value = false
  introDiscountAddOpen.value = false
  introDiscountAddValue.value = ''
  introDiscountAddTouched.value = false
  introDiscountTexts.value = introDiscountTexts.value.map((t, idx) => ({ ...t, rank: idx }))
  try {
    await saveIntroDiscountRanks(introDiscountTexts.value)
  } catch (e) {
    error.value = e?.message || String(e)
  }
}

function startIntroContactAdd() {
  introContactAddOpen.value = true
  introContactAddValue.value = ''
  introContactEditId.value = ''
  introContactEditValue.value = ''
  introContactAddTouched.value = false
  introContactEditTouched.value = false
}

function cancelIntroContactAdd() {
  introContactAddOpen.value = false
  introContactAddValue.value = ''
  introContactAddTouched.value = false
}

async function saveIntroContactAdd() {
  error.value = ''
  if (savingIntroContact.value) return
  savingIntroContact.value = true
  try {
    introContactAddTouched.value = true
    if (!canSaveIntroContactAdd.value) return
    await addIntroContactText(introContactAddTrimmed.value)
    await refresh()
    showSuccess('Textul a fost salvat.')
  } catch (e) {
    error.value = e?.message || String(e)
    showError()
  } finally {
    savingIntroContact.value = false
  }
}

function startIntroContactEdit(item) {
  introContactEditId.value = String(item?.id || '')
  introContactEditValue.value = String(item?.text || '')
  introContactAddOpen.value = false
  introContactAddValue.value = ''
  introContactEditTouched.value = false
}

function cancelIntroContactEdit() {
  introContactEditId.value = ''
  introContactEditValue.value = ''
  introContactEditTouched.value = false
}

async function saveIntroContactEdit(itemId) {
  error.value = ''
  if (savingIntroContact.value) return
  savingIntroContact.value = true
  try {
    introContactEditTouched.value = true
    if (!canSaveIntroContactEdit.value) return
    const current = introContactTexts.value.find((x) => String(x?.id) === String(itemId))
    await updateIntroContactText(itemId, introContactEditTrimmed.value, current?.rank)
    await refresh()
    showSuccess('Textul a fost salvat.')
  } catch (e) {
    error.value = e?.message || String(e)
    showError()
  } finally {
    savingIntroContact.value = false
  }
}

async function removeIntroContact(itemId) {
  error.value = ''
  try {
    await deleteIntroContactText(itemId)
    await refresh()
  } catch (e) {
    error.value = e?.message || String(e)
		throw e
  }
}

async function persistIntroContactOrder() {
  if (!rtdb) return
  error.value = ''
  introContactEditId.value = ''
  introContactEditValue.value = ''
  introContactEditTouched.value = false
  introContactAddOpen.value = false
  introContactAddValue.value = ''
  introContactAddTouched.value = false
  introContactTexts.value = introContactTexts.value.map((t, idx) => ({ ...t, rank: idx }))
  try {
    await saveIntroContactRanks(introContactTexts.value)
  } catch (e) {
    error.value = e?.message || String(e)
  }
}

function cancelFooterAdd() {
  footerAddOpen.value = false
  footerAddValue.value = ''
  footerAddTouched.value = false
}

async function saveFooterAdd() {
  error.value = ''
  if (savingFooter.value) return
  savingFooter.value = true
  try {
    footerAddTouched.value = true
    if (!canSaveFooterAdd.value) return
    await addFooterText(footerAddTrimmed.value)
    await refresh()
    showSuccess('Textul a fost salvat.')
  } catch (e) {
    error.value = e?.message || String(e)
    showError()
  } finally {
    savingFooter.value = false
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
  if (savingFooter.value) return
  savingFooter.value = true
  try {
    footerEditTouched.value = true
    if (!canSaveFooterEdit.value) return
    const current = footerTexts.value.find((x) => String(x?.id) === String(itemId))
    await updateFooterText(itemId, footerEditTrimmed.value, current?.rank)
    await refresh()
    showSuccess('Textul a fost salvat.')
  } catch (e) {
    error.value = e?.message || String(e)
    showError()
  } finally {
    savingFooter.value = false
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

function startContactInfoAdd() {
  contactInfoAddOpen.value = true
  contactInfoAddLabel.value = ''
  contactInfoAddTexts.value = ''
  contactInfoEditId.value = ''
  contactInfoEditLabel.value = ''
  contactInfoEditTexts.value = ''
  contactInfoAddTouched.value = false
  contactInfoEditTouched.value = false
}

function cancelContactInfoAdd() {
  contactInfoAddOpen.value = false
  contactInfoAddLabel.value = ''
  contactInfoAddTexts.value = ''
  contactInfoAddTouched.value = false
}

async function saveContactInfoAdd() {
  error.value = ''
  if (savingContactInfo.value) return
  savingContactInfo.value = true
  try {
    contactInfoAddTouched.value = true
    if (!canSaveContactInfoAdd.value) return
    await addContactInfoItem(contactInfoAddLabelTrimmed.value, contactInfoAddLines.value)
    await refresh()
    showSuccess('Secțiune Contact salvată.')
  } catch (e) {
    error.value = e?.message || String(e)
    showError()
  } finally {
    savingContactInfo.value = false
  }
}

function startContactInfoEdit(item) {
  contactInfoEditId.value = String(item?.id || '')
  contactInfoEditLabel.value = String(item?.label || '')
  contactInfoEditTexts.value = Array.isArray(item?.texts) ? item.texts.join('\n') : ''
  contactInfoAddOpen.value = false
  contactInfoAddLabel.value = ''
  contactInfoAddTexts.value = ''
  contactInfoEditTouched.value = false
}

function cancelContactInfoEdit() {
  contactInfoEditId.value = ''
  contactInfoEditLabel.value = ''
  contactInfoEditTexts.value = ''
  contactInfoEditTouched.value = false
}

async function saveContactInfoEdit(itemId) {
  error.value = ''
  if (savingContactInfo.value) return
  savingContactInfo.value = true
  try {
    contactInfoEditTouched.value = true
    if (!canSaveContactInfoEdit.value) return
    const current = contactInfoItems.value.find((x) => String(x?.id) === String(itemId))
    await updateContactInfoItem(itemId, contactInfoEditLabelTrimmed.value, contactInfoEditLines.value, current?.rank)
    await refresh()
    showSuccess('Secțiune Contact salvată.')
  } catch (e) {
    error.value = e?.message || String(e)
    showError()
  } finally {
    savingContactInfo.value = false
  }
}

async function removeContactInfo(itemId) {
  error.value = ''
  try {
    await deleteContactInfoItem(itemId)
    await refresh()
  } catch (e) {
    error.value = e?.message || String(e)
    throw e
  }
}

async function persistContactInfoOrder() {
  if (!rtdb) return
  error.value = ''

  contactInfoEditId.value = ''
  contactInfoEditLabel.value = ''
  contactInfoEditTexts.value = ''
  contactInfoEditTouched.value = false
  contactInfoAddOpen.value = false
  contactInfoAddLabel.value = ''
  contactInfoAddTexts.value = ''
  contactInfoAddTouched.value = false

  contactInfoItems.value = contactInfoItems.value.map((t, idx) => ({ ...t, rank: idx }))

  try {
    await saveContactInfoRanks(contactInfoItems.value)
  } catch (e) {
    error.value = e?.message || String(e)
    showError()
  }
}

async function saveNewAdminPassword() {
  error.value = ''
  if (savingAdminPassword.value) return

  currentAdminPasswordTouched.value = true
  newAdminPasswordTouched.value = true
  if (!canSaveNewAdminPassword.value) return

  savingAdminPassword.value = true
  try {
    const expected = await getAdminPassword()
    const expectedTrimmed = String(expected ?? '').trim()

    if (!expectedTrimmed) {
      showError('Parola admin nu este setată încă.')
      return
    }

    if (currentAdminPasswordTrimmed.value !== expectedTrimmed) {
      showError('Parola curentă nu este corectă.')
      return
    }

    await setAdminPassword(newAdminPasswordTrimmed.value)
    currentAdminPassword.value = ''
    currentAdminPasswordTouched.value = false
    showCurrentAdminPassword.value = false
    newAdminPassword.value = ''
    newAdminPasswordTouched.value = false
    showNewAdminPassword.value = false
    showSuccess('Parola admin a fost actualizată.')
  } catch (e) {
    showError(e?.message || String(e))
  } finally {
    savingAdminPassword.value = false
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
                :disabled="categoryEditOpen"
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
            <div class="categoryHead">
              <div class="catThumb" aria-hidden="true">
                <img v-if="c.image" class="catThumbImg" :src="c.image" alt="" />
                <div v-else class="catThumbEmpty">
                  <v-icon size="56">mdi-cloud-upload</v-icon>
                </div>
              </div>

              <strong class="categoryTitle">{{ c.title }}</strong>
              <p v-if="c.description" class="muted categoryDescription">{{ c.description }}</p>
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
                  <v-img v-if="p.image" :src="p.image" height="120" cover alt="">
                    <template #placeholder>
                      <div class="d-flex align-center justify-center fill-height">
                        <v-progress-circular indeterminate size="28" width="3" color="cyan" />
                      </div>
                    </template>
                  </v-img>
                  <div v-else class="imgPlaceholder" />
                </div>
                <v-card-text class="info">
                  <div class="row sp-between">
                    <strong class="name mb-2">{{ p.title }}</strong>
                  </div>
                </v-card-text>
              </v-card>
            </div>

            <div v-if="(productsByCategoryId.get(String(c.id)) || []).length === 0" class="muted empty">
              Nu există produse asociate acestei categorii.
            </div>

            <div class="row d-flex justify-end mt-4">
              <v-btn :size="actionBtnSize" variant="outlined" color="cyan" :disabled="isAddingCategory" @click="openCategoryEdit(c)">
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
            <span class="pill">{{ products.length }} {{ products.length === 1 ? 'produs' : 'produse' }}</span>
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
                :disabled="productEditOpen"
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
                  <v-img v-if="p.image" :src="p.image" height="120" cover alt="">
                    <template #placeholder>
                      <div class="d-flex align-center justify-center fill-height">
                        <v-progress-circular indeterminate size="28" width="3" color="cyan" />
                      </div>
                    </template>
                  </v-img>
                  <div v-else class="imgPlaceholder" />
                </div>

                <v-card-text class="productSimpleBody">
                  <div class="row sp-between">
                    <strong class="name">{{ p.title }}</strong>
                    <div class="row prices">
                      <span v-if="p.showProductPrice !== false && p.price" class="pill" :class="{ priceOld: p.reducedPrice }">{{ p.price }} RON</span>
                      <span v-if="p.showProductPrice !== false && p.reducedPrice" class="pill priceNew">{{ p.reducedPrice }} RON</span>
                      <span v-if="p.showProductDiscount" class="pill discountPill">Reducere</span>
                    </div>
                  </div>
                  <div class="row sp-between align-center">
                    <span class="muted"><strong>Categorie:</strong> {{ getCategoryTitleById(p.categoryId) }}</span>
                  </div>
                  <p class="muted desc" :class="{ placeholder: !joinLines(p.description) }"><strong>Descriere:</strong> {{ joinLines(p.description) || '' }}</p>
                  <div class="row d-flex productActions">
                    <v-btn :size="actionBtnSize" variant="outlined" color="cyan" :disabled="isAddingProduct" @click="openProductEdit(p)">
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
          <h2 class="sectionTitle">Texte - Acasă</h2>
          <div class="row" style="gap: .25rem;">
            <span class="pill">{{ introTexts.length }} {{ introTexts.length === 1 ? 'text' : 'texte' }}</span>
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
                <v-btn v-if="!introAddOpen" color="cyan" variant="flat" :size="actionBtnSize" :disabled="isEditingIntroHomeText || savingIntroHome" @click="startIntroAdd">
                  Adaugă text nou
                </v-btn>
              </div>

              <div class="card" v-if="introAddOpen" style="position: relative;">
                <v-overlay :model-value="savingIntroHome" contained class="align-center justify-center">
                  <v-progress-circular indeterminate color="cyan" />
                </v-overlay>
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
                    <v-btn :size="actionBtnSize" variant="text" :disabled="savingIntroHome" @click="cancelIntroAdd">Renunță</v-btn>
                    <v-btn :size="actionBtnSize" color="cyan" variant="flat" :loading="savingIntroHome" :disabled="savingIntroHome || !canSaveIntroAdd" @click="saveIntroAdd">Salvează</v-btn>
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
                  <div class="card mb-2" :style="introEditId === String(t.id) ? { position: 'relative' } : undefined">
                    <div v-if="introEditId === String(t.id)" class="stack">
                      <v-overlay :model-value="savingIntroHome" contained class="align-center justify-center">
                        <v-progress-circular indeterminate color="cyan" />
                      </v-overlay>
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
                      <div class="row d-flex justify-end">
                        <v-btn :size="actionBtnSize" variant="text" :disabled="savingIntroHome" @click="cancelIntroEdit">Renunță</v-btn>
                        <v-btn :size="actionBtnSize" color="cyan" variant="flat" :loading="savingIntroHome" :disabled="savingIntroHome || !canSaveIntroEdit" @click="saveIntroEdit(t.id)">Salvează</v-btn>
                      </div>
                    </div>

                    <div v-else class="stack">
                      <div class="muted" style="line-height: 1.5;">{{ t.text }}</div>
                      <div class="row d-flex justify-end">
                        <v-btn :size="actionBtnSize" variant="outlined" color="cyan" :disabled="isAddingIntroHomeText" @click="startIntroEdit(t)">Editează text</v-btn>
                        <v-btn
                          :size="actionBtnSize"
                          variant="outlined"
                          color="red"
                          @click="askConfirmWithSuccess({ title: 'Șterge textul', text: 'Sigur vrei să ștergi acest text?', action: () => removeIntro(t.id), successMessage: 'Textul a fost șters.' })"
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
        <h2 class="sectionTitle">Texte - Produse</h2>
        <div class="row" style="gap: .25rem;">
          <span class="pill">{{ introProductsTexts.length }} {{ introProductsTexts.length === 1 ? 'text' : 'texte' }}</span>
          <v-btn
            :size="actionBtnSize"
            variant="text"
            :icon="chevronFor(introProductsSectionOpen)"
            @click="introProductsSectionOpen = !introProductsSectionOpen"
          />
        </div>
      </div>

      <v-expand-transition>
        <div v-show="introProductsSectionOpen" class="stack">
          <div v-if="!rtdb" class="card">
            <strong>Eroare</strong>
            <p class="muted">Realtime Database nu este configurat.</p>
          </div>

          <template v-else>
            <div class="row d-flex justify-end">
              <v-btn v-if="!introProductsAddOpen" color="cyan" variant="flat" :size="actionBtnSize" :disabled="isEditingIntroProductsText || savingIntroProducts" @click="startIntroProductsAdd">
                Adaugă text nou
              </v-btn>
            </div>

            <div class="card" v-if="introProductsAddOpen" style="position: relative;">
              <v-overlay :model-value="savingIntroProducts" contained class="align-center justify-center">
                <v-progress-circular indeterminate color="cyan" />
              </v-overlay>
              <div class="stack">
                <v-text-field
                  v-model="introProductsAddValue"
                  label="Text nou *"
                  variant="outlined"
                  density="compact"
                  hide-details
                  autocomplete="off"
                  :error="introProductsAddTouched && !introProductsAddTrimmed"
                  :error-messages="introProductsAddTouched && !introProductsAddTrimmed ? introRequiredError : ''"
                  @blur="introProductsAddTouched = true"
                />
                <div class="row d-flex justify-end">
                  <v-btn :size="actionBtnSize" variant="text" :disabled="savingIntroProducts" @click="cancelIntroProductsAdd">Renunță</v-btn>
                  <v-btn :size="actionBtnSize" color="cyan" variant="flat" :loading="savingIntroProducts" :disabled="savingIntroProducts || !canSaveIntroProductsAdd" @click="saveIntroProductsAdd">Salvează</v-btn>
                </div>
              </div>
            </div>

            <div v-if="introProductsTexts.length === 0" class="card">
              <strong>Nu există texte încă.</strong>
              <p class="muted">Adaugă primul text și va apărea pe pagina Produse.</p>
            </div>

            <draggable
              v-model="introProductsTexts"
              item-key="id"
              :delay="300"
              :delay-on-touch-only="true"
              @end="persistIntroProductsOrder"
            >
              <template #item="{ element: t }">
                <div class="card mb-2" :style="introProductsEditId === String(t.id) ? { position: 'relative' } : undefined">
                  <div v-if="introProductsEditId === String(t.id)" class="stack">
                    <v-overlay :model-value="savingIntroProducts" contained class="align-center justify-center">
                      <v-progress-circular indeterminate color="cyan" />
                    </v-overlay>
                    <v-text-field
                      v-model="introProductsEditValue"
                      label="Text *"
                      variant="outlined"
                      density="compact"
                      hide-details
                      autocomplete="off"
                      :error="introProductsEditTouched && !introProductsEditTrimmed"
                      :error-messages="introProductsEditTouched && !introProductsEditTrimmed ? introRequiredError : ''"
                      @blur="introProductsEditTouched = true"
                    />
                    <div class="row d-flex justify-end">
                      <v-btn :size="actionBtnSize" variant="text" :disabled="savingIntroProducts" @click="cancelIntroProductsEdit">Renunță</v-btn>
                      <v-btn :size="actionBtnSize" color="cyan" variant="flat" :loading="savingIntroProducts" :disabled="savingIntroProducts || !canSaveIntroProductsEdit" @click="saveIntroProductsEdit(t.id)">Salvează</v-btn>
                    </div>
                  </div>

                  <div v-else class="stack">
                    <div class="muted" style="line-height: 1.5;">{{ t.text }}</div>
                    <div class="row d-flex justify-end">
                      <v-btn :size="actionBtnSize" variant="outlined" color="cyan" :disabled="isAddingIntroProductsText" @click="startIntroProductsEdit(t)">Editează text</v-btn>
                      <v-btn
                        :size="actionBtnSize"
                        variant="outlined"
                        color="red"
                        @click="askConfirmWithSuccess({ title: 'Șterge textul', text: 'Sigur vrei să ștergi acest text?', action: () => removeIntroProducts(t.id), successMessage: 'Textul a fost șters.' })"
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
        <h2 class="sectionTitle">Texte - Reduceri</h2>
        <div class="row" style="gap: .25rem;">
          <span class="pill">{{ introDiscountTexts.length }} {{ introDiscountTexts.length === 1 ? 'text' : 'texte' }}</span>
          <v-btn
            :size="actionBtnSize"
            variant="text"
            :icon="chevronFor(introDiscountSectionOpen)"
            @click="introDiscountSectionOpen = !introDiscountSectionOpen"
          />
        </div>
      </div>

      <v-expand-transition>
        <div v-show="introDiscountSectionOpen" class="stack">
          <div v-if="!rtdb" class="card">
            <strong>Eroare</strong>
            <p class="muted">Realtime Database nu este configurat.</p>
          </div>

          <template v-else>
            <div class="row d-flex justify-end">
              <v-btn v-if="!introDiscountAddOpen" color="cyan" variant="flat" :size="actionBtnSize" :disabled="isEditingIntroDiscountText || savingIntroDiscount" @click="startIntroDiscountAdd">
                Adaugă text nou
              </v-btn>
            </div>

            <div class="card" v-if="introDiscountAddOpen" style="position: relative;">
              <v-overlay :model-value="savingIntroDiscount" contained class="align-center justify-center">
                <v-progress-circular indeterminate color="cyan" />
              </v-overlay>
              <div class="stack">
                <v-text-field
                  v-model="introDiscountAddValue"
                  label="Text nou *"
                  variant="outlined"
                  density="compact"
                  hide-details
                  autocomplete="off"
                  :error="introDiscountAddTouched && !introDiscountAddTrimmed"
                  :error-messages="introDiscountAddTouched && !introDiscountAddTrimmed ? introRequiredError : ''"
                  @blur="introDiscountAddTouched = true"
                />
                <div class="row d-flex justify-end">
                  <v-btn :size="actionBtnSize" variant="text" :disabled="savingIntroDiscount" @click="cancelIntroDiscountAdd">Renunță</v-btn>
                  <v-btn :size="actionBtnSize" color="cyan" variant="flat" :loading="savingIntroDiscount" :disabled="savingIntroDiscount || !canSaveIntroDiscountAdd" @click="saveIntroDiscountAdd">Salvează</v-btn>
                </div>
              </div>
            </div>

            <div v-if="introDiscountTexts.length === 0" class="card">
              <strong>Nu există texte încă.</strong>
              <p class="muted">Adaugă primul text și va apărea pe pagina Reduceri.</p>
            </div>

            <draggable
              v-model="introDiscountTexts"
              item-key="id"
              :delay="300"
              :delay-on-touch-only="true"
              @end="persistIntroDiscountOrder"
            >
              <template #item="{ element: t }">
                <div class="card mb-2" :style="introDiscountEditId === String(t.id) ? { position: 'relative' } : undefined">
                  <div v-if="introDiscountEditId === String(t.id)" class="stack">
                    <v-overlay :model-value="savingIntroDiscount" contained class="align-center justify-center">
                      <v-progress-circular indeterminate color="cyan" />
                    </v-overlay>
                    <v-text-field
                      v-model="introDiscountEditValue"
                      label="Text *"
                      variant="outlined"
                      density="compact"
                      hide-details
                      autocomplete="off"
                      :error="introDiscountEditTouched && !introDiscountEditTrimmed"
                      :error-messages="introDiscountEditTouched && !introDiscountEditTrimmed ? introRequiredError : ''"
                      @blur="introDiscountEditTouched = true"
                    />
                    <div class="row d-flex justify-end">
                      <v-btn :size="actionBtnSize" variant="text" :disabled="savingIntroDiscount" @click="cancelIntroDiscountEdit">Renunță</v-btn>
                      <v-btn :size="actionBtnSize" color="cyan" variant="flat" :loading="savingIntroDiscount" :disabled="savingIntroDiscount || !canSaveIntroDiscountEdit" @click="saveIntroDiscountEdit(t.id)">Salvează</v-btn>
                    </div>
                  </div>

                  <div v-else class="stack">
                    <div class="muted" style="line-height: 1.5;">{{ t.text }}</div>
                    <div class="row d-flex justify-end">
                        <v-btn :size="actionBtnSize" variant="outlined" color="cyan" :disabled="isAddingIntroDiscountText" @click="startIntroDiscountEdit(t)">Editează text</v-btn>
                      <v-btn
                        :size="actionBtnSize"
                        variant="outlined"
                        color="red"
                        @click="askConfirmWithSuccess({ title: 'Șterge textul', text: 'Sigur vrei să ștergi acest text?', action: () => removeIntroDiscount(t.id), successMessage: 'Textul a fost șters.' })"
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
        <h2 class="sectionTitle">Texte - Contact</h2>
        <div class="row" style="gap: .25rem;">
          <span class="pill">{{ introContactTexts.length }} {{ introContactTexts.length === 1 ? 'text' : 'texte' }}</span>
          <v-btn
            :size="actionBtnSize"
            variant="text"
            :icon="chevronFor(introContactSectionOpen)"
            @click="introContactSectionOpen = !introContactSectionOpen"
          />
        </div>
      </div>

      <v-expand-transition>
        <div v-show="introContactSectionOpen" class="stack">
          <div v-if="!rtdb" class="card">
            <strong>Eroare</strong>
            <p class="muted">Realtime Database nu este configurat.</p>
          </div>

          <template v-else>
            <div class="row d-flex justify-end">
              <v-btn v-if="!introContactAddOpen" color="cyan" variant="flat" :size="actionBtnSize" :disabled="isEditingIntroContactText || savingIntroContact" @click="startIntroContactAdd">
                Adaugă text nou
              </v-btn>
            </div>

            <div class="card" v-if="introContactAddOpen" style="position: relative;">
              <v-overlay :model-value="savingIntroContact" contained class="align-center justify-center">
                <v-progress-circular indeterminate color="cyan" />
              </v-overlay>
              <div class="stack">
                <v-text-field
                  v-model="introContactAddValue"
                  label="Text nou *"
                  variant="outlined"
                  density="compact"
                  hide-details
                  autocomplete="off"
                  :error="introContactAddTouched && !introContactAddTrimmed"
                  :error-messages="introContactAddTouched && !introContactAddTrimmed ? introRequiredError : ''"
                  @blur="introContactAddTouched = true"
                />
                <div class="row d-flex justify-end">
                  <v-btn :size="actionBtnSize" variant="text" :disabled="savingIntroContact" @click="cancelIntroContactAdd">Renunță</v-btn>
                  <v-btn :size="actionBtnSize" color="cyan" variant="flat" :loading="savingIntroContact" :disabled="savingIntroContact || !canSaveIntroContactAdd" @click="saveIntroContactAdd">Salvează</v-btn>
                </div>
              </div>
            </div>

            <div v-if="introContactTexts.length === 0" class="card">
              <strong>Nu există texte încă.</strong>
              <p class="muted">Adaugă primul text și va apărea pe pagina Contact.</p>
            </div>

            <draggable
              v-model="introContactTexts"
              item-key="id"
              :delay="300"
              :delay-on-touch-only="true"
              @end="persistIntroContactOrder"
            >
              <template #item="{ element: t }">
                <div class="card mb-2" :style="introContactEditId === String(t.id) ? { position: 'relative' } : undefined">
                  <div v-if="introContactEditId === String(t.id)" class="stack">
                    <v-overlay :model-value="savingIntroContact" contained class="align-center justify-center">
                      <v-progress-circular indeterminate color="cyan" />
                    </v-overlay>
                    <v-text-field
                      v-model="introContactEditValue"
                      label="Text *"
                      variant="outlined"
                      density="compact"
                      hide-details
                      autocomplete="off"
                      :error="introContactEditTouched && !introContactEditTrimmed"
                      :error-messages="introContactEditTouched && !introContactEditTrimmed ? introRequiredError : ''"
                      @blur="introContactEditTouched = true"
                    />
                    <div class="row d-flex justify-end">
                      <v-btn :size="actionBtnSize" variant="text" :disabled="savingIntroContact" @click="cancelIntroContactEdit">Renunță</v-btn>
                      <v-btn :size="actionBtnSize" color="cyan" variant="flat" :loading="savingIntroContact" :disabled="savingIntroContact || !canSaveIntroContactEdit" @click="saveIntroContactEdit(t.id)">Salvează</v-btn>
                    </div>
                  </div>

                  <div v-else class="stack">
                    <div class="muted" style="line-height: 1.5;">{{ t.text }}</div>
                    <div class="row d-flex justify-end">
                        <v-btn :size="actionBtnSize" variant="outlined" color="cyan" :disabled="isAddingIntroContactText" @click="startIntroContactEdit(t)">Editează text</v-btn>
                      <v-btn
                        :size="actionBtnSize"
                        variant="outlined"
                        color="red"
                        @click="askConfirmWithSuccess({ title: 'Șterge textul', text: 'Sigur vrei să ștergi acest text?', action: () => removeIntroContact(t.id), successMessage: 'Textul a fost șters.' })"
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
          <h2 class="sectionTitle">Texte - Footer</h2>
          <div class="row" style="gap: .25rem;">
            <span class="pill">{{ footerTexts.length }} {{ footerTexts.length === 1 ? 'text' : 'texte' }}</span>
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
                <v-btn v-if="!footerAddOpen" color="cyan" variant="flat" :size="actionBtnSize" :disabled="isEditingFooterText || savingFooter" @click="startFooterAdd">
                  Adaugă text nou
                </v-btn>
              </div>

              <div class="card" v-if="footerAddOpen" style="position: relative;">
                <v-overlay :model-value="savingFooter" contained class="align-center justify-center">
                  <v-progress-circular indeterminate color="cyan" />
                </v-overlay>
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
                    <v-btn :size="actionBtnSize" variant="text" :disabled="savingFooter" @click="cancelFooterAdd">Renunță</v-btn>
                    <v-btn :size="actionBtnSize" color="cyan" variant="flat" :loading="savingFooter" :disabled="savingFooter || !canSaveFooterAdd" @click="saveFooterAdd">Salvează</v-btn>
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
                  <div class="card mb-2" :style="footerEditId === String(t.id) ? { position: 'relative' } : undefined">
                    <div v-if="footerEditId === String(t.id)" class="stack">
                      <v-overlay :model-value="savingFooter" contained class="align-center justify-center">
                        <v-progress-circular indeterminate color="cyan" />
                      </v-overlay>
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
                      <div class="row d-flex justify-end">
                        <v-btn :size="actionBtnSize" variant="text" :disabled="savingFooter" @click="cancelFooterEdit">Renunță</v-btn>
                        <v-btn :size="actionBtnSize" color="cyan" variant="flat" :loading="savingFooter" :disabled="savingFooter || !canSaveFooterEdit" @click="saveFooterEdit(t.id)">Salvează</v-btn>
                      </div>
                    </div>

                    <div v-else class="stack">
                      <div class="muted" style="line-height: 1.5;">{{ t.text }}</div>
                      <div class="row d-flex justify-end">
                        <v-btn :size="actionBtnSize" variant="outlined" color="cyan" :disabled="isAddingFooterText" @click="startFooterEdit(t)">Editează text</v-btn>
                        <v-btn
                          :size="actionBtnSize"
                          variant="outlined"
                          color="red"
                          @click="askConfirmWithSuccess({ title: 'Șterge textul', text: 'Sigur vrei să ștergi acest text?', action: () => removeFooter(t.id), successMessage: 'Textul a fost șters.' })"
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
          <h2 class="sectionTitle">Informații Contact</h2>
          <div class="row" style="gap: .25rem;">
            <span class="pill">{{ contactInfoItems.length }} {{ contactInfoItems.length === 1 ? 'secțiune' : 'secțiuni' }}</span>
            <v-btn
              :size="actionBtnSize"
              variant="text"
              :icon="chevronFor(contactInfoSectionOpen)"
              @click="contactInfoSectionOpen = !contactInfoSectionOpen"
            />
          </div>
        </div>

        <v-expand-transition>
          <div v-show="contactInfoSectionOpen" class="stack">
            <div v-if="!rtdb" class="card">
              <strong>Eroare</strong>
              <p class="muted">Realtime Database nu este configurat.</p>
            </div>

            <template v-else>
              <div class="row d-flex justify-end">
                <v-btn v-if="!contactInfoAddOpen" color="cyan" variant="flat" :size="actionBtnSize" :disabled="isEditingContactInfoSection || savingContactInfo" @click="startContactInfoAdd">
                  Adaugă secțiune
                </v-btn>
              </div>

              <div class="card" v-if="contactInfoAddOpen" style="position: relative;">
                <v-overlay :model-value="savingContactInfo" contained class="align-center justify-center">
                  <v-progress-circular indeterminate color="cyan" />
                </v-overlay>
                <div class="stack">
                  <v-text-field
                    v-model="contactInfoAddLabel"
                    label="Nume secțiune *"
                    variant="outlined"
                    density="compact"
                    hide-details
                    autocomplete="off"
                    :error="contactInfoAddTouched && !contactInfoAddLabelTrimmed"
                    :error-messages="contactInfoAddTouched && !contactInfoAddLabelTrimmed ? introRequiredError : ''"
                    @blur="contactInfoAddTouched = true"
                  />
                  <v-textarea
                    v-model="contactInfoAddTexts"
                    label="Text *"
                    variant="outlined"
                    density="compact"
                    rows="4"
                    hide-details
                    autocomplete="off"
                    :error="contactInfoAddTouched && contactInfoAddLines.length === 0"
                    :error-messages="contactInfoAddTouched && contactInfoAddLines.length === 0 ? introRequiredError : ''"
                    @blur="contactInfoAddTouched = true"
                  />
                  <div class="row d-flex justify-end">
                    <v-btn :size="actionBtnSize" variant="text" :disabled="savingContactInfo" @click="cancelContactInfoAdd">Renunță</v-btn>
                    <v-btn :size="actionBtnSize" color="cyan" variant="flat" :loading="savingContactInfo" :disabled="savingContactInfo || !canSaveContactInfoAdd" @click="saveContactInfoAdd">Salvează</v-btn>
                  </div>
                </div>
              </div>

              <div v-if="contactInfoItems.length === 0" class="card">
                <strong>Nu există secțiuni încă.</strong>
                <p class="muted">Adaugă program, telefon, e-mail etc. și vor apărea pe pagina Contact.</p>
              </div>

              <draggable
                v-model="contactInfoItems"
                item-key="id"
                :delay="300"
                :delay-on-touch-only="true"
                @end="persistContactInfoOrder"
              >
                <template #item="{ element: t }">
                  <div class="card mb-2" :style="contactInfoEditId === String(t.id) ? { position: 'relative' } : undefined">
                    <div v-if="contactInfoEditId === String(t.id)" class="stack">
                      <v-overlay :model-value="savingContactInfo" contained class="align-center justify-center">
                        <v-progress-circular indeterminate color="cyan" />
                      </v-overlay>
                      <v-text-field
                        v-model="contactInfoEditLabel"
                        label="Nume secțiune *"
                        variant="outlined"
                        density="compact"
                        hide-details
                        autocomplete="off"
                        :error="contactInfoEditTouched && !contactInfoEditLabelTrimmed"
                        :error-messages="contactInfoEditTouched && !contactInfoEditLabelTrimmed ? introRequiredError : ''"
                        @blur="contactInfoEditTouched = true"
                      />
                      <v-textarea
                        v-model="contactInfoEditTexts"
                        label="Text *"
                        variant="outlined"
                        density="compact"
                        rows="4"
                        hide-details
                        autocomplete="off"
                        :error="contactInfoEditTouched && contactInfoEditLines.length === 0"
                        :error-messages="contactInfoEditTouched && contactInfoEditLines.length === 0 ? introRequiredError : ''"
                        @blur="contactInfoEditTouched = true"
                      />
                      <div class="row d-flex justify-end">
                        <v-btn :size="actionBtnSize" variant="text" :disabled="savingContactInfo" @click="cancelContactInfoEdit">Renunță</v-btn>
                        <v-btn :size="actionBtnSize" color="cyan" variant="flat" :loading="savingContactInfo" :disabled="savingContactInfo || !canSaveContactInfoEdit" @click="saveContactInfoEdit(t.id)">Salvează</v-btn>
                      </div>
                    </div>

                    <div v-else class="stack" style="gap:.25rem;">
                      <strong>{{ t.label }}</strong>
                      <p v-for="(line, idx) in (t.texts || [])" :key="idx" class="muted" style="margin:0; min-height: 1em;">
                        {{ String(line ?? '').trim() ? line : '\u00A0' }}
                      </p>
                      <div class="row d-flex justify-end" style="margin-top:.5rem;">
                        <v-btn :size="actionBtnSize" variant="outlined" color="cyan" :disabled="isAddingContactInfoSection" @click="startContactInfoEdit(t)">Editează secțiunea</v-btn>
                        <v-btn
                          :size="actionBtnSize"
                          variant="outlined"
                          color="red"
                          @click="askConfirmWithSuccess({ title: 'Șterge secțiunea', text: 'Sigur vrei să ștergi această secțiune?', action: () => removeContactInfo(t.id), successMessage: 'Secțiunea a fost ștearsă.' })"
                        >
                          Șterge secțiunea
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
            <span class="pill">{{ messages.length }} {{ messages.length === 1 ? 'mesaj' : 'mesaje' }}</span>
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

      <div class="divider" />

      <section class="stack">
        <div class="row sp-between">
          <h2 class="sectionTitle">Configurări generale</h2>
          <div class="row" style="gap: .25rem;">
            <v-btn
              :size="actionBtnSize"
              variant="text"
              :icon="chevronFor(generalConfigSectionOpen)"
              @click="generalConfigSectionOpen = !generalConfigSectionOpen"
            />
          </div>
        </div>

        <v-expand-transition>
          <div v-show="generalConfigSectionOpen" class="stack">
            <div v-if="!rtdb" class="card">
              <strong>Eroare</strong>
              <p class="muted">Realtime Database nu este configurat.</p>
            </div>

            <div v-else class="card" style="position: relative;">
              <v-overlay :model-value="loadingGeneralConfig || savingGeneralConfig" contained class="align-center justify-center">
                <v-progress-circular indeterminate color="cyan" />
              </v-overlay>

              <div class="row d-flex" style="gap: .5rem; align-items: center;">
                <v-checkbox
                  v-model="carouselImageNumber"
                  density="compact"
                  hide-details
                  :disabled="loadingGeneralConfig || savingGeneralConfig"
                  @update:modelValue="saveCarouselImageNumber"
                />
                <span class="muted">Afișează numărul imaginii în carousel</span>
              </div>
            </div>
          </div>
        </v-expand-transition>
      </section>

      <div class="divider" />

      <section class="stack">
        <div class="row sp-between">
          <h2 class="sectionTitle d-flex align-center">Confidențial<v-icon class="ml-2" size="18" color="red">mdi-alert</v-icon></h2>
          <div class="row" style="gap: .25rem;">
            <v-btn
              :size="actionBtnSize"
              variant="text"
              :icon="chevronFor(confidentialSectionOpen)"
              @click="confidentialSectionOpen = !confidentialSectionOpen"
            />
          </div>
        </div>

        <v-expand-transition>
          <div v-show="confidentialSectionOpen" class="stack">
            <div v-if="!rtdb" class="card">
              <strong>Eroare</strong>
              <p class="muted">Realtime Database nu este configurat.</p>
            </div>

            <div v-else class="card" style="position: relative;">
              <v-overlay :model-value="savingAdminPassword" contained class="align-center justify-center">
                <v-progress-circular indeterminate color="cyan" />
              </v-overlay>

              <div class="stack">
                <p class="muted" style="margin:0;">Schimbă parola de administrare</p>

                <div :class="isMobile ? 'stack' : 'row'" style="gap: .75rem; flex-wrap: wrap;">
                  <v-text-field
                    v-model="currentAdminPassword"
                    label="Parola curentă *"
                    variant="outlined"
                    density="compact"
                    hide-details
                    name="admin_current_pass"
                    autocomplete="off"
                    autocapitalize="off"
                    spellcheck="false"
                    :type="showCurrentAdminPassword ? 'text' : 'password'"
                    :append-inner-icon="showCurrentAdminPassword ? 'mdi-eye-off' : 'mdi-eye'"
                    :error="currentAdminPasswordTouched && !currentAdminPasswordTrimmed"
                    :error-messages="currentAdminPasswordTouched && !currentAdminPasswordTrimmed ? introRequiredError : ''"
                    :disabled="savingAdminPassword"
                    style="flex: 1 1 260px;"
                    @click:append-inner="showCurrentAdminPassword = !showCurrentAdminPassword"
                    @blur="currentAdminPasswordTouched = true"
                    @keydown.enter.prevent="saveNewAdminPassword"
                  />

                  <v-text-field
                    v-model="newAdminPassword"
                    label="Parolă nouă *"
                    variant="outlined"
                    density="compact"
                    hide-details
                    name="admin_new_pass"
                    autocomplete="off"
                    autocapitalize="off"
                    spellcheck="false"
                    :type="showNewAdminPassword ? 'text' : 'password'"
                    :append-inner-icon="showNewAdminPassword ? 'mdi-eye-off' : 'mdi-eye'"
                    :error="newAdminPasswordTouched && !newAdminPasswordTrimmed"
                    :error-messages="newAdminPasswordTouched && !newAdminPasswordTrimmed ? introRequiredError : ''"
                    :disabled="savingAdminPassword"
                    style="flex: 1 1 260px;"
                    @click:append-inner="showNewAdminPassword = !showNewAdminPassword"
                    @blur="newAdminPasswordTouched = true"
                    @keydown.enter.prevent="saveNewAdminPassword"
                  />
                </div>

                <div class="row d-flex justify-end">
                  <v-btn
                    :size="actionBtnSize"
                    variant="text"
                    :disabled="savingAdminPassword || !canCancelAdminPasswordChange"
                    @click="currentAdminPassword = ''; currentAdminPasswordTouched = false; showCurrentAdminPassword = false; newAdminPassword = ''; newAdminPasswordTouched = false; showNewAdminPassword = false"
                  >
                    Renunță
                  </v-btn>
                  <v-btn
                    :size="actionBtnSize"
                    color="cyan"
                    variant="flat"
                    :loading="savingAdminPassword"
                    :disabled="savingAdminPassword || !canSaveNewAdminPassword"
                    @click="saveNewAdminPassword"
                  >
                    Salvează
                  </v-btn>
                </div>
              </div>
            </div>
          </div>
        </v-expand-transition>
      </section>

      <div class="divider" />
    </div>

    <!-- Category Edit Dialog -->
    <v-dialog v-model="categoryEditOpen" :max-width="categoryDialogMaxWidth" persistent scrollable>
      <v-card class="card modalCard modalCardWithClose" elevation="2">
			<v-overlay :model-value="savingCategory" contained class="align-center justify-center">
				<v-progress-circular indeterminate color="cyan" />
			</v-overlay>
        <v-btn class="modalCloseBtn" variant="text" icon="mdi-close" density="comfortable" @click="categoryEditOpen = false" />
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
    <v-dialog v-model="productEditOpen" :max-width="productDialogMaxWidth" persistent scrollable>
      <v-card class="card modalCard modalCardWithClose" elevation="2">
			<v-overlay :model-value="savingProduct" contained class="align-center justify-center">
				<v-progress-circular indeterminate color="cyan" />
			</v-overlay>
        <v-btn class="modalCloseBtn" variant="text" icon="mdi-close" density="comfortable" @click="productEditOpen = false" />
        <v-card-title>{{ editingProduct ? 'Editează produsul' : 'Adaugă produs' }}</v-card-title>
        <v-card-text>
          <v-text-field v-model="productForm.title" label="Titlu *" variant="outlined" density="compact" autocomplete="off" :rules="[requiredRule]" />
          <v-textarea v-model="productForm.description" label="Descriere *" variant="outlined" density="compact" rows="3" autocomplete="off" :rules="[requiredRule]" />
          <v-textarea v-model="productForm.materials" label="Materiale" variant="outlined" density="compact" rows="3" autocomplete="off" />
          <v-textarea v-model="productForm.specifications" label="Specificații tehnice" variant="outlined" density="compact" rows="3" autocomplete="off" />
          <v-textarea v-model="productForm.dimensions" label="Dimensiuni" variant="outlined" density="compact" rows="3" autocomplete="off" />
          <v-text-field
            v-model="productForm.price"
            :label="isPriceRequired ? 'Preț (RON) *' : 'Preț (RON)'"
            variant="outlined"
            density="compact"
            type="number"
            autocomplete="off"
            :rules="isPriceRequired ? [requiredRule] : []"
          />
          <v-text-field
            v-model="productForm.reducedPrice"
            :label="isReducedPriceRequired ? 'Preț redus (RON) *' : 'Preț redus (RON)'"
            variant="outlined"
            density="compact"
            type="number"
            autocomplete="off"
            :rules="isReducedPriceRequired ? [requiredRule] : []"
          />
          <v-checkbox
            v-model="productForm.showProductDiscount"
            class="mt-n2 mb-2"
            density="compact"
            hide-details
            label="Afișează în pagina de Reduceri"
          />
          <v-checkbox
            v-model="productForm.showProductPrice"
            class="mt-n2 mb-4"
            density="compact"
            hide-details
            label="Afișează prețul produsului"
          />
          <v-text-field v-model="productForm.background" label="Fundal" variant="outlined" density="compact" type="color" autocomplete="off" />
          <ImageUploadField
            ref="productImageFieldRef"
            v-model="productForm.images"
            folder="products"
            :entity-id="productForm.id"
            store-as="storage"
            label="Imagini produs *"
            multiple
            allow-delete
            :allow-primary="Boolean(editingProduct) && Boolean(productForm.id)"
            @deleted="onProductImagesDeleted"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn :size="dialogActionBtnSize" variant="text" :disabled="savingProduct" @click="productEditOpen = false">Renunță</v-btn>
          <v-btn :size="dialogActionBtnSize" color="cyan" variant="flat" class="ok" :loading="savingProduct" :disabled="!isProductValid || savingProduct" @click="saveProduct">Salvează</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Confirmation Dialog -->
    <v-dialog v-model="confirmOpen" :max-width="confirmDialogMaxWidth" persistent scrollable>
      <v-card class="card modalCard" elevation="2">
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
.modalCard {
  position: relative;
}

.modalCardWithClose :deep(.v-card-title) {
  margin-right: 2.5rem;
}
.modalCloseBtn {
  position: absolute;
  top: 0.2rem;
  right: 0.2rem;
  z-index: 10;
}

@media (min-width: 600px) {
  .modalCardWithClose :deep(.v-card-title) {
    margin-right: 3.5rem;
  }
  .modalCloseBtn {
    right: 1.2rem;
  }
}

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
  margin: 0 10px 10px 0;
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
  display: flow-root;
}
.categoryTitle {
  display: block;
}
.categoryDescription {
  white-space: pre-line;
  overflow-wrap: anywhere;
}
.divider {
  height: 2px;
  background: rgba(255,255,255,.22);
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
  display: flex;
  flex-direction: column;
  height: 100%;
}
.productSimpleBody {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: .5rem;
}
.productSimpleMedia {
  height: 120px;
}
.productActions {
  justify-content: flex-end;
  margin-top: auto;
  padding-top: .5rem;
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
  float: right;
  margin-left: .75rem;
  margin-bottom: .5rem;
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
  line-clamp: 3;
  -webkit-line-clamp: 3;
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
  .grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
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

@media (min-width: 960px) {
  .grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}
</style>
