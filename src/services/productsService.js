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

function normalizeTextLines(val) {
  if (!val) return []
  if (typeof val === 'string') {
    const s = val.trim()
    return s ? [s] : []
  }
  if (Array.isArray(val)) {
    return val.map((x) => String(x ?? '').trim()).filter(Boolean)
  }
  if (typeof val === 'object') {
    return Object.entries(val)
      .sort(([a], [b]) => String(a).localeCompare(String(b)))
      .map(([, x]) => String(x ?? '').trim())
      .filter(Boolean)
  }
  return []
}

function normalizeContactInfoList(val) {
  if (!val || typeof val !== 'object') return []
  const entries = Object.entries(val).sort(([a], [b]) => String(a).localeCompare(String(b)))
  const normalized = entries
    .map(([key, item], idx) => {
      if (!item || typeof item !== 'object') return null
      const label = String(item.label ?? item.title ?? item.name ?? '').trim()
      const texts = normalizeTextLines(item.texts ?? item.lines ?? item.items)
      const rawRank = Number(item.rank)
      const rank = Number.isFinite(rawRank) ? rawRank : idx
      if (!label) return null
      return { id: String(key), label, texts, rank }
    })
    .filter(Boolean)

  return normalized.sort((a, b) => {
    const ra = Number.isFinite(Number(a.rank)) ? Number(a.rank) : 0
    const rb = Number.isFinite(Number(b.rank)) ? Number(b.rank) : 0
    if (ra !== rb) return ra - rb
    return String(a.id).localeCompare(String(b.id))
  })
}

function normalizeMessages(val) {
  const isDeleted = (v) => v === true || v === 1 || String(v ?? '').toLowerCase() === 'true' || String(v ?? '') === '1'

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
      deleted: m.deleted,
    }))
    .filter((m) => !isDeleted(m.deleted))

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
  // Home page intro texts
  return listTextNode('introHome')
}

async function listTextNode(node) {
  if (!rtdb) {
    await sleep(40)
    return []
  }
  const cleanNode = String(node || '').trim()
  if (!cleanNode) return []
  const snap = await get(dbRef(rtdb, cleanNode))
  return normalizeStringList(snap.exists() ? snap.val() : null)
}

async function addTextNode(node, text) {
  if (!rtdb) throw new Error('Realtime Database nu este configurat.')
  const cleanNode = String(node || '').trim()
  const clean = String(text ?? '').trim()
  if (!cleanNode) throw new Error('Nod invalid.')
  if (!clean) throw new Error('Textul este obligatoriu.')

  const existingSnap = await get(dbRef(rtdb, cleanNode))
  const existing = normalizeStringList(existingSnap.exists() ? existingSnap.val() : null)
  const maxRank = existing.reduce((m, item) => {
    const r = Number(item?.rank)
    return Number.isFinite(r) ? Math.max(m, r) : m
  }, -1)
  const rank = maxRank + 1

  const nodeRef = push(dbRef(rtdb, cleanNode))
  const id = String(nodeRef.key || '')
  if (!id) throw new Error('Nu am putut genera ID pentru text.')
  await set(nodeRef, { text: clean, rank })
  return { id, text: clean, rank }
}

async function updateTextNode(node, id, text, rank) {
  if (!rtdb) throw new Error('Realtime Database nu este configurat.')
  const cleanNode = String(node || '').trim()
  const cleanId = String(id ?? '').trim()
  const cleanText = String(text ?? '').trim()
  if (!cleanNode) throw new Error('Nod invalid.')
  if (!cleanId) throw new Error('ID invalid.')
  if (!cleanText) throw new Error('Textul este obligatoriu.')

  let finalRank = Number(rank)
  if (!Number.isFinite(finalRank)) {
    const snap = await get(dbRef(rtdb, `${cleanNode}/${cleanId}`))
    const val = snap.exists() ? snap.val() : null
    const r = val && typeof val === 'object' ? Number(val.rank) : NaN
    finalRank = Number.isFinite(r) ? r : 0
  }

  await set(dbRef(rtdb, `${cleanNode}/${cleanId}`), { text: cleanText, rank: finalRank })
  return { id: cleanId, text: cleanText, rank: finalRank }
}

async function deleteTextNode(node, id) {
  if (!rtdb) throw new Error('Realtime Database nu este configurat.')
  const cleanNode = String(node || '').trim()
  const cleanId = String(id ?? '').trim()
  if (!cleanNode) throw new Error('Nod invalid.')
  if (!cleanId) throw new Error('ID invalid.')
  await remove(dbRef(rtdb, `${cleanNode}/${cleanId}`))
}

async function saveTextNodeRanks(node, items) {
  if (!rtdb) throw new Error('Realtime Database nu este configurat.')
  const cleanNode = String(node || '').trim()
  if (!cleanNode) throw new Error('Nod invalid.')
  if (!Array.isArray(items)) throw new Error('Lista de texte este invalidă.')

  const payload = {}
  for (let i = 0; i < items.length; i++) {
    const id = String(items[i]?.id ?? '').trim()
    const text = String(items[i]?.text ?? '').trim()
    if (!id || !text) continue
    payload[id] = { text, rank: i }
  }

  await update(dbRef(rtdb, cleanNode), payload)
}

// Intro texts for specific pages
export async function listIntroProductsTexts() {
  return listTextNode('introProducts')
}

export async function listIntroDiscountTexts() {
  return listTextNode('introDiscount')
}

export async function listIntroContactTexts() {
  return listTextNode('introContact')
}

export async function addIntroProductsText(text) {
  return addTextNode('introProducts', text)
}

export async function addIntroDiscountText(text) {
  return addTextNode('introDiscount', text)
}

export async function addIntroContactText(text) {
  return addTextNode('introContact', text)
}

export async function updateIntroProductsText(id, text, rank) {
  return updateTextNode('introProducts', id, text, rank)
}

export async function updateIntroDiscountText(id, text, rank) {
  return updateTextNode('introDiscount', id, text, rank)
}

export async function updateIntroContactText(id, text, rank) {
  return updateTextNode('introContact', id, text, rank)
}

export async function deleteIntroProductsText(id) {
  return deleteTextNode('introProducts', id)
}

export async function deleteIntroDiscountText(id) {
  return deleteTextNode('introDiscount', id)
}

export async function deleteIntroContactText(id) {
  return deleteTextNode('introContact', id)
}

export async function saveIntroProductsRanks(items) {
  return saveTextNodeRanks('introProducts', items)
}

export async function saveIntroDiscountRanks(items) {
  return saveTextNodeRanks('introDiscount', items)
}

export async function saveIntroContactRanks(items) {
  return saveTextNodeRanks('introContact', items)
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
  await update(dbRef(rtdb, `messages/${cleanId}`), { deleted: true })
}

export async function addIntroText(text) {
  return addTextNode('introHome', text)
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
  return updateTextNode('introHome', id, text, rank)
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
  return deleteTextNode('introHome', id)
}

export async function deleteFooterText(id) {
  if (!rtdb) throw new Error('Realtime Database nu este configurat.')
  const cleanId = String(id ?? '').trim()
  if (!cleanId) throw new Error('ID invalid.')
  await remove(dbRef(rtdb, `footer/${cleanId}`))
}

export async function saveIntroRanks(items) {
  return saveTextNodeRanks('introHome', items)
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

// Contact info sections (Contact page right-side card)
export async function listContactInfo() {
  if (!rtdb) {
    await sleep(40)
    return []
  }
  const snap = await get(dbRef(rtdb, 'contactInfo'))
  return normalizeContactInfoList(snap.exists() ? snap.val() : null)
}

export async function addContactInfoItem(label, texts) {
  if (!rtdb) throw new Error('Realtime Database nu este configurat.')
  const cleanLabel = String(label ?? '').trim()
  const cleanTexts = Array.isArray(texts)
    ? texts.map((t) => String(t ?? '').trim()).filter(Boolean)
    : normalizeTextLines(texts)

  if (!cleanLabel) throw new Error('Eticheta este obligatorie.')
  if (cleanTexts.length === 0) throw new Error('Adaugă cel puțin o linie de text.')

  const existingSnap = await get(dbRef(rtdb, 'contactInfo'))
  const existing = normalizeContactInfoList(existingSnap.exists() ? existingSnap.val() : null)
  const maxRank = existing.reduce((m, item) => {
    const r = Number(item?.rank)
    return Number.isFinite(r) ? Math.max(m, r) : m
  }, -1)
  const rank = maxRank + 1

  const nodeRef = push(dbRef(rtdb, 'contactInfo'))
  const id = String(nodeRef.key || '')
  if (!id) throw new Error('Nu am putut genera ID pentru secțiunea Contact.')

  await set(nodeRef, { label: cleanLabel, texts: cleanTexts, rank })
  return { id, label: cleanLabel, texts: cleanTexts, rank }
}

export async function updateContactInfoItem(id, label, texts, rank) {
  if (!rtdb) throw new Error('Realtime Database nu este configurat.')
  const cleanId = String(id ?? '').trim()
  const cleanLabel = String(label ?? '').trim()
  const cleanTexts = Array.isArray(texts)
    ? texts.map((t) => String(t ?? '').trim()).filter(Boolean)
    : normalizeTextLines(texts)

  if (!cleanId) throw new Error('ID invalid.')
  if (!cleanLabel) throw new Error('Eticheta este obligatorie.')
  if (cleanTexts.length === 0) throw new Error('Adaugă cel puțin o linie de text.')

  let finalRank = Number(rank)
  if (!Number.isFinite(finalRank)) {
    const snap = await get(dbRef(rtdb, `contactInfo/${cleanId}`))
    const val = snap.exists() ? snap.val() : null
    const r = val && typeof val === 'object' ? Number(val.rank) : NaN
    finalRank = Number.isFinite(r) ? r : 0
  }

  await set(dbRef(rtdb, `contactInfo/${cleanId}`), { label: cleanLabel, texts: cleanTexts, rank: finalRank })
  return { id: cleanId, label: cleanLabel, texts: cleanTexts, rank: finalRank }
}

export async function deleteContactInfoItem(id) {
  if (!rtdb) throw new Error('Realtime Database nu este configurat.')
  const cleanId = String(id ?? '').trim()
  if (!cleanId) throw new Error('ID invalid.')
  await remove(dbRef(rtdb, `contactInfo/${cleanId}`))
}

export async function saveContactInfoRanks(items) {
  if (!rtdb) throw new Error('Realtime Database nu este configurat.')
  if (!Array.isArray(items)) throw new Error('Lista este invalidă.')

  const payload = {}
  for (let i = 0; i < items.length; i++) {
    const id = String(items[i]?.id ?? '').trim()
    const label = String(items[i]?.label ?? '').trim()
    const texts = Array.isArray(items[i]?.texts)
      ? items[i].texts.map((t) => String(t ?? '').trim()).filter(Boolean)
      : normalizeTextLines(items[i]?.texts)

    if (!id || !label || texts.length === 0) continue
    payload[id] = { label, texts, rank: i }
  }

  await update(dbRef(rtdb, 'contactInfo'), payload)
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
