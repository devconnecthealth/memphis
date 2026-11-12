// Teste manual contra o portal real + Supabase (não roda no `npm test`).
import { Portal } from '../src/lib/portal'
import { supabaseAdmin } from '../src/lib/server'
import { isoDoPortal } from '../src/lib/datas'
import { derivarStatus } from '../src/lib/status'
import { traduzir } from '../src/lib/traducao'

async function main() {
const p = new Portal()
await p.login(process.env.MEMPHIS_USER!, process.env.MEMPHIS_PASS!)
const itens = await p.listar('2026-08-14', '2026-11-12')
console.log('HAWBs listados:', itens.length, '| com destinatário:', itens.filter((i) => i.destinatario).length,
  '| nomes com dígito:', itens.filter((i) => /\d/.test(i.destinatario)).length)
const db = supabaseAdmin()
const { error: e1 } = await db.from('memphis').upsert(itens.map((i) => ({ hawb: i.hawb, destinatario: i.destinatario || null, criado_em: isoDoPortal(i.criado) })), { onConflict: 'hawb' })
console.log('upsert lista:', e1 ? 'ERRO' : 'ok')
let n = 0
for (const i of itens.slice(0, 3)) {
  const ev = await p.checkpoints(i.url)
  const u = ev[ev.length - 1]
  const { error } = await db.from('memphis').update({ status: derivarStatus(ev), ultimo_checkpoint_em: u ? isoDoPortal(u.data) : null, ultimo_checkpoint_desc: u ? traduzir(u.descricao) : null, eventos: ev, coletado_em: new Date().toISOString() }).eq('hawb', i.hawb)
  if (!error) n++
  console.log('  eventos:', ev.length, '| último:', u?.data, '|', traduzir(u?.descricao))
}
console.log('updates ok:', n)
const { data } = await db.from('memphis').select('hawb', { count: 'exact', head: false })
console.log('linhas na tabela:', data?.length)

}
main().catch((e) => { console.error('FALHA:', e instanceof Error ? e.message : e); process.exit(1) })
