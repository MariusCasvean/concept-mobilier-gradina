<script setup>
import { onMounted } from 'vue'
import { RouterView } from 'vue-router'
import SiteHeader from './components/layout/SiteHeader.vue'
import SiteFooter from './components/layout/SiteFooter.vue'
import { useSiteStore } from './stores/site'

const site = useSiteStore()

onMounted(() => {
  site.subscribeConfiguration()
})
</script>

<template>
  <v-app>
    <SiteHeader />
    <v-main class="main">
      <div class="container page-shell">
        <RouterView />
      </div>
    </v-main>
    <SiteFooter />
  </v-app>
</template>

<style scoped>
.main {
  min-height: calc(100vh - var(--v-layout-top, 0px));
}
.page-shell {
  padding-block: 1rem 2rem;
}
@media (min-width: 768px) {
  .page-shell {
    padding-block: 1.25rem 2.5rem;
  }
}
</style>
