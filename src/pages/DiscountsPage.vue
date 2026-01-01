<script setup>
import { computed, onMounted, ref } from 'vue'
import { useDisplay } from 'vuetify'
import ProductCard from '../components/ui/ProductCard.vue'
import PageLoader from '../components/ui/PageLoader.vue'
import { rtdb } from '../lib/firebase'
import { useSiteStore } from '../stores/site'
import { listCategories, listDiscountProducts, listIntroDiscountTexts } from '../services/productsService'

const site = useSiteStore()
const add = () => site.incrementCart()

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

function splitLines(val) {
  if (Array.isArray(val)) return val.map((s) => String(s ?? '').trim()).filter(Boolean)
  return String(val ?? '')
    .split(/\r?\n/)
    .map((s) => String(s).trim())
    .filter(Boolean)
}

function descriptionPreview(p) {
  const lines = splitLines(p?.description)
  return lines[0] || ''
}

const selectedDescriptionLines = computed(() => {
  return splitLines(selectedProduct.value?.description)
})

const selectedMaterials = computed(() => {
  const v = selectedProduct.value?.materials
  if (Array.isArray(v)) return v.map((s) => String(s ?? '').trim()).filter(Boolean)
  return splitLines(v)
})

const selectedSpecifications = computed(() => {
  const v = selectedProduct.value?.specifications
  if (Array.isArray(v)) return v.map((s) => String(s ?? '').trim()).filter(Boolean)
  return splitLines(v)
})

const selectedDimensions = computed(() => {
  const v = selectedProduct.value?.dimensions
  if (Array.isArray(v)) return v.map((s) => String(s ?? '').trim()).filter(Boolean)
  return splitLines(v)
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
  detailsOpen.value = true
}

function closeDetails() {
  detailsOpen.value = false
}

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
        :image="p.image"
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
          <div v-if="selectedProduct?.image" class="detailsImgWrap" aria-hidden="true">
            <img class="detailsImg" :src="selectedProduct.image" alt="" />
          </div>

          <div class="kv">
            <div class="k muted">Categorie</div>
            <div class="v">{{ selectedCategoryTitle || '—' }}</div>
          </div>

          <div class="kv" v-if="selectedDescriptionLines.length">
            <div class="k muted">Descriere</div>
            <div class="v">
              <div v-for="(line, idx) in selectedDescriptionLines" :key="idx">{{ line }}</div>
            </div>
          </div>

          <div class="kv" v-if="selectedMaterials.length">
            <div class="k muted">Materiale</div>
            <div class="v">
              <div v-for="(line, idx) in selectedMaterials" :key="idx">{{ line }}</div>
            </div>
          </div>

          <div class="kv" v-if="selectedSpecifications.length">
            <div class="k muted">Specificații tehnice</div>
            <div class="v">
              <div v-for="(line, idx) in selectedSpecifications" :key="idx">{{ line }}</div>
            </div>
          </div>

          <div class="kv" v-if="selectedDimensions.length">
            <div class="k muted">Dimensiuni</div>
            <div class="v">
              <div v-for="(line, idx) in selectedDimensions" :key="idx">{{ line }}</div>
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
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 0;
  border-radius: 12px;
  background: transparent;
}
.detailsImg {
  width: 100%;
  height: auto;
  max-height: min(70vh, 520px);
  object-fit: contain;
  display: block;
  border-radius: 10px;
}
@media (max-width: 599px) {
  .detailsImg { max-height: min(60vh, 420px); }
}
.kv {
  display: grid;
  gap: .25rem;
}
.k {
}
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
