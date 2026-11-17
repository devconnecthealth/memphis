import { isoDoPortal } from '../../../../lib/datas'
import { Portal } from '../../../../lib/portal'
import { baseDaConta, contaValida, credenciaisPortal, erroResposta, exigirLogin, HttpError, supabaseAdmin } from '../../../../lib/server'

export const runtime = 'nodejs'
export const maxDuration = 60

const DATA = /^\d{4}-\d{2}-\d{2}$/

/** Passo 1: faz login no portal, lista os HAWBs do período e grava (nome, criado em).
 *  Devolve a fila de HAWBs que ainda precisam de checkpoints (entregues já gravados ficam de fora). */
export async function POST(req: Request) {
  try {
    await exigirLogin(req)
    const { inicio, fim, conta: contaBody } = await req.json().catch(() => ({}))
    const conta = contaValida(contaBody)
    if (!DATA.test(inicio) || !DATA.test(fim) || fim < inicio || (Date.parse(fim) - Date.parse(inicio)) / 86400000 > 366)
      throw new HttpError(422, 'Período inválido (fim antes do início ou maior que 1 ano).')

    const { user, pass } = credenciaisPortal(conta)
    const portal = new Portal(baseDaConta(conta))
    await portal.login(user, pass)
    const itens = await portal.listar(inicio, fim)

    const db = supabaseAdmin()
    // Um HAWB pode aparecer em mais de uma conta: junta a conta atual às já gravadas.
    const existentes = new Map<string, string[]>()
    for (let k = 0; k < itens.length; k += 200) {
      const { data } = await db.from('memphis').select('hawb,contas').in('hawb', itens.slice(k, k + 200).map((i) => i.hawb))
      for (const r of data || []) existentes.set(r.hawb, r.contas || [])
    }
    const linhas = itens.map((i) => ({
      hawb: i.hawb,
      destinatario: i.destinatario || null,
      criado_em: isoDoPortal(i.criado),
      conta,
      contas: [...new Set([...(existentes.get(i.hawb) || []), conta])],
    }))
    for (let k = 0; k < linhas.length; k += 500) {
      const { error } = await db.from('memphis').upsert(linhas.slice(k, k + 500), { onConflict: 'hawb' })
      if (error) throw new Error('falha ao gravar lista')
    }

    const ja = new Set<string>()
    if (itens.length) {
      const { data } = await db.from('memphis').select('hawb').in('hawb', itens.map((i) => i.hawb)).eq('status', 'Entregue')
      for (const r of data || []) ja.add(r.hawb)
    }
    const fila = itens.filter((i) => !ja.has(i.hawb)).map((i) => ({ hawb: i.hawb, url: i.url }))
    console.log(`coleta: ${itens.length} HAWBs no período, ${fila.length} na fila`)
    return Response.json({ total: itens.length, fila })
  } catch (e) {
    return erroResposta(e)
  }
}
