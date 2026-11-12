<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { getHawbs, getStatus, atualizar } from '../api.js'
import StatusBadge from '../components/StatusBadge.vue'

const hawbs = ref([])
const atualizadoEm = ref(null)
const erro = ref('')
const carregando = ref(true)
const coletando = ref(false)
const progresso = ref([0, 0])
const busca = ref('')
const filtro = ref('')
const periodo = ref('30')
const dataIni = ref('')
const dataFim = ref('')
const periodoUsado = ref(null)

const iso = (d) => {
  const z = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`
}
// Mesma lógica dos atalhos do portal: "Últimos N dias" = hoje e os N-1 anteriores.
function intervalo() {
  const hoje = new Date()
  if (periodo.value === 'mes') {
    return [iso(new Date(hoje.getFullYear(), hoje.getMonth(), 1)), iso(new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0))]
  }
  if (periodo.value === 'custom') return [dataIni.value, dataFim.value]
  const ini = new Date(hoje)
  ini.setDate(ini.getDate() - (Number(periodo.value) - 1))
  return [iso(ini), iso(hoje)]
}
const br = (d) => d.split('-').reverse().join('/')
const periodoInvalido = computed(() => {
  const [i, f] = intervalo()
  return !i || !f || f < i
})
let timer = null
let autoTimer = null

// Preferências do alerta (só neste navegador).
const ler = (k, padrao) => { try { return localStorage.getItem(k) ?? padrao } catch { return padrao } }
const gravar = (k, v) => { try { localStorage.setItem(k, v) } catch { /* sem storage: ignora */ } }
const limiteDias = ref(Number(ler('limiteDias', '3')))
const auto = ref(ler('auto', '0') === '1')
const notifPermissao = ref(typeof Notification !== 'undefined' ? Notification.permission : 'unsupported')
watch(limiteDias, (v) => gravar('limiteDias', v))
watch(auto, (v) => { gravar('auto', v ? '1' : '0'); agendarAuto() })

const parados = computed(() =>
  hawbs.value.filter((h) => h.dias_sem_movimento !== null && h.dias_sem_movimento >= limiteDias.value),
)
const ehParado = (h) => h.dias_sem_movimento !== null && h.dias_sem_movimento >= limiteDias.value

function agendarAuto() {
  clearInterval(autoTimer)
  if (auto.value) autoTimer = setInterval(() => { if (!coletando.value && !periodoInvalido.value) clicar() }, 30 * 60 * 1000)
}
async function pedirPermissao() {
  notifPermissao.value = await Notification.requestPermission()
}
function notificar() {
  if (notifPermissao.value !== 'granted' || !parados.value.length) return
  const n = parados.value.length
  new Notification('Remessas sem movimentação', {
    body: `${n} remessa${n > 1 ? 's' : ''} sem movimentação há ${limiteDias.value}+ dias.`,
  })
}

const lista = computed(() =>
  hawbs.value
    .filter((h) => (h.hawb + ' ' + h.destinatario).toLowerCase().includes(busca.value.toLowerCase()))
    .filter((h) => !filtro.value || (filtro.value === '__parado' ? ehParado(h) : h.status === filtro.value)),
)

async function carregar() {
  try {
    const d = await getHawbs()
    hawbs.value = d.hawbs
    atualizadoEm.value = d.atualizado_em
    periodoUsado.value = d.periodo
  } catch (e) {
    erro.value = e.message
  } finally {
    carregando.value = false
  }
}

function acompanhar() {
  coletando.value = true
  clearInterval(timer)
  timer = setInterval(async () => {
    try {
      const s = await getStatus()
      progresso.value = s.progresso
      if (!s.coletando) {
        clearInterval(timer)
        coletando.value = false
        erro.value = s.erro || ''
        await carregar()
        notificar()
      }
    } catch (e) {
      clearInterval(timer)
      coletando.value = false
      erro.value = e.message
    }
  }, 2000)
}

async function clicar() {
  erro.value = ''
  try {
    const [i, f] = intervalo()
    await atualizar(i, f)
  } catch (e) {
    if (e.status !== 409) {
      erro.value = e.message
      return
    }
  }
  acompanhar()
}

onMounted(async () => {
  await carregar()
  const s = await getStatus().catch(() => null)
  if (s && s.coletando) acompanhar()
  agendarAuto()
})
onBeforeUnmount(() => { clearInterval(timer); clearInterval(autoTimer) })
</script>

<template>
  <section class="hero">
    <h2>Suas remessas</h2>
    <p class="lead muted">
      {{ atualizadoEm ? 'Atualizado em ' + atualizadoEm.replace('T', ' ') : 'Nenhuma coleta ainda' }}<template v-if="periodoUsado"> · {{ br(periodoUsado.inicio) }} a {{ br(periodoUsado.fim) }}</template>
    </p>
  </section>

  <div v-if="parados.length" class="tile-dark" role="alert">
    <div>
      <strong>{{ parados.length }} remessa{{ parados.length > 1 ? 's' : '' }} sem movimentação</strong>
      <span class="cinza"> há {{ limiteDias }}+ dia{{ limiteDias > 1 ? 's' : '' }}</span>
    </div>
    <a href="#" class="link-escuro" @click.prevent="filtro = '__parado'">Ver apenas essas ›</a>
  </div>

  <div class="barra">
    <select class="select" v-model="periodo" :disabled="coletando">
      <option value="7">Últimos 7 dias</option>
      <option value="30">Últimos 30 dias</option>
      <option value="60">Últimos 60 dias</option>
      <option value="90">Últimos 90 dias</option>
      <option value="mes">Este mês</option>
      <option value="custom">Data personalizada</option>
    </select>
    <template v-if="periodo === 'custom'">
      <input class="select" type="date" v-model="dataIni" :disabled="coletando" />
      <span class="muted caption">até</span>
      <input class="select" type="date" v-model="dataFim" :disabled="coletando" />
    </template>
    <input class="campo busca" v-model="busca" placeholder="Buscar HAWB ou destinatário" />
    <select class="select" v-model="filtro">
      <option value="">Todos os status</option>
      <option>Em trânsito</option>
      <option>Entregue</option>
      <option>Sem checkpoints</option>
      <option value="__parado">Sem movimentação</option>
    </select>
    <button class="btn" :disabled="coletando || periodoInvalido" @click="clicar">
      {{ coletando ? `Coletando… ${progresso[0]}/${progresso[1]}` : 'Buscar / Atualizar' }}
    </button>
  </div>

  <div class="alerta-cfg muted caption">
    Alertar após
    <select class="select peq" v-model.number="limiteDias">
      <option v-for="d in [1, 2, 3, 5, 7, 10]" :key="d" :value="d">{{ d }} dia{{ d > 1 ? 's' : '' }}</option>
    </select>
    sem movimentação ·
    <label><input type="checkbox" v-model="auto" /> atualizar sozinho a cada 30 min (aba aberta)</label>
    <button v-if="notifPermissao === 'default'" class="btn-ghost" @click="pedirPermissao">Ativar notificações</button>
  </div>

  <p v-if="erro" class="erro">{{ erro }}</p>
  <p v-if="carregando" class="muted">Carregando…</p>
  <p v-else-if="!lista.length" class="muted vazio">Nenhuma remessa. Escolha o período e clique em Buscar / Atualizar.</p>

  <div v-else class="card tabela">
    <table>
      <thead><tr><th>HAWB</th><th>Destinatário</th><th>Criado em</th><th>Último checkpoint</th><th>Status</th></tr></thead>
      <tbody>
        <tr v-for="h in lista" :key="h.hawb" :class="{ parado: ehParado(h) }">
          <td><router-link :to="`/hawb/${encodeURIComponent(h.hawb)}`">{{ h.hawb }}</router-link></td>
          <td>{{ h.destinatario || '—' }}</td>
          <td class="caption">{{ h.criado }}</td>
          <td>
            <template v-if="h.ultimo_checkpoint">
              <div class="caption">{{ h.ultimo_checkpoint.descricao }}</div>
              <div class="muted fino">{{ h.ultimo_checkpoint.data }}</div>
            </template>
            <span v-else class="muted">—</span>
          </td>
          <td>
            <StatusBadge :status="h.status" />
            <div v-if="ehParado(h)" class="aviso">{{ h.dias_sem_movimento }} dia{{ h.dias_sem_movimento > 1 ? 's' : '' }} parado</div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.hero { text-align: center; padding: 24px 0 28px; }
.hero h2 { font-size: 56px; line-height: 1.07; letter-spacing: -0.28px; }
.lead { font-family: var(--font-display); font-size: 21px; margin: 8px 0 0; letter-spacing: 0.231px; }
.tile-dark { background: var(--tile-dark); color: #fff; border-radius: 18px; padding: 18px 24px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
.cinza { color: #ccc; }
.link-escuro { color: #2997ff; }
.barra { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin-bottom: 12px; }
.busca { flex: 1; min-width: 220px; }
.alerta-cfg { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin-bottom: 20px; }
.peq { height: 32px; }
.card { background: var(--canvas); border: 1px solid var(--hairline); border-radius: 18px; }
.tabela { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; }
th { text-align: left; font-size: 12px; font-weight: 600; letter-spacing: -0.12px; color: var(--ink-48); padding: 16px 20px 10px; }
td { padding: 14px 20px; border-top: 1px solid var(--divider-soft); vertical-align: top; }
tr.parado td { background: var(--pearl); }
.fino { font-size: 12px; letter-spacing: -0.12px; }
.aviso { font-size: 12px; letter-spacing: -0.12px; margin-top: 5px; font-weight: 600; }
.vazio { text-align: center; padding: 40px 0; }
@media (max-width: 640px) { .hero h2 { font-size: 34px; } }
</style>
