<script setup>
defineProps({ status: String })
</script>

<template>
  <span class="chip" :class="{ ok: status === 'Entregue', transito: status === 'Em trânsito' }">
    <i></i>{{ status }}
  </span>
</template>

<style scoped>
.chip { display: inline-flex; align-items: center; gap: 6px; padding: 3px 11px; border-radius: 9999px; background: var(--divider-soft); color: var(--ink-80); font-size: 12px; letter-spacing: -0.12px; white-space: nowrap; }
i { width: 7px; height: 7px; border-radius: 50%; background: var(--ink-48); }
.transito i { background: var(--primary); }
.ok { background: var(--ink); color: #fff; }
.ok i { background: #fff; }
</style>
