<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
const props = defineProps({
  categorySlug: String,
  title: String,
  price: String,
  reducedPrice: String,
  description: String,
  image: String,
  slug: String,
  variant: { type: String, default: 'default' },
  to: [String, Object],
})

const detailsTo = computed(() => {
  if (props.categorySlug && props.slug) return `/products/${props.categorySlug}/${props.slug}`
  if (props.categorySlug) return `/products/${props.categorySlug}`
  return '/products'
})

const cardTo = computed(() => props.to || detailsTo.value)

const isDiscount = computed(() => props.variant === 'discount')
const hasReduced = computed(() => Boolean(String(props.reducedPrice || '').trim()))
</script>

<template>
  <v-card class="product" :class="{ discount: isDiscount }" elevation="2" :to="cardTo">
    <v-img :src="image" height="200" cover alt="" />
    <v-card-text class="info">
      <header class="row sp-between">
        <strong>{{ title }}</strong>
        <span v-if="isDiscount && hasReduced" class="prices">
          <span class="oldPrice">{{ price }} RON</span>
          <span class="newPrice">{{ reducedPrice }} RON</span>
        </span>
        <span v-else class="pill">{{ price }} RON</span>
      </header>
      <p class="muted">{{ description }}</p>
      <div class="actions">
        <v-btn class="cta" :to="cardTo">Vezi produsul</v-btn>
      </div>
    </v-card-text>
  </v-card>
  
</template>

<style scoped>
.product {
  overflow: hidden;
  text-decoration: none;
}
.product:hover {
  text-decoration: none;
}

/* Vuetify renders v-card with :to as an <a>; our global a:hover underline would affect inner text. */
.product :deep(a),
.product :deep(a:hover),
.product :deep(.v-btn),
.product :deep(.v-btn:hover) {
  text-decoration: none;
}
.product.discount {
  border: 1px solid color-mix(in srgb, var(--accent) 28%, transparent);
  background:
    radial-gradient(1000px 500px at 10% 0%, color-mix(in srgb, var(--accent) 22%, transparent), transparent 60%),
    radial-gradient(900px 520px at 110% 0%, color-mix(in srgb, var(--accent-2) 22%, transparent), transparent 60%),
    linear-gradient(180deg, rgba(255,255,255,.03), rgba(255,255,255,.01));
}
.info {
  display: grid;
  gap: .5rem;
}
.prices {
  display: inline-flex;
  align-items: baseline;
  gap: .5rem;
}
.oldPrice {
  color: var(--muted);
  text-decoration: line-through;
  font-weight: 600;
}
.newPrice {
  padding: .35rem .7rem;
  border-radius: 999px;
  font-size: .85rem;
  font-weight: 500;
  color: var(--card);
  background: linear-gradient(135deg, var(--accent), var(--accent-2));
}
.actions {
  display: flex;
  gap: .75rem;
  justify-content: flex-end;
  flex-wrap: wrap;
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
.details {
  color: var(--link);
  font-weight: 600;
}
</style>
