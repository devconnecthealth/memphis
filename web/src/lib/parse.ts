import * as cheerio from 'cheerio'
import { tsDoPortal } from './datas'
import type { Evento } from './status'

export const BASE = 'https://app.memphiscourier.com.br'

export type ItemLista = { hawb: string; criado: string; destinatario: string; url: string }

/** Lê uma página da lista de HAWBs. Só pega número, data e o NOME da pessoa destinatária
 *  (o <th> da linha). Endereço, CEP, cidade e CPF nunca são lidos. */
export function parseLista(html: string, base: string = BASE): { itens: ItemLista[]; totalPaginas: number } {
  const $ = cheerio.load(html)
  const total = parseInt($('#TotalPages').attr('value') || '1', 10)
  const itens: ItemLista[] = []
  $('table tbody tr').each((_, tr) => {
    const a = $(tr).find('a[href]').filter((_, el) => ($(el).attr('href') || '').includes('EditByIdentifier')).first()
    if (!a.length) return
    const tds = $(tr).find('td')
    const celulaCriado = tds.eq(1)
    celulaCriado.find('span.d-none').remove() // texto auxiliar de ordenação
    itens.push({
      hawb: a.text().trim().replace(/[- ]+$/, '').trim(),
      criado: celulaCriado.text().replace(/\s+/g, ' ').trim(),
      destinatario: $(tr).find('th').first().text().replace(/\s+/g, ' ').trim(),
      url: new URL(a.attr('href')!, base).toString(),
    })
  })
  return { itens, totalPaginas: Number.isFinite(total) && total > 0 ? total : 1 }
}

/** Tabela Station Code / Code / Date / Description. O "Code" vem como <th> dentro da linha.
 *  A coluna Comments é ignorada de propósito (texto livre, pode ter dado de paciente). */
export function parseCheckpoints(html: string): Evento[] {
  const $ = cheerio.load(html)
  let eventos: Evento[] = []
  $('table').each((_, table) => {
    const head = $(table).find('th').map((_, th) => $(th).text().trim().toLowerCase()).get()
    if (!head.includes('description') || !head.includes('date')) return
    $(table).find('tr').each((_, tr) => {
      if (!$(tr).find('td').length) return // linha de cabeçalho
      const c = $(tr).find('th,td').map((_, el) => $(el).text().replace(/\s+/g, ' ').trim()).get()
      if (c.length >= 4) eventos.push({ estacao: c[0], codigo: c[1], data: c[2], descricao: c[3] })
    })
    return false // só a primeira tabela que casa
  })
  eventos = eventos.sort((a, b) => tsDoPortal(a.data) - tsDoPortal(b.data))
  return eventos
}

/** Coleta todos os campos de um <form> (hidden, text, select...). */
export function payloadDoForm($: cheerio.CheerioAPI, form: cheerio.Cheerio<any>): Record<string, string> {
  const data: Record<string, string> = {}
  form.find('input, select, textarea').each((_, el) => {
    const $el = $(el)
    const name = $el.attr('name')
    if (!name) return
    if (el.tagName === 'select') {
      const opt = $el.find('option[selected]').first().length ? $el.find('option[selected]').first() : $el.find('option').first()
      data[name] = opt.length ? (opt.attr('value') ?? opt.text()) : ''
    } else if (['checkbox', 'radio'].includes($el.attr('type') || '')) {
      if ($el.attr('checked') !== undefined) data[name] = $el.attr('value') ?? 'on'
    } else {
      data[name] = $el.attr('value') ?? ''
    }
  })
  return data
}
