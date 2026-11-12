import * as cheerio from 'cheerio'
import { brDeIso } from './datas'
import { BASE, type ItemLista, parseCheckpoints, parseLista, payloadDoForm } from './parse'

const UA = 'Mozilla/5.0 (monitor-remessas Connect Health)'

/** Cliente do portal com cookie jar e redirecionamento manual
 *  (o fetch não repassa cookies entre os saltos de um redirect). */
export class Portal {
  private cookies = new Map<string, string>()

  private guardar(res: Response) {
    for (const c of res.headers.getSetCookie()) {
      const [par] = c.split(';')
      const i = par.indexOf('=')
      if (i > 0) this.cookies.set(par.slice(0, i).trim(), par.slice(i + 1).trim())
    }
  }

  private async req(url: string, init: { method?: string; body?: URLSearchParams } = {}) {
    let metodo = init.method || 'GET'
    let corpo = init.body
    let atual = url
    for (let salto = 0; salto < 10; salto++) {
      const headers: Record<string, string> = { 'User-Agent': UA }
      if (this.cookies.size) headers.Cookie = [...this.cookies].map(([k, v]) => `${k}=${v}`).join('; ')
      if (corpo) headers['Content-Type'] = 'application/x-www-form-urlencoded'
      const res = await fetch(atual, { method: metodo, headers, body: corpo, redirect: 'manual', signal: AbortSignal.timeout(30000) })
      this.guardar(res)
      if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
        atual = new URL(res.headers.get('location')!, atual).toString()
        if (![307, 308].includes(res.status)) { metodo = 'GET'; corpo = undefined }
        continue
      }
      if (!res.ok) throw new Error(`portal HTTP ${res.status}`)
      return { html: await res.text(), url: atual }
    }
    throw new Error('redirecionamentos demais')
  }

  async login(user: string, pass: string) {
    const { html, url } = await this.req(`${BASE}/Account/Login`)
    const $ = cheerio.load(html)
    const form = $('form').first()
    if (!form.length) throw new Error('formulário de login não encontrado')
    const payload = payloadDoForm($, form)
    form.find('input').each((_, el) => {
      const t = $(el).attr('type'), n = $(el).attr('name')
      if (!n) return
      if (t === 'password') payload[n] = pass
      else if (t === 'text') payload[n] = user
    })
    const action = new URL(form.attr('action') || url, url).toString()
    const r = await this.req(action, { method: 'POST', body: new URLSearchParams(payload) })
    if (r.url.includes('/Account/Login') && r.html.includes('Log In')) throw new Error('login recusado pelo portal')
  }

  /** Lista os HAWBs criados entre inicio e fim (yyyy-mm-dd). */
  async listar(inicio: string, fim: string): Promise<ItemLista[]> {
    const { html, url } = await this.req(`${BASE}/Houses`)
    const $ = cheerio.load(html)
    const form = $('#frmHousesIndex')
    if (!form.length) throw new Error('frmHousesIndex não encontrado')
    const payload = payloadDoForm($, form)
    payload.init = brDeIso(inicio)
    payload.end = brDeIso(fim)
    payload.reportrange = `${payload.init} - ${payload.end}`
    const action = new URL(form.attr('action') || '/Houses/SearchIndexParams', url).toString()
    const todos: ItemLista[] = []
    for (let pagina = 1; ; pagina++) {
      payload.PageNumber = String(pagina)
      const r = await this.req(action, { method: 'POST', body: new URLSearchParams(payload) })
      const { itens, totalPaginas } = parseLista(r.html)
      todos.push(...itens)
      if (pagina >= totalPaginas || pagina >= 50) break
    }
    return todos
  }

  async checkpoints(url: string) {
    const r = await this.req(url)
    return parseCheckpoints(r.html)
  }
}
