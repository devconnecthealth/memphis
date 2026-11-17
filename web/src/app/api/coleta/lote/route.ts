import { isoDoPortal } from '../../../../lib/datas'
import { Portal } from '../../../../lib/portal'
import { derivarStatus } from '../../../../lib/status'
import { traduzir } from '../../../../lib/traducao'
import { baseDaConta, contaValida, credenciaisPortal, erroResposta, exigirLogin, HttpError, supabaseAdmin } from '../../../../lib/server'

export const runtime = 'nodejs'
export const maxDuration = 60

const MAX_LOTE = 6
const CAMINHO = '/Houses/EditByIdentifier'

/** Passo 2 (repetido pelo navegador): lê os checkpoints de um lote pequeno de HAWBs. */
export async function POST(req: Request) {
  try {
    await exigirLogin(req)
    const { itens, conta: contaBody } = await req.json().catch(() => ({ itens: null }))
    const conta = contaValida(contaBody)
    if (!Array.isArray(itens) || !itens.length || itens.length > MAX_LOTE) throw new HttpError(422, 'Lote inválido.')
    const base = baseDaConta(conta)
    // Só aceita URLs do próprio portal (evita usar o servidor para chamar outros destinos).
    for (const i of itens) {
      if (typeof i?.hawb !== 'string' || typeof i?.url !== 'string' || !i.url.startsWith(base + CAMINHO))
        throw new HttpError(422, 'Lote inválido.')
    }

    const { user, pass } = credenciaisPortal(conta)
    const portal = new Portal(base)
    await portal.login(user, pass)
    const db = supabaseAdmin()

    let ok = 0
    for (const { hawb, url } of itens as { hawb: string; url: string }[]) {
      await new Promise((r) => setTimeout(r, 300))
      const eventos = await portal.checkpoints(url)
      const ult = eventos[eventos.length - 1]
      const { error } = await db.from('memphis').update({
        status: derivarStatus(eventos),
        ultimo_checkpoint_em: ult ? isoDoPortal(ult.data) : null,
        ultimo_checkpoint_desc: ult ? traduzir(ult.descricao) : null,
        eventos, // sem a coluna Comments; descrição original (a tradução é feita na exibição)
        coletado_em: new Date().toISOString(),
      }).eq('hawb', hawb)
      if (error) throw new Error('falha ao gravar checkpoints')
      ok++
    }
    return Response.json({ ok })
  } catch (e) {
    return erroResposta(e)
  }
}
