<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useAdminAuthStore } from '../../stores/adminAuth'
import { subscribeFooterTexts } from '../../services/productsService'

const router = useRouter()
const adminAuth = useAdminAuthStore()

const adminDialog = ref(false)
const adminPassword = ref('')
const showPassword = ref(false)

const canConfirmAdmin = computed(() => String(adminPassword.value ?? '') !== '')

const footerTexts = ref([])

const footerFallbackLines = [
  'Design modern sau rustic pentru spații exterioare.',
  'Calitate, confort și stil.',
]

const footerLines = computed(() => {
  const fromDb = (footerTexts.value || [])
    .map((x) => String(x?.text ?? '').trim())
    .filter(Boolean)
  return fromDb.length ? fromDb : footerFallbackLines
})

// WhatsApp expects E.164 format (country code + number, no leading 0).
// 0759 323 577 -> +40 759 323 577 -> 40759323577
const whatsappPhoneE164 = '40759323577'
const whatsappHref = computed(() => `https://wa.me/${whatsappPhoneE164}`)

let unsubscribeFooter = null

onMounted(() => {
  unsubscribeFooter = subscribeFooterTexts(
    (items) => {
      footerTexts.value = items
    },
    () => {
      footerTexts.value = []
    }
  )
})

onBeforeUnmount(() => {
  unsubscribeFooter?.()
  unsubscribeFooter = null
})

function openAdminDialog() {
  adminAuth.syncFromStorage()
  if (adminAuth.authorized) {
    router.push('/admin')
    return
  }

  adminAuth.lastError = ''
  adminPassword.value = ''
  adminDialog.value = true
}

function cancelAdmin() {
  adminDialog.value = false
  adminPassword.value = ''
  adminAuth.lastError = ''
  showPassword.value = false
}

async function confirmAdmin() {
  if (!canConfirmAdmin.value || adminAuth.checking) return
  const ok = await adminAuth.checkPassword(adminPassword.value)
  if (!ok) return
  adminDialog.value = false
  adminPassword.value = ''
  showPassword.value = false
  router.push('/admin')
}
</script>

<template>
  <v-footer class="footer">
    <div class="container">
      <div class="grid">
        <div>
          <div class="row" style="margin-bottom:.5rem;">
            <div class="logo">CMG</div>
            <strong>Concept Mobilier Grădină</strong>
          </div>
          <p v-for="(line, idx) in footerLines" :key="idx" class="muted">{{ line }}</p>
        </div>

        <div>
          <div class="muted font-weight-bold">Social media</div>
          <div class="social-container">
            <a
              href="https://www.facebook.com/share/17cAYJ6NTe/?mibextid=wwXIfr"
              target="_blank"
              rel="noreferrer"
              aria-label="Facebook"
            >
              <img class="social-icon" width="30" height="30" src="../../assets/images/facebook.jpg" alt="Facebook" />
            </a>
            <a
              :href="whatsappHref"
              target="_blank"
              rel="noreferrer"
              aria-label="Whatsapp"
            >
              <img class="social-icon" width="30" height="30" src="../../assets/images/whatsapp.png" alt="Whatsapp" />
            </a>
            <!-- <a
              href="#"
              target="_blank"
              rel="noreferrer"
              aria-label="TikTok"
            >
              <img class="social-icon" width="30" height="30" src="../../assets/images/tiktok2.png" alt="TikTok" />
            </a> -->
          </div>
        </div>

        <div>
          <div class="muted font-weight-bold">Pagini</div>
          <div class="links">
            <RouterLink to="/">Acasă</RouterLink>
            <RouterLink to="/products">Produse</RouterLink>
            <!-- <RouterLink to="/news">Noutăți</RouterLink> -->
            <RouterLink to="/discounts">Reduceri</RouterLink>
            <RouterLink to="/contact">Contact</RouterLink>
            <template class="admin-link">
              <a href="#" class="mr-1" @click.prevent="openAdminDialog">Administrare</a><v-icon size="18">mdi-lock</v-icon>
            </template>
          </div>
        </div>

        <div class="anpc">
          <a
            href="https://reclamatiisal.anpc.ro/"
            target="_blank"
            rel="noreferrer"
            aria-label="Soluționarea Alternativă a Litigiilor"
          >
            <img class="anpc-icon" src="../../assets/images/anpc_1.png" alt="Soluționarea Alternativă a Litigiilor" />
          </a>
          <a
            href="https://consumer-redress.ec.europa.eu/site-relocation_en?event=main.home2.show&lng=RO"
            target="_blank"
            rel="noreferrer"
            aria-label="Soluționarea Online a Litigiilor"
          >
            <img class="anpc-icon" src="../../assets/images/anpc_2.png" alt="Soluționarea Online a Litigiilor" />
          </a>
        </div>
      </div>
      <div class="row sp-between">
        <div class="row muted">
          <small>© {{ new Date().getFullYear() }} - Concept Mobilier Grădină. Toate drepturile rezervate.</small>
        </div>
      </div>
      <small class="author muted">MC 😎</small>
    </div>

    <v-dialog v-model="adminDialog" max-width="420" persistent>
      <v-card class="card" elevation="2">
        <v-card-title>Administrare</v-card-title>
        <v-card-text class="stack">
          <p class="muted">Introdu parola pentru a continua.</p>
            <v-text-field
              v-model="adminPassword"
              :type="showPassword ? 'text' : 'password'"
              label="Parola"
              variant="outlined"
              density="compact"
              hide-details
              name="admin_login_pass"
              autocomplete="off"
              autocapitalize="off"
              spellcheck="false"
              :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
              @click:append-inner="showPassword = !showPassword"
              @keydown.enter.prevent="confirmAdmin"
            />
          <p v-if="adminAuth.lastError" class="error">{{ adminAuth.lastError }}</p>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" :disabled="adminAuth.checking" @click="cancelAdmin">Renunță</v-btn>
          <v-btn color="cyan" variant="flat" :loading="adminAuth.checking" :disabled="adminAuth.checking || !canConfirmAdmin" @click="confirmAdmin">Ok</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-footer>
</template>

<style scoped>
.footer {
  border-top: 1px solid rgba(255,255,255,.08);
  padding: 20px;
  z-index: auto;
}
.grid {
  display: grid;
  grid-template-columns: 2fr 1fr 1.2fr;
  gap: 1.5rem;
}
.logo {
  width: 50px;
  height: 30px;
  border-radius: 6px;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, var(--accent), var(--accent-2));
  color: #0b1220;
  font-weight: 500;
}
.admin-link {
  display: flex;
  align-items: center;
}
.admin-link * {
  color: #b88052;
}
.links {
  display: grid;
  gap: .4rem;
  margin-top: .5rem;
  justify-items: start;
}

.links :deep(a) {
  width: fit-content;
  justify-self: start;
}
.social-container {
  display: flex;
  gap: 1rem;
  margin-top: .5rem;
}
.social-container a,
.social-container a:hover {
  text-decoration: none;
}
.social-icon {
  border-radius: 50%;
  cursor: pointer;
}
.anpc {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
}
.anpc-icon {
  height: 40px;
  border-radius: 6px;
  cursor: pointer;
}
.newsletter {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: .5rem;
  margin-top: .5rem;
}
.newsletter input {
  background: rgba(255,255,255,.06);
  border: 1px solid rgba(255,255,255,.12);
  border-radius: 10px;
  padding: .6rem .8rem;
  color: var(--text);
}
.btn {
  background: linear-gradient(135deg, var(--accent), var(--accent-2));
  color: #0b1220;
  border: none;
  padding: .6rem .9rem;
  border-radius: 10px;
  font-weight: 700;
  cursor: pointer;
}
.field {
  width: 100%;
  background: rgba(255,255,255,.06);
  border: 1px solid rgba(255,255,255,.12);
  border-radius: 10px;
  padding: .7rem .8rem;
  color: var(--text);
}
.error {
  margin: 0;
  color: #fca5a5;
}
.btn:hover {
  filter: brightness(1.05);
}
.author {
  display: flex;
  margin-top: 30px;
}
@media (max-width: 920px) {
  .grid {
    grid-template-columns: 1fr;
  }
  .anpc-icon {
    height: 30px;
  }
}
</style>
