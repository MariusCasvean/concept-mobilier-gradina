import { defineStore } from 'pinia'
import { onValue, ref as dbRef } from 'firebase/database'
import { rtdb } from '../lib/firebase'

let unsubscribeConfiguration = null

export const useSiteStore = defineStore('site', {
  state: () => ({
    cartCount: 0,
    theme: 'dark',
    configuration: {
      carouselImageNumber: true,
    },
    configurationLoaded: false,
  }),
  actions: {
    incrementCart() { this.cartCount++ },
    setTheme(t) { this.theme = t },

    subscribeConfiguration() {
      if (unsubscribeConfiguration) return

      // Default behavior if Firebase is unavailable is to keep defaults.
      if (!rtdb) {
        this.configurationLoaded = true
        return
      }

      const configurationRef = dbRef(rtdb, 'configuration')
      unsubscribeConfiguration = onValue(
        configurationRef,
        (snap) => {
          const raw = snap.val() || {}
          const next = { ...this.configuration }
          if (typeof raw?.carouselImageNumber === 'boolean') next.carouselImageNumber = raw.carouselImageNumber
          else next.carouselImageNumber = true
          this.configuration = next
          this.configurationLoaded = true
        },
        () => {
          this.configurationLoaded = true
        }
      )
    },

    unsubscribeConfiguration() {
      unsubscribeConfiguration?.()
      unsubscribeConfiguration = null
    },
  },
})
