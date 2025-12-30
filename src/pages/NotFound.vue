<script setup>
import { RouterLink } from 'vue-router'
</script>

<template>
  <div class="card" style="text-align:center; padding:2rem;">
    <h1>Upsss...</h1>
    <p class="muted mb-8">Această pagină nu a fost găsită.</p>
    <RouterLink to="/" class="cta">Înapoi la pagina principală</RouterLink>
  </div>
</template>

<style scoped>
.cta {
  background: linear-gradient(135deg, var(--accent), var(--accent-2));
  color: #0b1220;
  padding: .6rem 1rem;
  border-radius: 10px;
  font-weight: 800;
}
.cta:hover {
  filter: brightness(1.05);
  text-decoration: none;
}
</style>
