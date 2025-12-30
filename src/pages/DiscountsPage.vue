<script setup>
import ProductCard from '../components/ui/ProductCard.vue'
import { useSiteStore } from '../stores/site'

const site = useSiteStore()
const add = () => site.incrementCart()

const items = [
  { title: 'Coastal Chair', price: '$199 → $149', description: 'Lightweight and stackable chair.', image: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?q=80&w=1200&auto=format&fit=crop', slug: 'coastal-chair' },
  { title: 'Lagoon Umbrella', price: '$249 → $189', description: 'UV50+ canopy with tilt function.', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1200&auto=format&fit=crop', slug: 'lagoon-umbrella' },
]
</script>

<template>
  <div class="stack-lg">
    <h1>Reduceri</h1>
    <p class="muted">Oferte limitate la mobilierul de exterior selectat.</p>
    <div class="grid">
      <ProductCard
        v-for="p in items"
        :key="p.slug"
        v-bind="p"
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
