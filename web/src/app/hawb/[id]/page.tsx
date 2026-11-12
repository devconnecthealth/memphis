'use client'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import StatusBadge from '../../../components/StatusBadge'
import Timeline from '../../../components/Timeline'
import { supabase, token } from '../../../lib/supabaseBrowser'
import type { Evento } from '../../../lib/status'

type Hawb = { hawb: string; destinatario: string | null; criado_em: string | null; status: string; eventos: Evento[] }

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' }) : '—')

export default function Detalhe() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const [h, setH] = useState<Hawb | null>(null)
  const [erro, setErro] = useState('')

  useEffect(() => {
    ;(async () => {
      if (!(await token())) return router.replace('/login')
      const { data, error } = await supabase.from('memphis').select('hawb,destinatario,criado_em,status,eventos').eq('hawb', decodeURIComponent(id)).maybeSingle()
      if (error) setErro('Não foi possível carregar.')
      else if (!data) setErro('HAWB não encontrado.')
      else setH(data as Hawb)
    })()
  }, [id, router])

  return (
    <>
      <Link href="/" className="voltar">‹ Remessas</Link>
      {erro && <p className="erro">{erro}</p>}
      {h && (
        <>
          <section className="hero-dark">
            <StatusBadge status={h.status} />
            <h2>{h.hawb}</h2>
            <p className="lead">{h.destinatario || '—'}</p>
            <p className="caption cinza">Criado em {fmt(h.criado_em)}</p>
          </section>
          <section className="card painel">
            <h3>Linha do tempo</h3>
            {h.eventos?.length ? <Timeline eventos={h.eventos} /> : <p className="muted">Sem checkpoints lidos.</p>}
          </section>
        </>
      )}
    </>
  )
}
