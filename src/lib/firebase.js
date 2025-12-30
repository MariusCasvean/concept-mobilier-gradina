// Firebase bootstrap (safe to import even without env vars)
// If required env vars are missing, we fall back to a local config.

import { initializeApp } from 'firebase/app'
import { getAnalytics } from 'firebase/analytics'
import { getFirestore } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'
import { getStorage } from 'firebase/storage'
import { getDatabase } from 'firebase/database'

function hasFirebaseEnv() {
  return Boolean(
    import.meta.env.VITE_FIREBASE_API_KEY &&
      import.meta.env.VITE_FIREBASE_PROJECT_ID &&
      import.meta.env.VITE_FIREBASE_APP_ID
  )
}

let app = null
let db = null
let auth = null
let storage = null
let rtdb = null
let analytics = null

try {
  const firebaseConfig = hasFirebaseEnv()
    ? {
        apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
        authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
        databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
        storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
        appId: import.meta.env.VITE_FIREBASE_APP_ID,
        measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
      }
    : {
        apiKey: 'AIzaSyAvhnbePlO8nzEyVWH3PBAY4c0g20KiygE',
        authDomain: 'concept-mobila-gradina.firebaseapp.com',
        databaseURL: 'https://concept-mobila-gradina-default-rtdb.europe-west1.firebasedatabase.app',
        projectId: 'concept-mobila-gradina',
        // NOTE: This must be the exact bucket shown in Firebase Storage.
        // Newer Firebase projects commonly use "<project-id>.firebasestorage.app".
        storageBucket: 'concept-mobila-gradina.firebasestorage.app',
        messagingSenderId: '215351369846',
        appId: '1:215351369846:web:e9454538bd3a5d7326bf57',
        measurementId: 'G-TPNPMB6P9C',
      }

  app = initializeApp(firebaseConfig)
  db = getFirestore(app)
  auth = getAuth(app)
  // Explicitly bind to the configured bucket.
  storage = getStorage(app, `gs://${firebaseConfig.storageBucket}`)
  rtdb = getDatabase(app)

  try {
    analytics = getAnalytics(app)
  } catch (e) {
    analytics = null
  }
} catch (e) {
  // eslint-disable-next-line no-console
  console.warn('[firebase] Initialization skipped or failed. Using mocks. Reason:', e?.message || e)
  app = null
  db = null
  auth = null
  storage = null
  rtdb = null
  analytics = null
}

export { app, db, auth, storage, rtdb, analytics }
export const isFirebaseConfigured = () => Boolean(app)
