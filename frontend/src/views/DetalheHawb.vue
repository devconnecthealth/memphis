<script setup>
import { ref, onMounted } from 'vue'
import { getHawb } from '../api.js'
import StatusBadge from '../components/StatusBadge.vue'
import Timeline from '../components/Timeline.vue'

const props = defineProps({ id: String })
const h = ref(null)
const erro = ref('')

onMounted(async () => {
  try {
    h.value = await getHawb(props.id)
  } catch (e) {
    erro.value = e.status === 404 ? 'HAWB não encontrado (faça uma coleta na lista).' : e.message
  }
})
</script>

<template>
  <router-link to="/" class="voltar">‹ Remessas</router-link>
  <p v-if="erro" class="erro">{{ erro }}</p>
  <template v-else-if="h">
    <section class="tile-dark">
      <StatusBadge :status="h.status" />
      <h2>{{ h.hawb }}</h2>
      <p class="lead">{{ h.destinatario || '—' }}</p>
      <p class="caption cinza">Criado em {{ h.criado }}</p>
    </section>
    <section class="card">
      <h3>Linha do tempo</h3>
      <Timeline v-if="h.eventos.length" :eventos="h.eventos" />
      <p v-else class="muted">Sem checkpoints lidos.</p>
    </section>
  </template>
</template>

<style scoped>
.voltar { display: inline-block; margin-bottom: 16px; }
.tile-dark { background: var(--tile-dark); color: #fff; border-radius: 18px; padding: 48px 32px; text-align: center; margin-bottom: 24px; }
.tile-dark h2 { margin: 14px 0 8px; font-size: 56px; line-height: 1.07; letter-spacing: -0.28px; }
.lead { font-family: var(--font-display); font-size: 28px; line-height: 1.14; letter-spacing: 0.196px; margin: 0 0 8px; }
.cinza { color: #ccc; margin: 0; }
.card { background: var(--canvas); border: 1px solid var(--hairline); border-radius: 18px; padding: 32px; }
h3 { font-family: var(--font-display); font-size: 21px; font-weight: 600; letter-spacing: 0.231px; margin: 0 0 24px; }
@media (max-width: 640px) { .tile-dark h2 { font-size: 34px; } .lead { font-size: 21px; } .card { padding: 22px; } }
</style>
