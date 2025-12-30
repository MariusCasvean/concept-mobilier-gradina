<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { useDisplay } from 'vuetify'
import PageLoader from '../components/ui/PageLoader.vue'
import { normalizeForSearch } from '../lib/text'
import { getCategoryBySlug, listProductsByCategory } from '../services/productsService'

const route = useRoute()

const categorySlug = computed(() => String(route.params.categorySlug || ''))
const requestedProductId = computed(() => String(route.query.productId || ''))

const products = ref([])
const loading = ref(true)
const error = ref('')
const query = ref('')

const display = useDisplay()
const detailsBtnSize = computed(() => (display.xs.value ? 'small' : 'default'))

const category = ref(null)

const detailsOpen = ref(false)
const selectedProduct = ref(null)

const categoryTitle = computed(() => category.value?.title || categorySlug.value)

const filteredProducts = computed(() => {
  const q = normalizeForSearch(query.value)
  if (!q) return products.value
  return products.value.filter((p) => normalizeForSearch(p?.title).includes(q))
})

function openDetails(p) {
  selectedProduct.value = p
  detailsOpen.value = true
}

function closeDetails() {
  detailsOpen.value = false
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
</script>

<template>
  <div class="stack-lg">
    <header class="stack">
      <div class="row sp-between">
        <div class="stack">
          <RouterLink v-if="!loading" class="muted" to="/products">← Înapoi la categorii</RouterLink>
          <h1 class="title">
            {{ category?.title }}
            <span v-if="!loading" class="pill">{{ products.length }} {{ products.length === 1 ? 'produs' : 'produse' }}</span>
          </h1>
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

      <div v-if="products.length > 0 && filteredProducts.length === 0" class="card">
        <strong>Nu am găsit produse.</strong>
        <p class="muted">Încearcă un alt titlu.</p>
      </div>

      <div v-else class="grid">
      <v-card v-for="p in filteredProducts" :key="p.id || p.slug" class="product" elevation="2" :style="{ border: `1px solid ${p.background}`, borderLeft: `0.5rem solid ${p.background}` }">
        <div class="imgSlot" aria-hidden="true">
          <div
            v-if="Boolean(p?.showProductDiscount) && String(p?.reducedPrice || '').trim()"
            class="discountBadge"
          >
            Reducere
          </div>
          <v-img v-if="p.image" :src="p.image" height="128" cover alt="" />
          <div v-else class="imgPlaceholder" />
        </div>
        <v-card-text class="info">
          <div class="row sp-between">
            <strong class="name">{{ p.title }}</strong>
          </div>
          <p v-if="p.description" class="muted desc">{{ p.description }}</p>
          <span v-if="p.price" class="pill">{{ p.price }} RON</span>
          <div class="actions">
            <v-btn variant="flat" class="cta mt-2" color="cyan" :size="detailsBtnSize" @click="openDetails(p)">Detalii</v-btn>
          </div>
        </v-card-text>
      </v-card>
      </div>
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
            <div class="v">{{ categoryTitle }}</div>
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
          <v-btn color="cyan" variant="flat" @click="closeDetails">OK</v-btn>
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
.stickySearch {
  position: sticky;
  top: 64px;
  z-index: 10;
  padding: .5rem;
  backdrop-filter: blur(100px);
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
}

.title {
  display: flex;
  gap: .75rem;
  align-items: baseline;
  flex-wrap: wrap;
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
