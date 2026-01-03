<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import PageLoader from '../components/ui/PageLoader.vue'
import { getProductBySlugs } from '../services/productsService'

const route = useRoute()

const categorySlug = computed(() => String(route.params.categorySlug || ''))
const productSlug = computed(() => String(route.params.productSlug || ''))

const product = ref(null)
const loading = ref(true)
const error = ref('')

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

const productImages = computed(() => getProductImages(product.value))

function prevImage() {
  const n = productImages.value.length
  if (n <= 1) return
  slideDir.value = 'prev'
  selectedImageIndex.value = (selectedImageIndex.value - 1 + n) % n
}

function nextImage() {
  const n = productImages.value.length
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

const descriptionLines = computed(() => {
  const v = product.value?.description
  if (Array.isArray(v)) return v.map((s) => String(s ?? '').trim())

  const raw = String(v ?? '')
  if (raw === '' || (raw.trim() === '' && !/\r|\n/.test(raw))) return []
  return raw
    .split(/\r?\n/)
    .map((s) => String(s).trim())
})

const hasDescription = computed(() => {
  return descriptionLines.value.length > 0
})

async function load() {
  loading.value = true
  error.value = ''
  try {
    product.value = await getProductBySlugs(categorySlug.value, productSlug.value)
    selectedImageIndex.value = 0
    slideDir.value = 'next'
  } catch (e) {
    error.value = e?.message || String(e)
  } finally {
    loading.value = false
  }
}

onMounted(load)
watch(() => `${categorySlug.value}/${productSlug.value}`, load)
</script>

<template>
  <div class="stack-lg">
    <header class="stack">
      <RouterLink class="muted" :to="`/products/${categorySlug}`">← Înapoi la listă</RouterLink>
      <h1>{{ product?.title || 'Produs' }}</h1>
    </header>

    <PageLoader v-if="loading" />

    <div v-else-if="error" class="card">
      <strong>Eroare</strong>
      <p class="muted">{{ error }}</p>
      <RouterLink :to="`/products/${categorySlug}`">Înapoi la categorie</RouterLink>
    </div>

    <div v-else-if="!loading && !product" class="card">
      <strong>Produsul nu a fost găsit.</strong>
      <p class="muted">Verifică link-ul sau alege un alt produs.</p>
      <RouterLink :to="`/products/${categorySlug}`">Înapoi la categorie</RouterLink>
    </div>

    <v-card v-else class="product" elevation="2">
      <div
        v-if="productImages.length"
        class="imgWrap"
        aria-hidden="true"
        @touchstart.passive="onTouchStart"
        @touchend.passive="onTouchEnd"
      >
        <Transition :name="slideTransitionName">
          <v-img
            :key="productImages[selectedImageIndex]"
            class="img"
            :src="productImages[selectedImageIndex]"
            cover
            alt=""
          >
            <template #placeholder>
              <div class="d-flex align-center justify-center fill-height">
                <v-progress-circular indeterminate size="36" width="3" color="cyan" />
              </div>
            </template>
          </v-img>
        </Transition>
        <v-btn
          v-if="productImages.length > 1"
          class="carouselBtn left"
          variant="text"
          icon="mdi-chevron-left"
          density="compact"
          @click="prevImage"
        />
        <v-btn
          v-if="productImages.length > 1"
          class="carouselBtn right"
          variant="text"
          icon="mdi-chevron-right"
          density="compact"
          @click="nextImage"
        />
      </div>
      <v-card-text class="content">
        <div class="row sp-between">
          <div class="stack">
            <strong class="name">{{ product?.title }}</strong>
            <span class="muted">Categoria: {{ product?.categoryName || categorySlug }}</span>
          </div>
          <span v-if="product?.showProductPrice !== false && String(product?.price || '').trim()" class="pill price">{{ product?.price }} RON</span>
        </div>

        <div v-if="hasDescription" class="stack" style="gap:.35rem;">
          <p v-for="(line, idx) in descriptionLines" :key="idx" class="muted" style="margin:0; min-height: 1em;">{{ String(line ?? '').trim() ? line : '\u00A0' }}</p>
        </div>
        <p v-if="product?.details" class="details">{{ product.details }}</p>
      </v-card-text>
    </v-card>
  </div>
</template>

<style scoped>
.product {
  overflow: hidden;
}
.imgWrap {
  position: relative;
  width: 100%;
  height: 360px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  overflow: hidden;
}
.img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
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
.carouselBtn {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(255,255,255,.10);
  border: 1px solid rgba(255,255,255,.12);
  backdrop-filter: blur(6px);
}
.carouselBtn.left { left: .35rem; }
.carouselBtn.right { right: .35rem; }
.content {
  display: grid;
  gap: .75rem;
}
.name {
  font-size: 1.1rem;
}
.price {
  border-color: rgba(34, 211, 238, .35);
}
.details {
  margin: 0;
}
</style>
