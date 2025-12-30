<script setup>
import { computed, reactive, ref } from 'vue'
import { app } from '../lib/firebase'

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

const touched = reactive({
  name: false,
  phone: false,
  email: false,
  message: false,
})

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim())

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

async function send() {
  sent.value = false
  error.value = ''

  if (!canSend.value) {
    error.value = 'Completează toate câmpurile obligatorii.'
    window.scrollTo({ top: 0, behavior: 'smooth' })
    return
  }

  const databaseURL = app?.options?.databaseURL
  if (!databaseURL) {
    error.value = 'Firebase nu este configurat (lipsește databaseURL).'
    window.scrollTo({ top: 0, behavior: 'smooth' })
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
    window.scrollTo({ top: 0, behavior: 'smooth' })
  } catch (e) {
    error.value = e?.message || String(e)
    window.scrollTo({ top: 0, behavior: 'smooth' })
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

    <p class="muted">Lasă-ne un mesaj folosind formularul de mai jos sau contactează-ne prin oricare din metodele indicate. Vom fi bucuroși să te ajutăm cu orice informație ai nevoie!</p>
    <div class="grid">
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
        <v-btn class="btn" type="submit" :disabled="!canSend || sending">
          {{ sending ? 'Se trimite…' : 'Trimite' }}
        </v-btn>
      </form>
      <div class="card">
        <div class="info-section">
          <strong>Zonă de prezentare produse</strong>
          <p class="muted">Strada Principală, Nr. 267, Chiheru de Sus</p>
          <p class="muted">Jud. Mureș</p>
        </div>
        <div class="info-section">
          <strong>Program</strong>
          <p class="muted">Luni–Vineri: 08:00–20:00</p>
          <p class="muted">Sâmbătă-Duminică: 10:00–15:00</p>
        </div>
        <div class="info-section">
          <strong>Telefon</strong>
          <p class="muted">0759 323 577</p>
        </div>
        <div class="info-section">
          <strong>E-mail</strong>
          <p class="muted">mobiliergradina_art@yahoo.com</p>
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
  padding: .6rem .9rem;
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
