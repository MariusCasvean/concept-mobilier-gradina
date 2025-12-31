import { rtdb } from '../lib/firebase'
import { get, ref as dbRef, set } from 'firebase/database'

export const ADMIN_NODE = 'admin'
export const ADMIN_PASSWORD_FIELD = 'pass'
export const LEGACY_ADMIN_PASSWORD_NODE = 'adminPassword'

function normalizePassword(value) {
  return String(value ?? '').trim()
}

/**
 * Reads the admin password from RTDB node `admin/pass`.
 * Backward compatible: if legacy node `adminPassword` exists, it migrates it to `admin/pass`.
 * If missing/invalid, it returns an empty string.
 */
export async function getAdminPassword() {
  if (!rtdb) throw new Error('Realtime Database nu este configurat.')

  // Preferred location: admin/pass
  const preferredSnap = await get(dbRef(rtdb, `${ADMIN_NODE}/${ADMIN_PASSWORD_FIELD}`))
  const preferredRaw = preferredSnap.val()
  const preferred = typeof preferredRaw === 'string' ? normalizePassword(preferredRaw) : ''
  if (preferred) return preferred

  // Legacy fallback: adminPassword
  const legacySnap = await get(dbRef(rtdb, LEGACY_ADMIN_PASSWORD_NODE))
  const legacyRaw = legacySnap.val()
  const legacy = typeof legacyRaw === 'string' ? normalizePassword(legacyRaw) : ''

  // If legacy exists, migrate it.
  if (legacy) {
    await set(dbRef(rtdb, `${ADMIN_NODE}/${ADMIN_PASSWORD_FIELD}`), legacy)
    return legacy
  }

  return ''
}

export async function setAdminPassword(newPassword) {
  const password = normalizePassword(newPassword)
  if (!password) throw new Error('Parola este obligatorie.')

  if (!rtdb) {
    // Keep behavior predictable even in mock mode.
    throw new Error('Realtime Database nu este configurat.')
  }

  await set(dbRef(rtdb, `${ADMIN_NODE}/${ADMIN_PASSWORD_FIELD}`), password)
  return password
}
