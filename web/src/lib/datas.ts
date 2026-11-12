// O portal usa horário de Brasília (sem horário de verão desde 2019): -03:00 fixo.

/** "11/11/2026 17:01[:13]" ou "11/11/2026" -> ISO com offset, ou null. */
export function isoDoPortal(txt: string | null | undefined): string | null {
  const m = (txt || '').trim().match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?$/)
  if (!m) return null
  const [, d, mo, y, h = '00', mi = '00', s = '00'] = m
  return `${y}-${mo}-${d}T${h}:${mi}:${s}-03:00`
}

export function tsDoPortal(txt: string): number {
  const iso = isoDoPortal(txt)
  return iso ? new Date(iso).getTime() : 0
}

/** yyyy-mm-dd -> dd/mm/yyyy */
export function brDeIso(d: string): string {
  return d.split('-').reverse().join('/')
}
