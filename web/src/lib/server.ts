import { createClient } from '@supabase/supabase-js'

export class HttpError extends Error {
  constructor(public status: number, msg: string) { super(msg) }
}

function env(nome: string): string {
  const v = process.env[nome]
  if (!v) throw new HttpError(500, 'Servidor não configurado.')
  return v
}

/** Cliente com service_role: só no servidor, ignora o RLS. */
export function supabaseAdmin() {
  return createClient(env('NEXT_PUBLIC_SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false },
  })
}

/** Valida o token do Supabase enviado pelo navegador; opcionalmente limita por e-mail. */
export async function exigirLogin(req: Request): Promise<string> {
  const token = (req.headers.get('authorization') || '').replace(/^bearer\s+/i, '')
  if (!token) throw new HttpError(401, 'Faça login.')
  const anon = createClient(env('NEXT_PUBLIC_SUPABASE_URL'), env('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'), {
    auth: { persistSession: false },
  })
  const { data, error } = await anon.auth.getUser(token)
  if (error || !data.user) throw new HttpError(401, 'Sessão inválida ou expirada.')
  const email = (data.user.email || '').toLowerCase()
  const permitidos = (process.env.ALLOWED_EMAILS || '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean)
  if (permitidos.length && !permitidos.includes(email)) throw new HttpError(403, 'Usuário sem permissão.')
  return email
}

/** Padroniza respostas de erro. Nunca devolve nem loga texto do portal ou dados de pacientes. */
export function erroResposta(e: unknown): Response {
  if (e instanceof HttpError) return Response.json({ erro: e.message }, { status: e.status })
  console.error('erro na coleta:', e instanceof Error ? e.name : 'desconhecido')
  return Response.json({ erro: 'Falha ao consultar o portal Memphis (verifique credenciais e conexão).' }, { status: 502 })
}

export function credenciaisPortal() {
  return { user: env('MEMPHIS_USER'), pass: env('MEMPHIS_PASS') }
}
