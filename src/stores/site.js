import { defineStore } from 'pinia'

export const useSiteStore = defineStore('site', {
  state: () => ({
    cartCount: 0,
    theme: 'dark',
  }),
  actions: {
    incrementCart() { this.cartCount++ },
    setTheme(t) { this.theme = t },
  },
})
