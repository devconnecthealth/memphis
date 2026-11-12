import type { Evento } from '../lib/status'
import { traduzir } from '../lib/traducao'

export default function Timeline({ eventos }: { eventos: Evento[] }) {
  return (
    <ol className="timeline">
      {[...eventos].reverse().map((e, i) => (
        <li key={i} className={i === 0 ? 'atual' : ''}>
          <div className="data">{e.data}</div>
          <div className="desc">{traduzir(e.descricao)}</div>
          <div className="estacao">{e.estacao} · {e.codigo}</div>
        </li>
      ))}
    </ol>
  )
}
