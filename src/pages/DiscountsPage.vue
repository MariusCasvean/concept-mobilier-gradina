<script setup>
import { computed, onMounted, ref } from 'vue'
import { useDisplay } from 'vuetify'
import ProductCard from '../components/ui/ProductCard.vue'
import PageLoader from '../components/ui/PageLoader.vue'
import { rtdb } from '../lib/firebase'
import { useSiteStore } from '../stores/site'
import { listCategories, listDiscountProducts } from '../services/productsService'

const site = useSiteStore()
const add = () => site.incrementCart()

const loading = ref(true)
const error = ref('')
const categories = ref([])
const products = ref([])

const detailsOpen = ref(false)
const selectedProduct = ref(null)

const display = useDisplay()
const detailsBtnSize = computed(() => (display.xs.value ? 'small' : 'default'))

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
    .filter((p) => Boolean(p?.showProductDiscount) && String(p?.price || '').trim() && String(p?.reducedPrice || '').trim())
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
      return
    }
    const [cats, prods] = await Promise.all([listCategories(), listDiscountProducts()])
    categories.value = cats
    products.value = prods
  } catch (e) {
    error.value = e?.message || String(e)
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="stack-lg">
    <h1>Reduceri</h1>
    <p class="muted">Oferte limitate la mobilierul de exterior selectat.</p>

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
        :description="p.description"
        :image="p.image"
        :price="String(p.price || '')"
        :reduced-price="String(p.reducedPrice || '')"
        :category-slug="p.categorySlug"
        :slug="p.slug"
        variant="discount"
        @details="openDetails(p)"
      />
    </div>

    <v-dialog v-model="detailsOpen" max-width="760">
      <v-card class="card" elevation="2">
        <v-card-title>
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

          <div class="kv" v-if="selectedProduct?.description">
            <div class="k muted">Descriere</div>
            <div class="v">{{ selectedProduct.description }}</div>
          </div>

          <div class="kv" v-if="selectedProduct?.price">
            <div class="k muted">Preț</div>
            <div class="v">{{ selectedProduct.price }} RON</div>
          </div>

          <div
            class="kv"
            v-if="selectedProduct?.showProductDiscount && String(selectedProduct?.reducedPrice || '').trim()"
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
  font-size: .85rem;
}
.v {
  line-height: 1.45;
}
</style>
