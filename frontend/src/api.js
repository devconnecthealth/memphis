import { token, supabase } from './supabase.js'
import router from './router.js'

async function req(url, opts = {}) {
  const t = await token()
  const r = await fetch(url, { ...opts, headers: { ...(opts.headers || {}), Authorization: `Bearer ${t}` } })
  if (r.status === 401) {
    await supabase.auth.signOut()
    router.replace('/login')
  }
  if (!r.ok) {
    const msg = {
      401: 'Sessão expirada. Entre novamente.',
      403: 'Seu usuário não tem permissão.',
      409: 'Coleta já em andamento.',
      422: 'Período inválido.',
    }[r.status]
    const e = new Error(msg || `Erro ${r.status}`)
    e.status = r.status
    throw e
  }
  return r.json()
}
export const getHawbs = () => req('/api/hawbs')
export const getHawb = (id) => req(`/api/hawbs/${encodeURIComponent(id)}`)
export const getStatus = () => req('/api/status')
export const atualizar = (inicio, fim) =>
  req('/api/atualizar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ inicio, fim }),
  })
