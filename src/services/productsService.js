// Products service
// Reads from Firebase Realtime Database (RTDB) nodes: `categories` and `products`.
// Falls back to local mocks if RTDB isn't available.

import { rtdb } from '../lib/firebase'
import { get, ref as dbRef } from 'firebase/database'
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
