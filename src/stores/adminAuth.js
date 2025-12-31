import { defineStore } from 'pinia'

import { getAdminPassword } from '../services/adminPasswordService'

const ADMIN_SESSION_KEY = 'cmg_admin_session_v1'
const ADMIN_SESSION_TTL_MS = 24 * 60 * 60 * 1000

function readSession() {
  try {
    if (typeof localStorage === 'undefined') return { ok: false }
    const raw = localStorage.getItem(ADMIN_SESSION_KEY)
    if (!raw) return { ok: false }

    const parsed = JSON.parse(raw)
    const expiresAt = Number(parsed?.expiresAt)
    if (!expiresAt || Number.isNaN(expiresAt)) {
      localStorage.removeItem(ADMIN_SESSION_KEY)
      return { ok: false }
    }

    if (Date.now() > expiresAt) {
      localStorage.removeItem(ADMIN_SESSION_KEY)
      return { ok: false, expired: true }
    }

    return { ok: true, expiresAt }
  } catch {
    try {
      localStorage.removeItem(ADMIN_SESSION_KEY)
    } catch {
      // ignore
    }
    return { ok: false }
  }
}

function writeSession(expiresAt) {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify({ expiresAt }))
}

function clearSession() {
  try {
    if (typeof localStorage === 'undefined') return
    localStorage.removeItem(ADMIN_SESSION_KEY)
  } catch {
    // ignore
  }
}

export const useAdminAuthStore = defineStore('adminAuth', {
  state: () => ({
    authorized: readSession().ok,
    lastError: '',
    checking: false,
  }),
  actions: {
    async checkPassword(password) {
      if (this.checking) return false
      this.checking = true
      this.lastError = ''

      try {
        const expected = await getAdminPassword()
        if (!String(expected || '').trim()) {
          this.authorized = false
          this.lastError = 'Parola admin nu este setată încă.'
          clearSession()
          return false
        }

        const ok = String(password || '') === String(expected || '')
        this.authorized = ok
        this.lastError = ok ? '' : 'Parola nu este corectă.'

        if (ok) writeSession(Date.now() + ADMIN_SESSION_TTL_MS)
        else clearSession()
        return ok
      } catch (e) {
        this.authorized = false
        this.lastError = e?.message || 'A apărut o eroare la verificarea parolei.'
        clearSession()
        return false
      } finally {
        this.checking = false
      }
    },
    logout() {
      this.authorized = false
      this.lastError = ''
      this.checking = false
      clearSession()
    },
    syncFromStorage() {
      this.authorized = readSession().ok
      if (!this.authorized) this.lastError = ''
    },
  },
})

export function isAdminAuthorized() {
  return readSession().ok
}
