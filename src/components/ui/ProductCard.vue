<script setup>
import { computed } from 'vue'
import { useDisplay } from 'vuetify'
const emit = defineEmits(['details', 'add'])
const props = defineProps({
  categorySlug: String,
  title: String,
  price: String,
  reducedPrice: String,
  showPrice: { type: Boolean, default: true },
  description: String,
  image: String,
  slug: String,
  variant: { type: String, default: 'default' },
  to: [String, Object],
  cardClickable: { type: Boolean, default: true },
  ctaBehavior: { type: String, default: 'link' },
})

const display = useDisplay()
const ctaBtnSize = computed(() => (display.xs.value ? 'small' : 'default'))

const detailsTo = computed(() => {
  if (props.categorySlug && props.slug) return `/products/${props.categorySlug}/${props.slug}`
  if (props.categorySlug) return `/products/${props.categorySlug}`
  return '/products'
})

const cardTo = computed(() => props.to || detailsTo.value)
const isCardClickable = computed(() => props.cardClickable !== false)
const isCtaLink = computed(() => props.ctaBehavior !== 'emit')

const isDiscount = computed(() => props.variant === 'discount')
const shouldShowPrice = computed(() => props.showPrice !== false)
const hasPrice = computed(() => shouldShowPrice.value && Boolean(String(props.price || '').trim()))
const hasReduced = computed(() => hasPrice.value && Boolean(String(props.reducedPrice || '').trim()))
</script>

<template>
  <v-card class="product" :class="{ discount: isDiscount }" elevation="2" :to="isCardClickable ? cardTo : undefined">
    <div class="media" aria-hidden="true">
      <v-img class="mediaImg" :src="image" cover alt="" />
    </div>
    <v-card-text class="info">
      <header class="row sp-between">
        <strong class="name">{{ title }}</strong>
        <span v-if="isDiscount && hasReduced" class="prices">
          <span class="oldPrice">{{ price }} RON</span>
          <span class="newPrice">{{ reducedPrice }} RON</span>
        </span>
        <span v-else-if="hasPrice" class="pill">{{ price }} RON</span>
      </header>
      <p class="muted desc">{{ description }}</p>
      <div class="actions">
        <v-btn
          v-if="isCtaLink"
          class="cta mt-2"
          :size="ctaBtnSize"
          :to="cardTo"
        >
          Detalii
        </v-btn>
        <v-btn
          v-else
          class="cta mt-2"
          :size="ctaBtnSize"
          @click="emit('details')"
        >
          Detalii
        </v-btn>
      </div>
    </v-card-text>
  </v-card>
  
</template>

<style scoped>
.product {
  display: flex;
  flex-direction: column;
  height: 100%;
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
.media {
  height: 200px;
  flex: 0 0 auto;
}
/* v-img renders a v-responsive wrapper; force it to fill our fixed media box */
.media :deep(.v-responsive) {
  height: 100% !important;
}
.media :deep(img) {
  height: 100% !important;
}
.info {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: .5rem;
}
.info header {
  min-width: 0;
}
.name {
  min-width: 0;
  display: -webkit-box;
  line-clamp: 2;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
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
.prices {
  display: inline-flex;
  align-items: baseline;
  gap: .5rem;
}
.oldPrice {
  color: var(--muted);
  text-decoration: line-through;
  font-weight: 500;
}
.newPrice {
  padding: .35rem .7rem;
  border-radius: 999px;
  font-size: .85rem;
  font-weight: 500;
  color: var(--card);
  background: var(--accent);
}
.actions {
  display: flex;
  gap: .75rem;
  justify-content: flex-end;
  flex-wrap: wrap;
  margin-top: auto;
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
.details {
  color: var(--link);
  font-weight: 600;
}
</style>
