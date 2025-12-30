<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import PageLoader from '../components/ui/PageLoader.vue'
import { normalizeForSearch } from '../lib/text'
import { listCategories, listProducts } from '../services/productsService'

const router = useRouter()
const categories = ref([])
const products = ref([])
const error = ref('')
const loading = ref(true)
const query = ref('')

const productCountByCategoryId = computed(() => {
  const counts = new Map()
  for (const p of products.value) {
    const cid = String(p?.categoryId ?? '')
    if (!cid) continue
    counts.set(cid, (counts.get(cid) || 0) + 1)
  }
  return counts
})

onMounted(async () => {
  try {
    const [cats, prods] = await Promise.all([listCategories(), listProducts()])
    categories.value = cats
    products.value = prods
  } catch (e) {
    error.value = e?.message || String(e)
  } finally {
    loading.value = false
  }
})

function openCategory(c) {
  router.push(`/products/${c.slug}`)
}

function getProductCount(c) {
  const cid = String(c?.id ?? '')
  if (!cid) return 0
  return productCountByCategoryId.value.get(cid) || 0
}

const filteredCategories = computed(() => {
  const q = normalizeForSearch(query.value)
  if (!q) return categories.value
  return categories.value.filter((c) => normalizeForSearch(c?.title).includes(q))
})
</script>

<template>
  <div class="stack-lg">
    <header class="row sp-between">
      <h1>Categorii</h1>
      <div v-if="!loading" class="row">
        <span class="pill">{{ categories.length }} categorii</span>
      </div>
      <div v-if="!loading" class="row mt-5">
        <p class="muted">Navigheaza printre produse, alege care îți place și nu ezita să iei legatura cu noi, pentru orice detalii sau pentru a plasa o comandă.</p>
      </div>
    </header>

    <PageLoader v-if="loading" />

    <div v-else-if="error" class="card">
      <strong>Eroare</strong>
      <p class="muted">{{ error }}</p>
    </div>

    <div v-else class="stack">
      <div class="stickySearch">
        <v-text-field
          v-model="query"
          variant="outlined"
          density="compact"
          hide-details
          clearable
          append-inner-icon="mdi-magnify"
          label="Caută categorie"
          autocomplete="off"
        />
      </div>

      <div v-if="filteredCategories.length === 0" class="card">
        <strong>Nu am găsit categorii.</strong>
        <p class="muted">Încearcă un alt titlu.</p>
      </div>

      <div v-else class="grid">
      <v-card
        v-for="c in filteredCategories"
        :key="c.id || c.slug"
        class="categoryCard"
        elevation="2"
        :style="c.image ? { backgroundImage: `linear-gradient(180deg, rgba(11,18,32,.70), rgba(11,18,32,.92)), url(${c.image})`, borderLeft: `1rem solid ${c.background}` } : undefined"
      >
        <v-card-text class="body">
          <div class="head">
            <div class="stack">
              <strong class="title">{{ c.title }}</strong>
              <p class="muted">{{ c.description }}</p>
            </div>
            <div class="thumb" aria-hidden="true">
              <img v-if="c.image" class="thumbImg" :src="c.image" alt="" />
            </div>
          </div>

          <div class="actions">
            <v-btn variant="flat" class="cta mt-4" @click="openCategory(c)">Vezi produse ({{ getProductCount(c) }})</v-btn>
          </div>
        </v-card-text>
      </v-card>
      </div>
    </div>
  </div>
</template>

<style scoped>
.stickySearch {
  position: sticky;
  top: 64px;
  z-index: 10;
  padding: .5rem;
  backdrop-filter: blur(100px);
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
}

.stickySearch :deep(.v-field) {
  background: transparent;
}

.grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}
.categoryCard {
  overflow: hidden;
  height: 100%;
  display: flex;
  background-size: cover;
  background-position: center;
}
.body {
  display: grid;
  gap: .5rem;
}
.head {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: .75rem;
  align-items: flex-start;
}
.head > .stack {
  min-width: 0;
}
.thumb {
  width: min(120px, 30vw);
  aspect-ratio: 1 / 1;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid rgba(255,255,255,.08);
  background: rgba(255,255,255,.06);
}
.thumbImg {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.title {
  font-size: 1.05rem;
}
.actions {
  display: flex;
  justify-content: flex-end;
  align-items: flex-end;
}
.cta {
  background: linear-gradient(135deg, var(--accent), var(--accent-2));
  color: #0b1220;
  padding: .6rem 1rem;
  border-radius: 10px;
}
.cta:hover {
  filter: brightness(1.05);
  text-decoration: none;
}
.row p {
  text-align: justify;
}
@media (min-width: 600px) {
  .grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (min-width: 960px) {
  .grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
</style>
