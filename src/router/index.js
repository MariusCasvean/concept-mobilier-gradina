import { createRouter, createWebHistory } from 'vue-router'
import { nextTick } from 'vue'
import { isAdminAuthorized } from '../stores/adminAuth'

function forceScrollTop() {
  try {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  } catch {
    window.scrollTo(0, 0)
  }

  if (document?.documentElement) document.documentElement.scrollTop = 0
  if (document?.body) document.body.scrollTop = 0

  // Vuetify / app scrollers (depends on layout)
  const selectors = ['.v-main', '.v-main__scroller', '.v-application__wrap', '#app']
  for (const selector of selectors) {
    const nodeList = document.querySelectorAll(selector)
    for (const element of nodeList) {
      if (element && typeof element.scrollTop === 'number') element.scrollTop = 0
    }
  }
}

const routes = [
  { path: '/', name: 'home', component: () => import('../pages/HomePage.vue'), meta: { title: 'Home' } },
  { path: '/products', name: 'products', component: () => import('../pages/ProductsPage.vue'), meta: { title: 'Products' } },
  {
    path: '/admin',
    name: 'admin',
    component: () => import('../pages/AdminPage.vue'),
    meta: { title: 'Administrare', requiresAdmin: true },
  },
  {
    path: '/products/:categorySlug/:productSlug',
    name: 'product-details',
    component: () => import('../pages/ProductDetailsPage.vue'),
    meta: { title: 'Products' },
  },
  {
    path: '/products/:categorySlug',
    name: 'products-category',
    component: () => import('../pages/CategoryProductsPage.vue'),
    meta: { title: 'Products' },
  },
  { path: '/news', name: 'news', component: () => import('../pages/NewsPage.vue'), meta: { title: 'News' } },
  { path: '/discounts', name: 'discounts', component: () => import('../pages/DiscountsPage.vue'), meta: { title: 'Discounts' } },
  { path: '/contact', name: 'contact', component: () => import('../pages/ContactPage.vue'), meta: { title: 'Contact' } },
  { path: '/:pathMatch(.*)*', name: 'not-found', component: () => import('../pages/NotFound.vue'), meta: { title: 'Not found' } },
]

const router = createRouter({
	history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition
    if (to.hash) return { el: to.hash }
    // Router scrollBehavior only affects the main window scroll.
    // We also force scroll for nested scrollers in afterEach.
    return { top: 0, left: 0 }
  },
})

router.beforeEach((to) => {
  if (to.meta?.requiresAdmin && !isAdminAuthorized()) {
    return { name: 'home' }
  }
})

router.afterEach((to) => {
  document.title = `Concept Mobilier Grădină`

  // Ensure we scroll even when content renders async or inside a scroll container.
  nextTick(() => {
    forceScrollTop()
    requestAnimationFrame(forceScrollTop)
    setTimeout(forceScrollTop, 50)
  })
})

export default router
