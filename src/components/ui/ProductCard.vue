<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
const props = defineProps({
  categorySlug: String,
  title: String,
  price: String,
  description: String,
  image: String,
  slug: String,
})

const detailsTo = computed(() => {
  if (!props.categorySlug || !props.slug) return '/products'
  return `/products/${props.categorySlug}/${props.slug}`
})
</script>

<template>
  <v-card class="product" elevation="2" :to="detailsTo" hover>
    <v-img :src="image" height="200" cover alt="" />
    <v-card-text class="info">
      <header class="row sp-between">
        <strong>{{ title }}</strong>
        <span class="pill">{{ price }} RON</span>
      </header>
      <p class="muted">{{ description }}</p>
      <div class="actions">
        <!-- <v-btn color="cyan" variant="flat" class="add" @click.stop="$emit('add')">Add to cart</v-btn> -->
        <v-btn color="cyan" variant="flat" class="add" @click.stop="$emit('add')">Detalii</v-btn>
        <RouterLink class="details" :to="detailsTo" @click.stop>Detalii</RouterLink>
      </div>
    </v-card-text>
  </v-card>
  
</template>

<style scoped>
.product {
  overflow: hidden;
}
.info {
  display: grid;
  gap: .5rem;
}
.actions {
  display: flex;
  gap: .75rem;
  align-items: center;
  flex-wrap: wrap;
}
.add {
  color: #0b1220;
  font-weight: 700;
}
.details {
  color: var(--link);
  font-weight: 600;
}
</style>
