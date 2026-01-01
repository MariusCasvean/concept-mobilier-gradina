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
      <v-img :src="product?.image" height="360" cover alt="" />
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
