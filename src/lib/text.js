export function normalizeForSearch(value) {
  const s = String(value ?? '')
    .trim()
    .toLowerCase()

  // Some Romanian letters (ș/ț) do not reliably decompose in all environments.
  const mapped = s
    .replace(/[șş]/g, 's')
    .replace(/[țţ]/g, 't')

  return mapped
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}
