export const WHATSAPP_PHONE_E164 = '40759323577'

export function buildWhatsAppLink({ phoneE164 = WHATSAPP_PHONE_E164, text = '' } = {}) {
  const phone = String(phoneE164 ?? '').replace(/\D/g, '')
  const base = `https://wa.me/${phone}`
  const trimmed = String(text ?? '').trim()
  if (!trimmed) return base
  return `${base}?text=${encodeURIComponent(trimmed)}`
}

export function openWhatsApp({ phoneE164 = WHATSAPP_PHONE_E164, text = '' } = {}) {
  const url = buildWhatsAppLink({ phoneE164, text })

  if (typeof window !== 'undefined' && window?.open) {
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return url
}
