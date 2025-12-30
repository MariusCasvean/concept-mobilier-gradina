<script setup>
import { RouterLink } from 'vue-router'
</script>

<template>
  <section class="hero card">
    <div class="stack">
      <!-- <div class="pill">Colecție nouă</div> -->
      <h1><span class="accent">Mobilier modern sau rustic</span> de grădină, pentru o viață inspirată, în aer liber</h1>
      <p>Descoperă design-uri premium care îmbină durabilitatea cu confortul. Realizate pentru toate anotimpurile.</p>
      <div class="row ctas">
        <v-btn class="cta" to="/products">Explorează produse</v-btn>
        <v-btn class="cta ghost" to="/discounts">Vezi reduceri</v-btn>
      </div>
    </div>
  </section>
</template>

<style scoped>
.hero {
  padding: 2rem;
}
h1 {
  font-size: clamp(1.8rem, 2.6vw + 1rem, 3rem);
  margin: 0;
}
.cta {
  background: linear-gradient(135deg, var(--accent), var(--accent-2));
  color: #0b1220;
  border-radius: 6px;
}
.cta.ghost {
  background: transparent;
  border: 1px solid rgba(255,255,255,.18);
  color: var(--text);
}
.cta:hover {
  filter: brightness(1.05);
  text-decoration: none;
}

.ctas {
  justify-content: center;
  margin-top: 3rem;
}

@media (min-width: 960px) {
  .ctas {
    justify-content: flex-start;
  }
}
</style>
