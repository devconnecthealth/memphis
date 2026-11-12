export type Evento = { estacao: string; codigo: string; data: string; descricao: string }
export type Status = 'Em trânsito' | 'Entregue' | 'Sem checkpoints'

/** Regra simples (sem IA), sobre o texto ORIGINAL do portal. */
export function derivarStatus(eventos: Evento[]): Status {
  if (!eventos.length) return 'Sem checkpoints'
  const d = eventos[eventos.length - 1].descricao.toLowerCase()
  return d.includes('deliver') || d.includes('entreg') ? 'Entregue' : 'Em trânsito'
}

/** Dias desde o último checkpoint (ou desde a criação). null se entregue/sem data. */
export function diasSemMovimento(
  status: string,
  ultimoEm: string | null,
  criadoEm: string | null,
  agora = Date.now(),
): number | null {
  if (status === 'Entregue') return null
  const ref = ultimoEm || criadoEm
  if (!ref) return null
  return Math.max(Math.floor((agora - new Date(ref).getTime()) / 86400000), 0)
}
