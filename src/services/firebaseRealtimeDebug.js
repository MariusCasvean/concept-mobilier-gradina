import { rtdb } from '../lib/firebase'
import { get, ref as dbRef } from 'firebase/database'

export async function logRealtimeData() {
  if (!rtdb) {
    console.warn('[rtdb] Firebase RTDB is not initialized.')
    return
  }

  try {
    const [productsSnap, categoriesSnap] = await Promise.all([
      get(dbRef(rtdb, 'products')),
      get(dbRef(rtdb, 'categories')),
    ])

    const products = productsSnap.exists() ? productsSnap.val() : null
    const categories = categoriesSnap.exists() ? categoriesSnap.val() : null

    console.log('[rtdb] products:', products)
    console.log('[rtdb] categories:', categories)
  } catch (e) {
    console.error('[rtdb] Failed to fetch data:', e)
  }
}
