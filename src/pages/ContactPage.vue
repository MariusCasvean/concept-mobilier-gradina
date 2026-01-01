<script setup>
import { computed, nextTick, onMounted, reactive, ref } from 'vue'
import { useDisplay } from 'vuetify'
import { app, rtdb } from '../lib/firebase'
import { listContactInfo, listIntroContactTexts } from '../services/productsService'

const contact = reactive({
  name: '',
  phone: '',
  email: '',
  subject: '',
  message: '',
})

const sending = ref(false)
const error = ref('')
const sent = ref(false)

const introTexts = ref([])
const introLoading = ref(Boolean(rtdb))

const contactInfo = ref([])
const contactInfoLoading = ref(Boolean(rtdb))

const introLines = computed(() => {
  if (introLoading.value) return []
  return introTexts.value.map((x) => String(x?.text || '').trim()).filter(Boolean)
})

const contactInfoSections = computed(() => {
  if (!rtdb) return []
  if (contactInfoLoading.value) return []
  return (contactInfo.value || [])
    .map((s) => ({
      ...s,
      label: String(s?.label || '').trim(),
      texts: Array.isArray(s?.texts) ? s.texts.map((t) => String(t ?? '').trim()) : [],
    }))
    .filter((s) => s.label)
})

const hasContactInfo = computed(() => contactInfoSections.value.length > 0)

const display = useDisplay()
const submitBtnSize = computed(() => (display.xs.value ? 'small' : 'default'))

const touched = reactive({
  name: false,
  phone: false,
  email: false,
  message: false,
})

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim())

function forceScrollTop() {
  try {
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' })
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

function resetTouched() {
  touched.name = false
  touched.phone = false
  touched.email = false
  touched.message = false
}

const requiredIfTouched = (key) => (v) => {
  if (!touched[key]) return true
  return String(v ?? '').trim() ? true : ''
}

const emailIfTouched = (v) => {
  if (!touched.email) return true
  const s = String(v ?? '').trim()
  if (!s) return true
  return isValidEmail(s) ? true : 'E-mail invalid.'
}

const canSend = computed(() => {
  return (
    String(contact.name).trim().length > 0 &&
    String(contact.phone).trim().length > 0 &&
    String(contact.message).trim().length > 0
  )
})

onMounted(async () => {
  if (!rtdb) {
    introLoading.value = false
    contactInfoLoading.value = false
    return
  }
  try {
    const [introRes, contactRes] = await Promise.allSettled([
      listIntroContactTexts(),
      listContactInfo(),
    ])
    if (introRes.status === 'fulfilled') introTexts.value = introRes.value
    if (contactRes.status === 'fulfilled') contactInfo.value = contactRes.value
  } catch {
  } finally {
    introLoading.value = false
    contactInfoLoading.value = false
  }
})

async function send() {
  sent.value = false
  error.value = ''

  if (!canSend.value) {
    error.value = 'Completează toate câmpurile obligatorii.'
    await nextTick()
    forceScrollTop()
    return
  }

  const databaseURL = app?.options?.databaseURL
  if (!databaseURL) {
    error.value = 'Firebase nu este configurat (lipsește databaseURL).'
    await nextTick()
    forceScrollTop()
    return
  }

  sending.value = true
  try {
    const data = {
      name: String(contact.name).trim(),
      phone: String(contact.phone).trim(),
      email: String(contact.email).trim(),
      subject: String(contact.subject).trim(),
      message: String(contact.message).trim(),
      deleted: false,
      createdAt: Date.now(),
    }

    const res = await fetch(`${databaseURL.replace(/\/$/, '')}/messages.json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(text || `Request failed (${res.status})`)
    }

    contact.name = ''
    contact.phone = ''
    contact.email = ''
    contact.subject = ''
    contact.message = ''
    resetTouched()
    sent.value = true
    await nextTick()
    forceScrollTop()
    requestAnimationFrame(forceScrollTop)
  } catch (e) {
    error.value = e?.message || String(e)
    await nextTick()
    forceScrollTop()
    requestAnimationFrame(forceScrollTop)
  } finally {
    sending.value = false
  }
}
</script>

<template>
  <div class="stack-lg contact-page">
    <h1>Contact</h1>

    <div v-if="sent" class="card">
      <strong>Mesaj trimis</strong>
      <p class="muted">Îți mulțumim! Revenim cât de curând.</p>
    </div>

    <div v-if="error" class="card">
      <strong>Eroare</strong>
      <p class="muted">{{ error }}</p>
    </div>

    <div class="stack" style="gap: .35rem;">
      <p v-for="(t, idx) in introLines" :key="idx" class="muted">{{ t }}</p>
    </div>
    <div class="grid" :class="{ oneCol: !hasContactInfo }">
      <form class="card" @submit.prevent="send">
        <div class="row">
          <v-text-field
            v-model="contact.name"
            variant="outlined"
            density="compact"
            label="Nume *"
            autocomplete="off"
            required
            :rules="[requiredIfTouched('name')]"
            @blur="touched.name = true"
          />
        </div>
        <div class="row">
          <v-text-field
            v-model="contact.phone"
            variant="outlined"
            density="compact"
            label="Telefon *"
            autocomplete="off"
            required
            :rules="[requiredIfTouched('phone')]"
            @blur="touched.phone = true"
          />
        </div>
        <div class="row">
          <v-text-field
            v-model="contact.email"
            type="email"
            variant="outlined"
            density="compact"
            label="E-mail"
            autocomplete="off"
            :rules="[emailIfTouched]"
            @blur="touched.email = true"
          />
        </div>
        <div class="row">
          <v-text-field v-model="contact.subject" variant="outlined" density="compact" label="Subiect" autocomplete="off" />
        </div>
        <div class="row">
          <v-textarea
            v-model="contact.message"
            variant="outlined"
            density="compact"
            label="Mesaj *"
            rows="6"
            autocomplete="off"
            required
            :rules="[requiredIfTouched('message')]"
            @blur="touched.message = true"
          />
        </div>
        <div class="row d-flex justify-end">
          <v-btn class="btn" type="submit" :size="submitBtnSize" :disabled="!canSend || sending">
            {{ sending ? 'Se trimite…' : 'Trimite mesaj' }}
          </v-btn>
        </div>
      </form>
      <div v-if="hasContactInfo" class="card">
        <div v-for="s in contactInfoSections" :key="s.id || s.label" class="info-section">
          <strong>{{ s.label }}</strong>
          <p v-for="(t, idx) in (s.texts || [])" :key="idx" class="muted" style="margin:0; min-height: 1em;">{{ String(t ?? '').trim() ? t : '\u00A0' }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}
.field {
  width: 100%;
  background: rgba(255,255,255,.06);
  border: 1px solid rgba(255,255,255,.12);
  border-radius: 10px;
  padding: .7rem .8rem;
  color: var(--text);
}
.btn {
  background: linear-gradient(135deg, var(--accent), var(--accent-2));
  color: #0b1220;
  border-radius: 6px;
  cursor: pointer;
}
.btn:hover {
  filter: brightness(1.05);
}
.btn:disabled {
  opacity: .5;
  cursor: not-allowed;
}
.info-section {
  margin-bottom: 1rem;
}
@media (min-width: 960px) {
  .grid {
    grid-template-columns: 1.5fr 1fr;
  }
  .grid.oneCol {
    grid-template-columns: 1fr;
  }
}

/* Neutralize background glow under cards on small screens */
@media (max-width: 600px) {
  .contact-page .card {
    background: var(--bg);
    border: 1px solid rgba(255,255,255,.08);
    backdrop-filter: none;
  }
}
</style>
