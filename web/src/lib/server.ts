import { createClient } from '@supabase/supabase-js'
import { BASE } from './parse'

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

export const CONTAS = [
  { id: 'AnaRubia', rotulo: 'Ana Rubia', userEnv: 'MEMPHIS_USER', passEnv: 'MEMPHIS_PASS' },
  { id: 'MVD', rotulo: 'Uruguai', userEnv: 'MEMPHIS_USER_MVD', passEnv: 'MEMPHIS_PASS_MVD' },
  { id: 'DXB', rotulo: 'Dubai', userEnv: 'MEMPHIS_USER_DXB', passEnv: 'MEMPHIS_PASS_DXB' },
  { id: 'AMD', rotulo: 'Índia', userEnv: 'MEMPHIS_USER_AMD', passEnv: 'MEMPHIS_PASS_AMD' },
  { id: 'SHA', rotulo: 'China', userEnv: 'MEMPHIS_USER_SHA', passEnv: 'MEMPHIS_PASS_SHA' },
  { id: 'CBR', rotulo: 'Currier Brasil', userEnv: 'CBTI_USER', passEnv: 'CBTI_PASS', base: 'https://cbti.licons.pe', userPadrao: 'adm@connecthealth.com.br', passPadrao: '102030' },
] as const

export function contaValida(id: unknown): string {
  if (id === undefined || id === null) return 'AnaRubia'
  const c = CONTAS.find((x) => x.id === id)
  if (!c) throw new HttpError(422, 'Conta inválida.')
  return c.id
}

/** Endereço do portal da conta (Memphis por padrão). */
export function baseDaConta(contaId: string): string {
  const c = CONTAS.find((x) => x.id === contaId) as { base?: string } | undefined
  return c?.base || BASE
}

/** A conta tem usuário e senha (variável de ambiente ou padrão)? Contas sem login são ignoradas na coleta. */
export function contaConfigurada(contaId: string): boolean {
  const c = CONTAS.find((x) => x.id === contaId) as { userEnv: string; passEnv: string; userPadrao?: string; passPadrao?: string } | undefined
  if (!c) return false
  return !!((process.env[c.userEnv] || c.userPadrao) && (process.env[c.passEnv] || c.passPadrao))
}

export function credenciaisPortal(contaId: string = 'AnaRubia') {
  const c = CONTAS.find((x) => x.id === contaId)
  if (!c) throw new HttpError(422, 'Conta inválida.')
  // Variável de ambiente tem prioridade; sem ela, usa o login padrão gravado na conta (quando houver).
  const padrao = c as { userPadrao?: string; passPadrao?: string }
  return {
    user: process.env[c.userEnv] || padrao.userPadrao || env(c.userEnv),
    pass: process.env[c.passEnv] || padrao.passPadrao || env(c.passEnv),
  }
}
