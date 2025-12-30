import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './assets/main.css'

import { logRealtimeData } from './services/firebaseRealtimeDebug'

// Vuetify
import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

const app = createApp(App)

app.use(createPinia())
app.use(router)

const vuetify = createVuetify({
	components,
	directives,
	theme: {
		defaultTheme: 'dark',
	},
	icons: {
		defaultSet: 'mdi',
	},
})

app.use(vuetify)

app.mount('#app')

if (import.meta.env.DEV) {
	logRealtimeData()
}
