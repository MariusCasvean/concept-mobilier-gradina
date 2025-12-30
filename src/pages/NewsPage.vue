<script setup>
import { RouterLink } from 'vue-router'
const articles = [
  { title: 'Launch: Summer 2025 Collection', date: '2025-06-12', excerpt: 'Explore light frames and eco fabrics built for long sunny days.', slug: 'summer-2025' },
  { title: 'Behind the Materials: Why Teak?', date: '2025-05-01', excerpt: 'We dive into durability and maintenance tips for teak furniture.', slug: 'why-teak' },
]
</script>

<template>
  <div class="stack-lg">
    <h1>News</h1>
    <div class="stack">
      <article class="card" v-for="a in articles" :key="a.slug">
        <header class="row sp-between">
          <h3 style="margin:0">{{ a.title }}</h3>
          <span class="muted">{{ a.date }}</span>
        </header>
        <p class="muted">{{ a.excerpt }}</p>
        <RouterLink :to="`/news#${a.slug}`">Read more</RouterLink>
      </article>
    </div>
  </div>
</template>
