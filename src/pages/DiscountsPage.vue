<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useDisplay } from 'vuetify'
import ProductCard from '../components/ui/ProductCard.vue'
import PageLoader from '../components/ui/PageLoader.vue'
import { rtdb } from '../lib/firebase'
import { useSiteStore } from '../stores/site'
import { listCategories, listDiscountProducts, listIntroDiscountTexts } from '../services/productsService'

const site = useSiteStore()
const add = () => site.incrementCart()

const showCarouselImageCounter = computed(() => site.configuration?.carouselImageNumber !== false)

const loading = ref(true)
const error = ref('')
const categories = ref([])
const products = ref([])

const introTexts = ref([])
const introLoading = ref(true)

const introLines = computed(() => {
  if (introLoading.value) return []
  return introTexts.value.map((x) => String(x?.text || '').trim()).filter(Boolean)
})

const detailsOpen = ref(false)
const selectedProduct = ref(null)
const selectedImageIndex = ref(0)
const slideDir = ref('next')

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

const display = useDisplay()
const detailsBtnSize = computed(() => (display.xs.value ? 'small' : 'default'))
const detailsDialogMaxWidth = computed(() => (display.mdAndUp.value ? 860 : 760))

const categorySlugById = computed(() => {
  const map = new Map()
  for (const c of categories.value) map.set(String(c.id), String(c.slug || ''))
  return map
})

const categoryTitleById = computed(() => {
  const map = new Map()
  for (const c of categories.value) map.set(String(c.id), String(c.title || c.slug || ''))
  return map
})

const selectedCategoryTitle = computed(() => {
  const p = selectedProduct.value
  if (!p) return ''
  const cid = String(p?.categoryId ?? '')
  return categoryTitleById.value.get(cid) || String(p?.categorySlug || '').trim() || ''
})

const discounted = computed(() => {
  return products.value
    .filter((p) => Boolean(p?.showProductDiscount))
    .map((p) => ({
      ...p,
      categorySlug: p.categorySlug || categorySlugById.value.get(String(p.categoryId || '')) || '',
    }))
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

onMounted(async () => {
  loading.value = true
  error.value = ''
  try {
    if (!rtdb) {
      categories.value = []
      products.value = []
      error.value = 'Pagina de Reduceri nu este disponibilă fără baza de date configurată.'
      introLoading.value = false
      return
    }
    const [cats, prods, intro] = await Promise.all([listCategories(), listDiscountProducts(), listIntroDiscountTexts()])
    categories.value = cats
    products.value = prods
    introTexts.value = intro
  } catch (e) {
    error.value = e?.message || String(e)
  } finally {
    introLoading.value = false
    loading.value = false
  }
})
</script>

<template>
  <div class="stack-lg">
    <h1>Reduceri</h1>
    <div class="stack" style="gap: .35rem;">
      <p v-for="(t, idx) in introLines" :key="idx" class="muted">{{ t }}</p>
    </div>

    <PageLoader v-if="loading" />

    <div v-else-if="error" class="card">
      <strong>Eroare</strong>
      <p class="muted">{{ error }}</p>
    </div>

    <div v-else-if="discounted.length === 0" class="card">
      <strong>Momentan nu există produse la reducere.</strong>
      <p class="muted">Revino mai târziu pentru oferte noi.</p>
    </div>

    <div v-else class="grid">
      <ProductCard
        v-for="p in discounted"
        :key="p.id || p.slug"
        :card-clickable="false"
        cta-behavior="emit"
        :title="p.title"
        :description="descriptionPreview(p)"
        :image="getPrimaryImage(p)"
        :show-price="p?.showProductPrice !== false"
        :price="String(p.price || '')"
        :reduced-price="String(p.reducedPrice || '')"
        :category-slug="p.categorySlug"
        :slug="p.slug"
        variant="discount"
        @details="openDetails(p)"
      />
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
            <div class="v">{{ selectedCategoryTitle || '—' }}</div>
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
          <v-spacer />
          <v-btn color="cyan" variant="flat" class="mr-2 mb-2" :size="detailsBtnSize" @click="closeDetails">OK</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
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

.grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}
@media (min-width: 960px) {
  .grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
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
  border-radius: 10px;
  height: 100%;
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
</style>
