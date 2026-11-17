'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import StatusBadge from '../components/StatusBadge'
import { supabase, token } from '../lib/supabaseBrowser'
import { brDeIso } from '../lib/datas'
import { diasSemMovimento } from '../lib/status'

type Linha = {
  hawb: string; destinatario: string | null; criado_em: string | null; status: string
  ultimo_checkpoint_em: string | null; ultimo_checkpoint_desc: string | null; coletado_em: string | null
  conta: string
}

const CONTAS = [
  { id: 'AnaRubia', rotulo: 'AnaRubia' }, { id: 'MVD', rotulo: 'Uruguai' }, { id: 'DXB', rotulo: 'Dubai' },
  { id: 'AMD', rotulo: 'Índia' }, { id: 'SHA', rotulo: 'China' }, { id: 'CBR', rotulo: 'Currier Brasil' },
]
const rotuloConta = (id: string) => CONTAS.find((c) => c.id === id)?.rotulo || id

const LOTE = 4
const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' }) : '—')
const z = (n: number) => String(n).padStart(2, '0')
const isoData = (d: Date) => `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`

// Mesma lógica dos atalhos do portal: "Últimos N dias" = hoje e os N-1 anteriores.
function intervalo(periodo: string, ini: string, fim: string): [string, string] {
  const hoje = new Date()
  if (periodo === 'mes') return [isoData(new Date(hoje.getFullYear(), hoje.getMonth(), 1)), isoData(new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0))]
  if (periodo === 'custom') return [ini, fim]
  const i = new Date(hoje)
  i.setDate(i.getDate() - (Number(periodo) - 1))
  return [isoData(i), isoData(hoje)]
}

const lerLS = (k: string, p: string) => { try { return localStorage.getItem(k) ?? p } catch { return p } }
const gravarLS = (k: string, v: string) => { try { localStorage.setItem(k, v) } catch { /* ignora */ } }

async function api(url: string, corpo: unknown) {
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token()}` }, body: JSON.stringify(corpo) })
  const j = await r.json().catch(() => ({}))
  if (!r.ok) throw Object.assign(new Error(j.erro || `Erro ${r.status}`), { status: r.status })
  return j
}

export default function Lista() {
  const router = useRouter()
  const [linhas, setLinhas] = useState<Linha[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [coletando, setColetando] = useState(false)
  const [progresso, setProgresso] = useState<[number, number]>([0, 0])
  const [periodo, setPeriodo] = useState('30')
  const [dataIni, setDataIni] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState('')
  const [filtroConta, setFiltroConta] = useState('')
  const [limite, setLimite] = useState(3)
  const [auto, setAuto] = useState(false)
  const [perm, setPerm] = useState<string>('unsupported')
  const rodando = useRef(false)

  const [ini, fim] = intervalo(periodo, dataIni, dataFim)
  const periodoInvalido = !ini || !fim || fim < ini

  useEffect(() => {
    setLimite(Number(lerLS('limiteDias', '3')))
    setAuto(lerLS('auto', '0') === '1')
    setPeriodo(lerLS('periodo', '30'))
    if (typeof Notification !== 'undefined') setPerm(Notification.permission)
  }, [])

  const carregar = useCallback(async () => {
    const [i, f] = intervalo(periodo, dataIni, dataFim)
    if (!i || !f || f < i) return
    const { data, error } = await supabase.from('memphis')
      .select('hawb,destinatario,criado_em,status,ultimo_checkpoint_em,ultimo_checkpoint_desc,coletado_em,conta')
      .gte('criado_em', `${i}T00:00:00-03:00`).lte('criado_em', `${f}T23:59:59-03:00`)
      .order('criado_em', { ascending: false }).limit(5000)
    if (error) setErro('Não foi possível carregar os dados.')
    else setLinhas((data as Linha[]) || [])
    setCarregando(false)
    return (data as Linha[]) || []
  }, [periodo, dataIni, dataFim])

  useEffect(() => {
    ;(async () => {
      if (!(await token())) return router.replace('/login')
      await carregar()
    })()
  }, [carregar, router])

  const paradosDe = useCallback((ls: Linha[]) => ls.filter((h) => {
    const d = diasSemMovimento(h.status, h.ultimo_checkpoint_em, h.criado_em)
    return d !== null && d >= limite
  }), [limite])
  const parados = useMemo(() => paradosDe(linhas), [linhas, paradosDe])
  const setParados = useMemo(() => new Set(parados), [parados])
  const ehParado = (h: Linha) => setParados.has(h)

  const lista = useMemo(() => linhas
    .filter((h) => `${h.hawb} ${h.destinatario || ''}`.toLowerCase().includes(busca.toLowerCase()))
    .filter((h) => !filtroConta || h.conta === filtroConta)
    .filter((h) => !filtro || (filtro === '__parado' ? setParados.has(h) : h.status === filtro)), [linhas, busca, filtro, filtroConta, setParados])

  const [pagina, setPagina] = useState(1)
  const [porPagina, setPorPagina] = useState(25)
  const totalPaginas = Math.max(1, Math.ceil(lista.length / porPagina))
  const paginaAtual = Math.min(pagina, totalPaginas)
  const visiveis = useMemo(() => lista.slice((paginaAtual - 1) * porPagina, paginaAtual * porPagina), [lista, paginaAtual, porPagina])
  useEffect(() => { setPagina(1) }, [busca, filtro, filtroConta, periodo, dataIni, dataFim, porPagina])

  const atualizadoEm = useMemo(() => linhas.map((l) => l.coletado_em).filter(Boolean).sort().pop() || null, [linhas])

  const atualizar = useCallback(async () => {
    if (rodando.current) return
    rodando.current = true
    setErro('')
    setColetando(true)
    try {
      let total = 0
      const falhas: string[] = []
      for (const c of CONTAS) {
        try {
          const r = await api('/api/coleta/iniciar', { inicio: ini, fim, conta: c.id })
          const fila: { hawb: string; url: string }[] = r.fila
          total += r.total
          setProgresso([0, fila.length])
          for (let k = 0; k < fila.length; k += LOTE) {
            await api('/api/coleta/lote', { itens: fila.slice(k, k + LOTE), conta: c.id })
            setProgresso([Math.min(k + LOTE, fila.length), fila.length])
          }
        } catch (e) {
          if ((e as { status?: number }).status === 401) throw e
          falhas.push(`${c.rotulo}: ${(e as Error).message}`)
        }
      }
      if (falhas.length) setErro(`Falha em: ${falhas.join(' | ')}`)
      const novas = (await carregar()) || []
      if (total >= 0 && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        const p = paradosDe(novas).length
        if (p) new Notification('Remessas sem movimentação', { body: `${p} remessa${p > 1 ? 's' : ''} sem movimentação há ${limite}+ dias.` })
      }
    } catch (e) {
      const err = e as Error & { status?: number }
      if (err.status === 401) { await supabase.auth.signOut(); router.replace('/login') }
      else setErro(err.message)
    } finally {
      rodando.current = false
      setColetando(false)
    }
  }, [ini, fim, carregar, paradosDe, limite, router])

  // Atualização automática (só com a aba aberta).
  useEffect(() => {
    if (!auto) return
    const t = setInterval(() => { if (!rodando.current && !periodoInvalido) atualizar() }, 30 * 60 * 1000)
    return () => clearInterval(t)
  }, [auto, atualizar, periodoInvalido])

  return (
    <>
      <section className="hero">
        <h2>Suas remessas</h2>
        <p className="lead muted">
          {atualizadoEm ? `Atualizado em ${fmt(atualizadoEm)}` : 'Nenhuma coleta ainda'} · {brDeIso(ini || '')} a {brDeIso(fim || '')}
        </p>
      </section>

      {parados.length > 0 && (
        <div className="tile-dark" role="alert">
          <div>
            <strong>{parados.length} remessa{parados.length > 1 ? 's' : ''} sem movimentação</strong>
            <span className="cinza"> há {limite}+ dia{limite > 1 ? 's' : ''}</span>
          </div>
          <a href="#" className="link-escuro" onClick={(e) => { e.preventDefault(); setFiltro('__parado') }}>Ver apenas essas ›</a>
        </div>
      )}

      <div className="barra">
        <select className="select" value={periodo} disabled={coletando} onChange={(e) => { setPeriodo(e.target.value); gravarLS('periodo', e.target.value) }}>
          <option value="7">Últimos 7 dias</option>
          <option value="30">Últimos 30 dias</option>
          <option value="60">Últimos 60 dias</option>
          <option value="90">Últimos 90 dias</option>
          <option value="mes">Este mês</option>
          <option value="custom">Data personalizada</option>
        </select>
        {periodo === 'custom' && (
          <>
            <input className="select" type="date" value={dataIni} disabled={coletando} onChange={(e) => setDataIni(e.target.value)} />
            <span className="muted caption">até</span>
            <input className="select" type="date" value={dataFim} disabled={coletando} onChange={(e) => setDataFim(e.target.value)} />
          </>
        )}
        <input className="campo busca" placeholder="Buscar HAWB ou destinatário" value={busca} onChange={(e) => setBusca(e.target.value)} />
        <select className="select" value={filtroConta} onChange={(e) => setFiltroConta(e.target.value)}>
          <option value="">Todas as contas</option>
          {CONTAS.map((c) => <option key={c.id} value={c.id}>{c.rotulo}</option>)}
        </select>
        <select className="select" value={filtro} onChange={(e) => setFiltro(e.target.value)}>
          <option value="">Todos os status</option>
          <option>Em trânsito</option>
          <option>Entregue</option>
          <option>Sem checkpoints</option>
          <option value="__parado">Sem movimentação</option>
        </select>
        <button className="btn" disabled={coletando || periodoInvalido} onClick={atualizar}>
          {coletando ? `Coletando… ${progresso[0]}/${progresso[1]}` : 'Buscar / Atualizar'}
        </button>
      </div>

      <div className="alerta-cfg muted caption">
        Alertar após
        <select className="select peq" value={limite} onChange={(e) => { setLimite(Number(e.target.value)); gravarLS('limiteDias', e.target.value) }}>
          {[1, 2, 3, 5, 7, 10].map((d) => <option key={d} value={d}>{d} dia{d > 1 ? 's' : ''}</option>)}
        </select>
        sem movimentação ·
        <label><input type="checkbox" checked={auto} onChange={(e) => { setAuto(e.target.checked); gravarLS('auto', e.target.checked ? '1' : '0') }} /> atualizar sozinho a cada 30 min (aba aberta)</label>
        {perm === 'default' && <button className="btn-ghost" onClick={async () => setPerm(await Notification.requestPermission())}>Ativar notificações</button>}
      </div>

      {erro && <p className="erro">{erro}</p>}
      {carregando ? <p className="muted">Carregando…</p> : !lista.length ? (
        <p className="muted vazio">Nenhuma remessa. Escolha o período e clique em Buscar / Atualizar.</p>
      ) : (
        <div className="card tabela">
          <table>
            <thead><tr><th>HAWB</th><th>Destinatário</th><th>Conta</th><th>Criado em</th><th>Último checkpoint</th><th>Status</th></tr></thead>
            <tbody>
              {visiveis.map((h) => {
                const d = diasSemMovimento(h.status, h.ultimo_checkpoint_em, h.criado_em)
                return (
                  <tr key={h.hawb} className={ehParado(h) ? 'parado' : ''}>
                    <td><Link href={`/hawb/${encodeURIComponent(h.hawb)}`}>{h.hawb}</Link></td>
                    <td>{h.destinatario || '—'}</td>
                    <td className="caption">{rotuloConta(h.conta)}</td>
                    <td className="caption">{fmt(h.criado_em)}</td>
                    <td>
                      {h.ultimo_checkpoint_desc ? (<><div className="caption">{h.ultimo_checkpoint_desc}</div><div className="muted fino">{fmt(h.ultimo_checkpoint_em)}</div></>) : <span className="muted">—</span>}
                    </td>
                    <td>
                      <StatusBadge status={h.status} />
                      {ehParado(h) && d !== null && <div className="aviso">{d} dia{d > 1 ? 's' : ''} parado</div>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <div className="alerta-cfg muted caption" style={{ justifyContent: 'space-between' }}>
            <span>{(paginaAtual - 1) * porPagina + 1}–{Math.min(paginaAtual * porPagina, lista.length)} de {lista.length}</span>
            <span>
              <select className="select peq" value={porPagina} onChange={(e) => setPorPagina(Number(e.target.value))}>
                {[25, 50, 100, 200].map((n) => <option key={n} value={n}>{n} por página</option>)}
              </select>
              {' '}
              <button className="btn-ghost" disabled={paginaAtual <= 1} onClick={() => setPagina(paginaAtual - 1)}>‹ Anterior</button>
              {' '}Página {paginaAtual} de {totalPaginas}{' '}
              <button className="btn-ghost" disabled={paginaAtual >= totalPaginas} onClick={() => setPagina(paginaAtual + 1)}>Próxima ›</button>
            </span>
          </div>
        </div>
      )}
    </>
  )
}
