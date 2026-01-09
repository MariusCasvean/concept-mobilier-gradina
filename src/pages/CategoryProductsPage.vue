<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { useDisplay } from 'vuetify'
import PageLoader from '../components/ui/PageLoader.vue'
import { normalizeForSearch } from '../lib/text'
import { openWhatsApp } from '../lib/whatsapp'
import { getCategoryBySlug, listProductsByCategory } from '../services/productsService'
import { useSiteStore } from '../stores/site'

const route = useRoute()

const categorySlug = computed(() => String(route.params.categorySlug || ''))
const requestedProductId = computed(() => String(route.query.productId || ''))

const products = ref([])
const loading = ref(true)
const error = ref('')
const query = ref('')

const display = useDisplay()
const detailsBtnSize = computed(() => (display.xs.value ? 'small' : 'default'))
const detailsDialogMaxWidth = computed(() => (display.mdAndUp.value ? 960 : 760))

const category = ref(null)

const detailsOpen = ref(false)
const selectedProduct = ref(null)
const selectedImageIndex = ref(0)
const slideDir = ref('next')

const site = useSiteStore()
const showCarouselImageCounter = computed(() => site.configuration?.carouselImageNumber !== false)

const slideTransitionName = computed(() => (slideDir.value === 'next' ? 'slide-left' : 'slide-right'))

function getProductImages(p) {
  const arr = Array.isArray(p?.images) ? p.images : []
  const urls = arr.map((u) => String(u ?? '').trim()).filter(Boolean)
  if (urls.length) return urls
  const legacy = String(p?.image ?? '').trim()
  return legacy ? [legacy] : []
}

function getPrimaryImage(p) {
  return getProductImages(p)[0] || ''
}

const selectedProductImages = computed(() => getProductImages(selectedProduct.value))

const imageCounterText = computed(() => {
  const n = selectedProductImages.value.length
  if (n <= 0) return ''
  const idx = Math.min(n - 1, Math.max(0, selectedImageIndex.value))
  return `Imaginea ${idx + 1}/${n}`
})

function prevImage() {
  const n = selectedProductImages.value.length
  if (n <= 1) return
  slideDir.value = 'prev'
  selectedImageIndex.value = (selectedImageIndex.value - 1 + n) % n
}

function nextImage() {
  const n = selectedProductImages.value.length
  if (n <= 1) return
  slideDir.value = 'next'
  selectedImageIndex.value = (selectedImageIndex.value + 1) % n
}

const touchStartX = ref(0)
const touchStartY = ref(0)
function onTouchStart(e) {
  const t = e?.touches?.[0]
  if (!t) return
  touchStartX.value = t.clientX
  touchStartY.value = t.clientY
}
function onTouchEnd(e) {
  const t = e?.changedTouches?.[0]
  if (!t) return
  const dx = t.clientX - touchStartX.value
  const dy = t.clientY - touchStartY.value
  if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy)) return
  if (dx < 0) nextImage()
  else prevImage()
}

function splitLines(val) {
  if (Array.isArray(val)) return val.map((s) => String(s ?? '').trim())
  const raw = String(val ?? '')
  if (raw === '' || (raw.trim() === '' && !/\r|\n/.test(raw))) return []
  return raw
    .split(/\r?\n/)
    .map((s) => String(s).trim())
}

function descriptionPreview(p) {
  const lines = splitLines(p?.description)
  return lines.find((s) => String(s).trim()) || ''
}

const selectedDescriptionLines = computed(() => {
  return splitLines(selectedProduct.value?.description)
})

const hasSelectedDescription = computed(() => {
  return selectedDescriptionLines.value.length > 0
})

const selectedMaterials = computed(() => {
  const v = selectedProduct.value?.materials
  if (Array.isArray(v)) return v.map((s) => String(s ?? '').trim())
  return splitLines(v)
})

const hasSelectedMaterials = computed(() => {
  return selectedMaterials.value.length > 0
})

const selectedSpecifications = computed(() => {
  const v = selectedProduct.value?.specifications
  if (Array.isArray(v)) return v.map((s) => String(s ?? '').trim())
  return splitLines(v)
})

const hasSelectedSpecifications = computed(() => {
  return selectedSpecifications.value.length > 0
})

const selectedDimensions = computed(() => {
  const v = selectedProduct.value?.dimensions
  if (Array.isArray(v)) return v.map((s) => String(s ?? '').trim())
  return splitLines(v)
})

const hasSelectedDimensions = computed(() => {
  return selectedDimensions.value.length > 0
})

const categoryTitle = computed(() => category.value?.title || categorySlug.value)

const filteredProducts = computed(() => {
  const q = normalizeForSearch(query.value)
  if (!q) return products.value
  return products.value.filter((p) => normalizeForSearch(p?.title).includes(q))
})

function openDetails(p) {
  selectedProduct.value = p
  selectedImageIndex.value = 0
  slideDir.value = 'next'
  detailsOpen.value = true
}

function closeDetails() {
  detailsOpen.value = false
}

function requestCustomOffer() {
  const baseText = 'Bună ziua, aș dori informații suplimentare despre acest produs. În cazul în care este posibil, o ofertă personalizată.'

  const title = String(selectedProduct.value?.title ?? '').trim()
  const cat = String(categoryTitle.value ?? '').trim()
  const url = typeof window !== 'undefined' ? String(window.location?.href ?? '').trim() : ''

  const lines = [baseText]
  if (cat) lines.push('',`Categorie: ${cat}`)
  if (title) lines.push(`Produs: ${title}`)
  if (url) lines.push(`Link: ${url}`)

  lines.push('', 'Vă mulțumesc!')

  openWhatsApp({ text: lines.join('\n') })
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [cat, items] = await Promise.all([
      getCategoryBySlug(categorySlug.value),
      listProductsByCategory(categorySlug.value),
    ])
    category.value = cat
    products.value = items
    detailsOpen.value = false
    selectedProduct.value = null

    const pid = requestedProductId.value
    if (pid) {
      const found = items.find((p) => String(p?.id || '') === pid)
      if (found) openDetails(found)
    }
  } catch (e) {
    error.value = e?.message || String(e)
  } finally {
    loading.value = false
  }
}

onMounted(load)
watch(categorySlug, load)

watch(
  () => selectedProductImages.value.length,
  (n) => {
    if (n <= 0) {
      selectedImageIndex.value = 0
      return
    }
    selectedImageIndex.value = Math.min(n - 1, Math.max(0, selectedImageIndex.value))
  }
)
</script>

<template>
  <div class="stack-lg">
    <header class="stack">
      <div class="row sp-between">
        <div class="stack headerStack">
          <div class="row sp-between breadcrumbRow">
            <RouterLink v-if="!loading" class="muted breadcrumbLink" to="/products">← Înapoi la categorii</RouterLink>
          </div>
          <h1 class="title">{{ category?.title }}</h1>
        </div>
      </div>
      <p v-if="!loading && products.length" class="muted">
        Alege un produs din categoria selectată.
      </p>
    </header>

    <PageLoader v-if="loading" />

    <div v-else-if="error" class="card">
      <strong>Eroare</strong>
      <p class="muted">{{ error }}</p>
    </div>

    <div v-else class="stack">
      <div v-if="!loading && products.length" class="stickySearch">
        <div class="stickySearchRow">
          <div class="searchField">
            <v-text-field
              v-model="query"
              variant="outlined"
              density="compact"
              hide-details
              clearable
              append-inner-icon="mdi-magnify"
              label="Caută produs"
              autocomplete="off"
            />
          </div>
          <span class="pill resultsPill">{{ filteredProducts.length }} {{ filteredProducts.length === 1 ? 'produs' : 'produse' }}</span>
        </div>
      </div>

      <div v-if="products.length > 0 && filteredProducts.length === 0" class="card">
        <strong>Nu am găsit produse.</strong>
        <p class="muted">Încearcă un alt titlu.</p>
      </div>

      <div v-else class="grid">
      <v-card v-for="p in filteredProducts" :key="p.id || p.slug" class="product" elevation="2" :style="{ border: `1px solid ${p.background}`, borderLeft: `0.5rem solid ${p.background}` }">
        <div class="imgSlot" aria-hidden="true">
          <div
            v-if="Boolean(p?.showProductDiscount)"
            class="discountBadge"
          >
            Reducere
          </div>
          <v-img v-if="getPrimaryImage(p)" :src="getPrimaryImage(p)" height="128" cover alt="">
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
            <strong class="name">{{ p.title }}</strong>
          </div>
          <p v-if="descriptionPreview(p)" class="muted desc">{{ descriptionPreview(p) }}</p>
          <!-- <span v-if="p.price" class="pill">{{ p.price }} RON</span> -->
          <div class="actions">
            <v-btn variant="flat" class="cta mt-2" color="cyan" :size="detailsBtnSize" @click="openDetails(p)">Detalii</v-btn>
          </div>
        </v-card-text>
      </v-card>
      </div>
    </div>

    <v-dialog v-model="detailsOpen" :max-width="detailsDialogMaxWidth" persistent scrollable>
      <v-card class="card modalCard modalCardWithClose" elevation="2">
        <v-btn class="modalCloseBtn" variant="text" icon="mdi-close" density="comfortable" @click="closeDetails" />
        <v-card-title class="detailsTitle">
          {{ selectedProduct?.title || 'Detalii produs' }}
        </v-card-title>
        <v-card-text class="details">
          <div
            v-if="selectedProductImages.length"
            class="detailsImgWrap carouselWrap"
            aria-hidden="true"
            @touchstart.passive="onTouchStart"
            @touchend.passive="onTouchEnd"
          >
            <Transition :name="slideTransitionName">
              <v-img
                :key="selectedProductImages[selectedImageIndex]"
                class="detailsImg"
                :src="selectedProductImages[selectedImageIndex]"
                contain
                alt=""
              >
                <template #placeholder>
                  <div class="d-flex align-center justify-center fill-height">
                    <v-progress-circular indeterminate size="32" width="3" color="cyan" />
                  </div>
                </template>
              </v-img>
            </Transition>
            <v-btn
              v-if="selectedProductImages.length > 1"
              class="carouselBtn left"
              variant="text"
              icon="mdi-chevron-left"
              density="compact"
              @click="prevImage"
            />
            <v-btn
              v-if="selectedProductImages.length > 1"
              class="carouselBtn right"
              variant="text"
              icon="mdi-chevron-right"
              density="compact"
              @click="nextImage"
            />

            <div v-if="showCarouselImageCounter" class="carouselCounter">{{ imageCounterText }}</div>
          </div>

          <div class="kv">
            <div class="k muted">Categorie</div>
            <div class="v">{{ categoryTitle }}</div>
          </div>

          <div class="kv" v-if="hasSelectedDescription">
            <div class="k muted">Descriere</div>
            <div class="v">
              <div v-for="(line, idx) in selectedDescriptionLines" :key="idx" style="min-height: 1em;">{{ String(line ?? '').trim() ? line : '\u00A0' }}</div>
            </div>
          </div>

          <div class="kv" v-if="hasSelectedMaterials">
            <div class="k muted">Materiale</div>
            <div class="v">
              <div v-for="(line, idx) in selectedMaterials" :key="idx" style="min-height: 1em;">{{ String(line ?? '').trim() ? line : '\u00A0' }}</div>
            </div>
          </div>

          <div class="kv" v-if="hasSelectedSpecifications">
            <div class="k muted">Specificații tehnice</div>
            <div class="v">
              <div v-for="(line, idx) in selectedSpecifications" :key="idx" style="min-height: 1em;">{{ String(line ?? '').trim() ? line : '\u00A0' }}</div>
            </div>
          </div>

          <div class="kv" v-if="hasSelectedDimensions">
            <div class="k muted">Dimensiuni</div>
            <div class="v">
              <div v-for="(line, idx) in selectedDimensions" :key="idx" style="min-height: 1em;">{{ String(line ?? '').trim() ? line : '\u00A0' }}</div>
            </div>
          </div>

          <div class="kv" v-if="selectedProduct?.showProductPrice !== false && String(selectedProduct?.price || '').trim()">
            <div class="k muted">Preț</div>
            <div class="v">{{ selectedProduct.price }} RON</div>
          </div>

          <div
            class="kv"
            v-if="selectedProduct?.showProductPrice !== false && selectedProduct?.showProductDiscount && String(selectedProduct?.reducedPrice || '').trim()"
          >
            <div class="k muted">Preț redus</div>
            <div class="v">
              <span>{{ selectedProduct.reducedPrice }} RON</span>
            </div>
          </div>
        </v-card-text>
        <v-card-actions>
          <v-btn
            color="cyan"
            variant="outlined"
            class="mb-2 ml-2"
            :size="detailsBtnSize"
            @click="requestCustomOffer"
          >
            <v-icon icon="mdi-whatsapp" class="mr-1" color="green" />
            Cere ofertă personalizată
          </v-btn>
          <v-spacer />
          <v-btn color="cyan" variant="flat" class="mb-2 mr-2" :size="detailsBtnSize" @click="closeDetails">OK</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <div v-if="!loading && !error && products.length === 0" class="card">
      <strong>Nu există produse în această categorie.</strong>
      <p class="muted mb-6">Încearcă o altă categorie din pagina de produse.</p>
      <v-btn class="cta" to="/products">Vezi categorii</v-btn>
    </div>
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
    right: 1rem;
  }
}

.stickySearch {
  position: sticky;
  top: 64px;
  z-index: 10;
  padding: .5rem;
  backdrop-filter: blur(100px);
}

.stickySearchRow {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: .75rem;
}

.searchField {
  flex: 1;
  min-width: 0;
}

.stickySearch :deep(.v-field) {
  background: transparent;
}

@media (max-width: 599px) {
  .stickySearch {
    width: 100vw;
    margin-left: calc(50% - 50vw);
    margin-right: calc(50% - 50vw);
    border-radius: 0;
    padding-left: max(clamp(12px, 4vw, 24px), env(safe-area-inset-left));
    padding-right: max(clamp(12px, 4vw, 24px), env(safe-area-inset-right));
  }

  .stickySearch :deep(input) {
    font-size: 16px;
  }
}

.breadcrumbRow {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: .75rem;
  flex-wrap: nowrap;
  width: 100%;
}

.headerStack {
  flex: 1;
  min-width: 0;
}

.breadcrumbLink,
.resultsPill {
  white-space: nowrap;
}

.resultsPill {
  flex-shrink: 0;
  border-color: rgba(var(--v-theme-on-surface), 0.55);
}

.title {
  display: block;
}
.grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: .75rem;
}
.cta {
  background: linear-gradient(135deg, var(--accent), var(--accent-2));
  color: #0b1220;
  border-radius: 6px;
}
.cta:hover {
  filter: brightness(1.05);
  text-decoration: none;
}
.product {
  overflow: hidden;
  display: flex;
  flex-direction: column;
  height: 100%;
}
.imgSlot {
  position: relative;
}
.discountBadge {
  position: absolute;
  top: .2rem;
  left: .2rem;
  z-index: 2;
  padding: .2rem .4rem;
  border-radius: 999px;
  font-size: .6rem;
  color: var(--card);
  background: linear-gradient(135deg, var(--accent), var(--accent-2));
}
.imgSlot {
  height: 128px;
}
.imgPlaceholder {
  height: 128px;
  background: linear-gradient(180deg, rgba(255,255,255,.04), rgba(255,255,255,.02));
}
.info {
  display: flex;
  flex-direction: column;
  gap: .4rem;
  padding: .75rem;
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
}
.actions {
  display: flex;
  justify-content: flex-end;
  margin-top: auto;
}
.details {
  display: grid;
  gap: .85rem;
}
.detailsTitle {
  white-space: normal;
  overflow-wrap: anywhere;
  word-break: break-word;
  line-height: 1.25;
}
.detailsImgWrap {
  position: relative;
  isolation: isolate;
  width: 100%;
  height: min(70vh, 520px);
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 0;
  border-radius: 12px;
  background: transparent;
  overflow: hidden;
}
.detailsImg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border-radius: 10px;
  z-index: 1;
}

.detailsImgWrap :deep(img) {
  border-radius: 10px;
}

.carouselBtn {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  z-index: 10;
  background: rgba(255,255,255,.10);
  border: 1px solid rgba(255,255,255,.12);
  backdrop-filter: blur(6px);
}
.carouselBtn.left { left: .35rem; }
.carouselBtn.right { right: .35rem; }

.carouselCounter {
  position: absolute;
  left: 50%;
  bottom: 0;
  transform: translateX(-50%);
  z-index: 10;
  padding: .15rem .5rem;
  border-radius: 999px;
  background: rgba(255,255,255,.18);
  border: 1px solid rgba(255,255,255,.18);
  backdrop-filter: blur(6px);
  font-size: .85rem;
  line-height: 1;
  user-select: none;
}

@media (max-width: 599px) {
  .carouselCounter {
    font-size: .72rem;
    padding: .12rem .4rem;
  }
}
@media (max-width: 599px) {
  .detailsImgWrap { height: min(60vh, 420px); }
}

.slide-left-enter-active,
.slide-left-leave-active,
.slide-right-enter-active,
.slide-right-leave-active {
  transition: transform 260ms ease, opacity 260ms ease;
}

.slide-left-enter-from {
  transform: translateX(14%);
  opacity: 0;
}

.slide-left-leave-to {
  transform: translateX(-14%);
  opacity: 0;
}

.slide-right-enter-from {
  transform: translateX(-14%);
  opacity: 0;
}

.slide-right-leave-to {
  transform: translateX(14%);
  opacity: 0;
}
.kv {
  display: grid;
  gap: .25rem;
}
/* .k {
} */
.v {
  line-height: 1.45;
}

@media (max-width: 599px) {
  .k,
  .v {
    font-size: .85rem;
  }
}
@media (min-width: 600px) {
  .grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 1rem;
  }
  .info {
    padding: 1rem;
  }
  .name {
    font-size: 1.02rem;
  }
}
@media (min-width: 960px) {
  .grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}
</style>
