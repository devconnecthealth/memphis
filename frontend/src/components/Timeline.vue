<script setup>
defineProps({ eventos: Array })
</script>

<template>
  <ol>
    <li v-for="(e, i) in [...eventos].reverse()" :key="i" :class="{ atual: i === 0 }">
      <div class="data">{{ e.data }}</div>
      <div class="desc">{{ e.descricao }}</div>
      <div class="estacao">{{ e.estacao }} · {{ e.codigo }}</div>
    </li>
  </ol>
</template>

<style scoped>
ol { list-style: none; margin: 0; padding: 0 0 0 22px; border-left: 1px solid var(--hairline); }
li { position: relative; padding: 0 0 26px 18px; }
li::before { content: ''; position: absolute; left: -28px; top: 7px; width: 11px; height: 11px; border-radius: 50%; background: var(--canvas); border: 2px solid var(--ink-48); }
li.atual::before { background: var(--primary); border-color: var(--primary); }
.data { font-size: 14px; letter-spacing: -0.224px; color: var(--ink-48); }
.desc { font-size: 17px; }
li.atual .desc { font-weight: 600; font-size: 21px; letter-spacing: 0.231px; line-height: 1.19; }
.estacao { font-size: 12px; letter-spacing: -0.12px; color: var(--ink-48); }
</style>
