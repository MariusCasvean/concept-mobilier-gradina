<script setup>
import { useRoute, RouterLink } from 'vue-router'
import { ref } from 'vue'
const route = useRoute()
const isActive = (path) => route.path === path
const drawer = ref(false)
const navItems = [
  { title: 'Acasă', to: '/' },
  { title: 'Produse', to: '/products' },
  // { title: 'News', to: '/news' },
  { title: 'Reduceri', to: '/discounts' },
  { title: 'Contact', to: '/contact' },
]
</script>

<template>
  <v-app-bar app flat class="header" height="64">
    <div class="container row sp-between">
      <RouterLink class="brand row" to="/">
        <div class="logo">CMG</div>
        <div class="brand-text">
          <strong>Concept Mobilier Grădină</strong>
        </div>
      </RouterLink>

      <div class="row right-area">
        <nav class="nav">
          <RouterLink to="/" class="nav-link" :class="{active: isActive('/')}">Acasă</RouterLink>
          <RouterLink to="/products" class="nav-link" :class="{active: isActive('/products')}">Produse</RouterLink>
          <!-- <RouterLink to="/news" class="nav-link" :class="{active: isActive('/news')}">Noutăți</RouterLink> -->
          <RouterLink to="/discounts" class="nav-link" :class="{active: isActive('/discounts')}">Reduceri</RouterLink>
          <RouterLink to="/contact" class="nav-link" :class="{active: isActive('/contact')}">Contact</RouterLink>
        </nav>
        <v-icon icon="mdi-menu" size="32" class="menu-btn" color="white" aria-label="Open navigation menu" @click="drawer = !drawer" />
      </div>
    </div>
  </v-app-bar>

  <v-navigation-drawer v-model="drawer" temporary width="280" location="right">
    <v-list density="comfortable">
      <v-list-item
        v-for="i in navItems"
        :key="i.to"
        :title="i.title"
        :to="i.to"
        :active="isActive(i.to)"
        @click="drawer = false"
      />
    </v-list>
  </v-navigation-drawer>
</template>

<style scoped>
.header {
  backdrop-filter: saturate(140%) blur(8px);
  background: linear-gradient(180deg, rgba(15,23,42,.85), rgba(15,23,42,.55));
  border-bottom: 1px solid rgba(255,255,255,.08);
}
.container {
  padding-block: .8rem;
}
.brand {
  color: var(--text);
  text-decoration: none;
}
.brand:hover {
  text-decoration: none;
}
.logo {
  width: 50px;
  height: 30px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, var(--accent), var(--accent-2));
  color: #0b1220;
  font-weight: 500;
}
.brand-text {
  display: grid;
  margin-left: .6rem;
  line-height: 1;
}
.nav {
  display: flex;
  gap: .6rem;
  align-items: center;
}
.nav-link {
  color: var(--text);
  opacity: .8;
  padding: .45rem .75rem;
  border-radius: 999px;
}
.nav-link:hover {
  opacity: 1;
  background: rgba(255,255,255,.06);
  text-decoration: none;
}
.nav-link.active {
  opacity: 1;
  background: rgba(34,211,238,.12);
  color: var(--accent);
}
.right-area {
  align-items: center;
}
.menu-btn {
  display: inline-flex;
  margin-left: .5rem;
  color: #fff !important;
}
@media (max-width: 720px) {
  .nav {
    display: none;
  }
}
@media (min-width: 721px) {
  .menu-btn {
    display: none;
  }
}
</style>
