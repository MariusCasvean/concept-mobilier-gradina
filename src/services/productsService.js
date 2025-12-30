// Products service
// Reads from Firebase Realtime Database (RTDB) nodes: `categories` and `products`.
// Falls back to local mocks if RTDB isn't available.

import { rtdb } from '../lib/firebase'
import { get, ref as dbRef, query, orderByChild, equalTo, push, set, remove, update, onValue } from 'firebase/database'
import { mockProducts } from '../mocks/products'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function normalizeList(val) {
  if (!val) return []

  if (Array.isArray(val)) {
    return val
      .map((item, idx) => (item ? { ...item, id: String(idx), key: String(idx) } : null))
      .filter(Boolean)
  }

  if (typeof val === 'object') {
    return Object.entries(val)
      .map(([key, item]) => {
        if (!item || typeof item !== 'object') return null
        return { ...item, id: String(key), key: String(key) }
      })
      .filter(Boolean)
  }

  return []
}

function slugify(input) {
  return String(input || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
}

function normalizeStringList(val) {
  if (!val) return []
  if (Array.isArray(val)) {
    return val
      .map((item, idx) => ({ id: String(idx), text: String(item ?? ''), rank: idx }))
      .filter((x) => String(x.text).trim())
  }
  if (typeof val === 'object') {
    const entries = Object.entries(val).sort(([a], [b]) => String(a).localeCompare(String(b)))
    const normalized = entries
      .map(([key, item], idx) => {
        if (typeof item === 'string') return { id: String(key), text: item, rank: idx }
        if (item && typeof item === 'object' && typeof item.text === 'string') {
          const rawRank = Number(item.rank)
          const rank = Number.isFinite(rawRank) ? rawRank : idx
          return { id: String(key), text: item.text, rank }
        }
        return null
      })
      .filter(Boolean)
      .filter((x) => String(x.text).trim())

    return normalized.sort((a, b) => {
      const ra = Number.isFinite(Number(a.rank)) ? Number(a.rank) : 0
      const rb = Number.isFinite(Number(b.rank)) ? Number(b.rank) : 0
      if (ra !== rb) return ra - rb
      return String(a.id).localeCompare(String(b.id))
    })
  }
  return []
}

function normalizeMessages(val) {
  const items = normalizeList(val)
    .map((m) => ({
      ...m,
      id: String(m.id),
      subject: typeof m.subject === 'string' ? m.subject : (typeof m.title === 'string' ? m.title : ''),
      name: typeof m.name === 'string' ? m.name : '',
      message: typeof m.message === 'string' ? m.message : (typeof m.text === 'string' ? m.text : ''),
      phone: typeof m.phone === 'string' ? m.phone : '',
      email: typeof m.email === 'string' ? m.email : '',
      createdAt: m.createdAt,
    }))

  return items.sort((a, b) => {
    const ta = Number(a?.createdAt)
    const tb = Number(b?.createdAt)
    const fa = Number.isFinite(ta) ? ta : -Infinity
    const fb = Number.isFinite(tb) ? tb : -Infinity
    if (fa !== fb) return fb - fa
    return String(b.id).localeCompare(String(a.id))
  })
}

export async function listIntroTexts() {
  if (!rtdb) {
    await sleep(40)
    return []
  }

  const snap = await get(dbRef(rtdb, 'intro'))
  return normalizeStringList(snap.exists() ? snap.val() : null)
}

export async function listFooterTexts() {
  if (!rtdb) {
    await sleep(40)
    return []
  }

  const snap = await get(dbRef(rtdb, 'footer'))
  return normalizeStringList(snap.exists() ? snap.val() : null)
}

export function subscribeFooterTexts(onItems, onError) {
  const emit = typeof onItems === 'function' ? onItems : () => {}
  const emitError = typeof onError === 'function' ? onError : () => {}

  if (!rtdb) {
    emit([])
    return () => {}
  }

  const unsub = onValue(
    dbRef(rtdb, 'footer'),
    (snap) => {
      emit(normalizeStringList(snap.exists() ? snap.val() : null))
    },
    (err) => {
      emitError(err)
    }
  )

  return typeof unsub === 'function' ? unsub : () => {}
}

export async function listMessages() {
  if (!rtdb) {
    await sleep(40)
    return []
  }

  const snap = await get(dbRef(rtdb, 'messages'))
  return normalizeMessages(snap.exists() ? snap.val() : null)
}

export function subscribeMessages(onItems, onError) {
  const emit = typeof onItems === 'function' ? onItems : () => {}
  const emitError = typeof onError === 'function' ? onError : () => {}

  if (!rtdb) {
    emit([])
    return () => {}
  }

  const unsub = onValue(
    dbRef(rtdb, 'messages'),
    (snap) => {
      emit(normalizeMessages(snap.exists() ? snap.val() : null))
    },
    (err) => {
      emitError(err)
    }
  )

  return typeof unsub === 'function' ? unsub : () => {}
}

export async function deleteMessage(id) {
  if (!rtdb) throw new Error('Realtime Database nu este configurat.')
  const cleanId = String(id ?? '').trim()
  if (!cleanId) throw new Error('ID invalid.')
  await remove(dbRef(rtdb, `messages/${cleanId}`))
}

export async function addIntroText(text) {
  if (!rtdb) throw new Error('Realtime Database nu este configurat.')
  const clean = String(text ?? '').trim()
  if (!clean) throw new Error('Textul este obligatoriu.')

  const existingSnap = await get(dbRef(rtdb, 'intro'))
  const existing = normalizeStringList(existingSnap.exists() ? existingSnap.val() : null)
  const maxRank = existing.reduce((m, item) => {
    const r = Number(item?.rank)
    return Number.isFinite(r) ? Math.max(m, r) : m
  }, -1)
  const rank = maxRank + 1

  const nodeRef = push(dbRef(rtdb, 'intro'))
  const id = String(nodeRef.key || '')
  if (!id) throw new Error('Nu am putut genera ID pentru text.')

  await set(nodeRef, { text: clean, rank })
  return { id, text: clean, rank }
}

export async function addFooterText(text) {
  if (!rtdb) throw new Error('Realtime Database nu este configurat.')
  const clean = String(text ?? '').trim()
  if (!clean) throw new Error('Textul este obligatoriu.')

  const existingSnap = await get(dbRef(rtdb, 'footer'))
  const existing = normalizeStringList(existingSnap.exists() ? existingSnap.val() : null)
  const maxRank = existing.reduce((m, item) => {
    const r = Number(item?.rank)
    return Number.isFinite(r) ? Math.max(m, r) : m
  }, -1)
  const rank = maxRank + 1

  const nodeRef = push(dbRef(rtdb, 'footer'))
  const id = String(nodeRef.key || '')
  if (!id) throw new Error('Nu am putut genera ID pentru text.')

  await set(nodeRef, { text: clean, rank })
  return { id, text: clean, rank }
}

export async function updateIntroText(id, text, rank) {
  if (!rtdb) throw new Error('Realtime Database nu este configurat.')
  const cleanId = String(id ?? '').trim()
  const cleanText = String(text ?? '').trim()
  if (!cleanId) throw new Error('ID invalid.')
  if (!cleanText) throw new Error('Textul este obligatoriu.')

  let finalRank = Number(rank)
  if (!Number.isFinite(finalRank)) {
    const snap = await get(dbRef(rtdb, `intro/${cleanId}`))
    const val = snap.exists() ? snap.val() : null
    const r = val && typeof val === 'object' ? Number(val.rank) : NaN
    finalRank = Number.isFinite(r) ? r : 0
  }

  await set(dbRef(rtdb, `intro/${cleanId}`), { text: cleanText, rank: finalRank })
  return { id: cleanId, text: cleanText, rank: finalRank }
}

export async function updateFooterText(id, text, rank) {
  if (!rtdb) throw new Error('Realtime Database nu este configurat.')
  const cleanId = String(id ?? '').trim()
  const cleanText = String(text ?? '').trim()
  if (!cleanId) throw new Error('ID invalid.')
  if (!cleanText) throw new Error('Textul este obligatoriu.')

  let finalRank = Number(rank)
  if (!Number.isFinite(finalRank)) {
    const snap = await get(dbRef(rtdb, `footer/${cleanId}`))
    const val = snap.exists() ? snap.val() : null
    const r = val && typeof val === 'object' ? Number(val.rank) : NaN
    finalRank = Number.isFinite(r) ? r : 0
  }

  await set(dbRef(rtdb, `footer/${cleanId}`), { text: cleanText, rank: finalRank })
  return { id: cleanId, text: cleanText, rank: finalRank }
}

export async function deleteIntroText(id) {
  if (!rtdb) throw new Error('Realtime Database nu este configurat.')
  const cleanId = String(id ?? '').trim()
  if (!cleanId) throw new Error('ID invalid.')
  await remove(dbRef(rtdb, `intro/${cleanId}`))
}

export async function deleteFooterText(id) {
  if (!rtdb) throw new Error('Realtime Database nu este configurat.')
  const cleanId = String(id ?? '').trim()
  if (!cleanId) throw new Error('ID invalid.')
  await remove(dbRef(rtdb, `footer/${cleanId}`))
}

export async function saveIntroRanks(items) {
  if (!rtdb) throw new Error('Realtime Database nu este configurat.')
  if (!Array.isArray(items)) throw new Error('Lista de texte este invalidă.')

  const payload = {}
  for (let i = 0; i < items.length; i++) {
    const id = String(items[i]?.id ?? '').trim()
    const text = String(items[i]?.text ?? '').trim()
    if (!id || !text) continue
    payload[id] = { text, rank: i }
  }

  await update(dbRef(rtdb, 'intro'), payload)
}

export async function saveFooterRanks(items) {
  if (!rtdb) throw new Error('Realtime Database nu este configurat.')
  if (!Array.isArray(items)) throw new Error('Lista de texte este invalidă.')

  const payload = {}
  for (let i = 0; i < items.length; i++) {
    const id = String(items[i]?.id ?? '').trim()
    const text = String(items[i]?.text ?? '').trim()
    if (!id || !text) continue
    payload[id] = { text, rank: i }
  }

  await update(dbRef(rtdb, 'footer'), payload)
}

export async function listCategories() {
  if (!rtdb) {
    await sleep(80)
    // Best-effort fallback from mock products.
    const map = new Map()
    for (const p of mockProducts) {
      const title = p.categoryName || p.categorySlug
      const id = p.categoryId || p.categorySlug
      if (!id || !title) continue
      if (!map.has(String(id))) map.set(String(id), { id: String(id), title, slug: slugify(title) })
    }
    return [...map.values()].sort((a, b) => String(a.title).localeCompare(String(b.title), 'ro'))
  }

  const snap = await get(dbRef(rtdb, 'categories'))
  const categories = normalizeList(snap.exists() ? snap.val() : null)
    .map((c) => {
      const title = c.title || c.name || c.label || ''
      return {
        ...c,
        id: String(c.id),
        title,
        slug: c.slug || slugify(title),
      }
    })
    .filter((c) => c.id && c.title)

  return categories.sort((a, b) => String(a.title).localeCompare(String(b.title), 'ro'))
}

export async function listProducts() {
  if (!rtdb) {
    await sleep(120)
    return mockProducts
  }

  const snap = await get(dbRef(rtdb, 'products'))
  return normalizeList(snap.exists() ? snap.val() : null).map((p) => ({ ...p, id: String(p.id) }))
}

export async function listDiscountProducts() {
  if (!rtdb) {
    await sleep(80)
    return []
  }

  // Prefer indexed query when RTDB rules include:
  // "products": { ".indexOn": ["showProductDiscount"] }
  // but fall back to full scan if index isn't set yet (or if legacy data stores "true" as string).
  try {
    const q = query(dbRef(rtdb, 'products'), orderByChild('showProductDiscount'), equalTo(true))
    const snap = await get(q)
    const items = normalizeList(snap.exists() ? snap.val() : null).map((p) => ({ ...p, id: String(p.id) }))
    if (items.length) return items
  } catch {
    // ignore and use fallback below
  }

  const allSnap = await get(dbRef(rtdb, 'products'))
  const all = normalizeList(allSnap.exists() ? allSnap.val() : null).map((p) => ({ ...p, id: String(p.id) }))
  return all.filter((p) => p?.showProductDiscount === true || String(p?.showProductDiscount) === 'true')
}

export async function getCategoryBySlug(categorySlug) {
  if (!categorySlug) return null
  const categories = await listCategories()
  return categories.find((c) => c.slug === categorySlug) || null
}

export async function listProductsByCategory(categorySlug) {
  if (!categorySlug) return []

  const [category, products] = await Promise.all([
    getCategoryBySlug(categorySlug),
    listProducts(),
  ])

  if (!category) return []

  const categoryId = String(category.id)
  return products.filter((p) => String(p.categoryId ?? '') === categoryId)
}

// Kept for later; not used right now (Details button does nothing).
export async function getProductBySlugs(categorySlug, productSlug) {
  if (!categorySlug || !productSlug) return null
  const products = await listProductsByCategory(categorySlug)
  return products.find((p) => String(p.slug) === String(productSlug)) || null
}
