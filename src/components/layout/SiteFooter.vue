<script setup>
import { ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useAdminAuthStore } from '../../stores/adminAuth'

const router = useRouter()
const adminAuth = useAdminAuthStore()

const adminDialog = ref(false)
const adminPassword = ref('')
const showPassword = ref(false)

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

function confirmAdmin() {
  const ok = adminAuth.checkPassword(adminPassword.value)
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
          <p class="muted">Design modern sau rustic pentru spații exterioare.</p>
          <p class="muted">Calitate, confort și stil.</p>
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
              <a href="#" class="mr-1" @click.prevent="openAdminDialog">Administrare</a><v-icon size="18" color="cyan">mdi-lock</v-icon>
            </template>
          </div>
        </div>
      </div>
      <div class="row sp-between">
        <div class="row muted">
          <small>© {{ new Date().getFullYear() }} - Concept Mobilier Grădină. Toate drepturile rezervate.</small>
        </div>
      </div>
      <small class="author muted">MC 😎</small>
    </div>

    <v-dialog v-model="adminDialog" max-width="420">
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
              autocomplete="new-password"
              :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
              @click:append-inner="showPassword = !showPassword"
              @keydown.enter.prevent="confirmAdmin"
            />
          <p v-if="adminAuth.lastError" class="error">{{ adminAuth.lastError }}</p>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="cancelAdmin">Renunță</v-btn>
          <v-btn color="cyan" variant="flat" class="ok" @click="confirmAdmin">Ok</v-btn>
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
  border-radius: 8px;
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
.links {
  display: grid;
  gap: .4rem;
  margin-top: .5rem;
}
.admin-link {
  margin-bottom: 2rem;
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
.ok {
  color: #0b1220;
  font-weight: 800;
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
}
</style>
