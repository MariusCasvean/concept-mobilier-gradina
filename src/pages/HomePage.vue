<script setup>
import { computed, ref, onMounted } from 'vue'
import HeroSection from '../components/ui/HeroSection.vue'
import ProductCard from '../components/ui/ProductCard.vue'
import PageLoader from '../components/ui/PageLoader.vue'
import { useSiteStore } from '../stores/site'
import { rtdb } from '../lib/firebase'
import { listIntroTexts, listProducts } from '../services/productsService'

const site = useSiteStore()

// Products are loaded from Firestore if configured,
// otherwise we return MOCK DATA from src/mocks/products.js (see productsService)
const products = ref([])
const loading = ref(true)
const error = ref('')

const introTexts = ref([])
const introLoading = ref(Boolean(rtdb))

const introLines = computed(() => {
  if (introLoading.value) return []
  return introTexts.value.map((x) => String(x?.text || '').trim()).filter(Boolean)
})

const featuredProducts = computed(() => products.value.slice(0, 6))

onMounted(async () => {
  try {
    const [prodsRes, introRes] = await Promise.allSettled([
      listProducts(),
      listIntroTexts(),
    ])

    if (prodsRes.status === 'fulfilled') products.value = prodsRes.value
    else throw prodsRes.reason

    if (introRes.status === 'fulfilled') introTexts.value = introRes.value
  } catch (e) {
    error.value = e?.message || String(e)
  } finally {
    introLoading.value = false
    loading.value = false
  }
})
</script>

<template>
  <div class="homeBg">
    <div class="container stack-lg homeInner">
      <HeroSection v-if="!loading" />
      <section class="stack">
        <PageLoader v-if="loading" />
        <template v-if="!loading">
          <h4 v-for="(t, idx) in introLines" :key="idx">{{ t }}</h4>
          <div v-if="error" class="muted">ERROR: {{ error }}</div>
        </template>
      </section>
    </div>
  </div>
</template>

<style scoped>
.homeBg {
  position: relative;
  min-height: calc(100vh - var(--v-layout-top, 0px));
  width: 100vw;
  margin-left: calc(50% - 50vw);
  margin-right: calc(50% - 50vw);
  margin-top: -1rem;
  margin-bottom: -2rem;
  background-image: url('../assets/images/bg.png');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  background-attachment: fixed;
}
.homeBg::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(11,18,32,.28), rgba(11,18,32,.78));
  pointer-events: none;
}
.homeInner {
  position: relative;
  padding-block: 1rem 2rem;
}
.sectionTitle {
  margin: 1.25rem 0 .5rem;
}
@media (max-width: 599px) {
  .homeBg {
    background-attachment: scroll;
    background-position: 75% center;
  }
}
@media (min-width: 768px) {
  .homeBg {
    margin-top: -1.25rem;
    margin-bottom: -2.5rem;
  }
  .homeInner {
    padding-block: 1.25rem 2.5rem;
  }
}
.grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}
h4 {
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
