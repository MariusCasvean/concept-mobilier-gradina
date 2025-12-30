<script setup>
import { computed, onMounted, ref } from 'vue'
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

const categorySlugById = computed(() => {
  const map = new Map()
  for (const c of categories.value) map.set(String(c.id), String(c.slug || ''))
  return map
})

const discounted = computed(() => {
  return products.value
    .filter((p) => Boolean(p?.showProductDiscount) && String(p?.price || '').trim() && String(p?.reducedPrice || '').trim())
    .map((p) => ({
      ...p,
      categorySlug: p.categorySlug || categorySlugById.value.get(String(p.categoryId || '')) || '',
    }))
})

function detailsTo(p) {
  const categorySlug = String(p?.categorySlug || '').trim()
  const productId = String(p?.id || '').trim()
  if (!categorySlug || !productId) return '/products'
  return `/products/${encodeURIComponent(categorySlug)}?productId=${encodeURIComponent(productId)}`
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
        :to="detailsTo(p)"
        :title="p.title"
        :description="p.description"
        :image="p.image"
        :price="String(p.price || '')"
        :reduced-price="String(p.reducedPrice || '')"
        :category-slug="p.categorySlug"
        :slug="p.slug"
        variant="discount"
        @add="add(p)"
      />
    </div>
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
</style>
