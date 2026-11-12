import assert from 'node:assert/strict'
import { test } from 'node:test'
import { isoDoPortal } from '../src/lib/datas'
import { parseCheckpoints, parseLista } from '../src/lib/parse'
import { derivarStatus, diasSemMovimento } from '../src/lib/status'
import { traduzir } from '../src/lib/traducao'

const LISTA = `<input id="TotalPages" value="2"><table><tbody><tr>
<td><a href="/Houses/EditByIdentifier?identifier=abc">HW123 - </a></td>
<td><span class="d-none">x</span>01/02/2026 10:00</td><td>1</td><td>1</td><td>2</td>
<th>Maria Teste</th><td>Rua X 1</td><td>1</td><td>SP</td></tr></tbody></table>`

const CP = `<table><tr><th>Station Code</th><th>Code</th><th>Date</th><th>Description</th><th>Comments</th></tr>
<tr><td>GRU</td><th>DL</th><td>03/02/2026 09:00:00</td><td>Delivered: The shipment has been delivered. The date and time of delivery is recorded.</td><td>comentario secreto</td></tr>
<tr><td>MVD</td><th>FLT</th><td>01/02/2026 09:00:00</td><td>House created successfully</td><td>-</td></tr></table>`

test('lista: nome vem do th, nunca o endereço', () => {
  const { itens, totalPaginas } = parseLista(LISTA)
  assert.equal(totalPaginas, 2)
  assert.equal(itens[0].hawb, 'HW123')
  assert.equal(itens[0].criado, '01/02/2026 10:00')
  assert.equal(itens[0].destinatario, 'Maria Teste')
})

test('checkpoints: code em th, ordem cronológica, sem comentário', () => {
  const ev = parseCheckpoints(CP)
  assert.deepEqual(ev.map((e) => e.codigo), ['FLT', 'DL'])
  assert.ok(!JSON.stringify(ev).includes('secreto'))
  assert.equal(derivarStatus(ev), 'Entregue')
})

test('datas, tradução e dias parado', () => {
  assert.equal(isoDoPortal('11/11/2026 17:01:13'), '2026-11-11T17:01:13-03:00')
  assert.equal(traduzir('Inspected by Anvisa'), 'Inspecionada pela Anvisa')
  assert.equal(traduzir('Texto novo'), 'Texto novo')
  const agora = new Date('2026-11-12T12:00:00-03:00').getTime()
  assert.equal(diasSemMovimento('Em trânsito', '2026-11-05T10:00:00-03:00', null, agora), 7)
  assert.equal(diasSemMovimento('Entregue', '2026-11-05T10:00:00-03:00', null, agora), null)
})
