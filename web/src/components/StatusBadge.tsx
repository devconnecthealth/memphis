export default function StatusBadge({ status }: { status: string }) {
  const cls = status === 'Entregue' ? 'ok' : status === 'Em trânsito' ? 'transito' : ''
  return <span className={`chip ${cls}`}><i />{status}</span>
}
