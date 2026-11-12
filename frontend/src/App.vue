<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from './supabase.js'

const router = useRouter()
const logado = ref(false)
supabase.auth.getSession().then(({ data }) => (logado.value = !!data.session))
supabase.auth.onAuthStateChange((_ev, sessao) => (logado.value = !!sessao))

async function sair() {
  await supabase.auth.signOut()
  router.replace('/login')
}
</script>

<template>
  <header class="global-nav">
    <router-link to="/" class="marca">Memphis</router-link>
    <button v-if="logado" class="btn-dark" @click="sair">Sair</button>
  </header>
  <div class="sub-nav">
    <span class="sub-titulo">Remessas</span>
  </div>
  <main><router-view /></main>
</template>

<style>
:root {
  --primary: #0066cc;
  --primary-focus: #0071e3;
  --ink: #1d1d1f;
  --ink-80: #333333;
  --ink-48: #7a7a7a;
  --canvas: #ffffff;
  --parchment: #f5f5f7;
  --pearl: #fafafc;
  --tile-dark: #272729;
  --hairline: #e0e0e0;
  --divider-soft: #f0f0f0;
  --font: 'SF Pro Text', system-ui, -apple-system, BlinkMacSystemFont, 'Inter', sans-serif;
  --font-display: 'SF Pro Display', system-ui, -apple-system, BlinkMacSystemFont, 'Inter', sans-serif;
}
* { box-sizing: border-box; }
body {
  margin: 0; background: var(--parchment); color: var(--ink);
  font-family: var(--font); font-size: 17px; line-height: 1.47; letter-spacing: -0.374px;
  -webkit-font-smoothing: antialiased;
}
a { color: var(--primary); text-decoration: none; }
a:hover { text-decoration: underline; }
h1, h2 { font-family: var(--font-display); font-weight: 600; margin: 0; }
h2 { font-size: 40px; line-height: 1.1; letter-spacing: -0.28px; }

.global-nav { background: #000; height: 44px; padding: 0 22px; display: flex; align-items: center; justify-content: space-between; }
.global-nav .marca { color: #fff; font-size: 12px; letter-spacing: -0.12px; font-weight: 400; }
.global-nav .marca:hover { text-decoration: none; opacity: 0.8; }
.sub-nav {
  position: sticky; top: 0; z-index: 5; height: 52px; padding: 0 22px; display: flex; align-items: center;
  background: rgba(245, 245, 247, 0.8); backdrop-filter: saturate(180%) blur(20px);
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
}
.sub-titulo { font-family: var(--font-display); font-size: 21px; font-weight: 600; letter-spacing: 0.231px; }
main { max-width: 1100px; margin: 0 auto; padding: 32px 22px 80px; }

button { font: inherit; font-size: 17px; letter-spacing: -0.374px; cursor: pointer; transition: transform 0.1s; }
button:active { transform: scale(0.95); }
button:focus-visible, input:focus-visible, select:focus-visible { outline: 2px solid var(--primary-focus); outline-offset: 2px; }
.btn { background: var(--primary); color: #fff; border: 0; border-radius: 9999px; padding: 11px 22px; }
.btn:disabled { background: var(--ink-48); opacity: 0.6; cursor: default; }
.btn-ghost { background: transparent; color: var(--primary); border: 1px solid var(--primary); border-radius: 9999px; padding: 8px 18px; font-size: 14px; letter-spacing: -0.224px; }
.btn-dark { background: var(--ink); color: #fff; border: 0; border-radius: 8px; padding: 6px 14px; font-size: 14px; letter-spacing: -0.224px; }
.erro { color: #c4281c; font-size: 14px; letter-spacing: -0.224px; }
.muted { color: var(--ink-48); }
.caption { font-size: 14px; letter-spacing: -0.224px; line-height: 1.43; }
.campo, .select {
  height: 44px; padding: 0 20px; background: var(--canvas); color: var(--ink);
  border: 1px solid rgba(0, 0, 0, 0.08); border-radius: 9999px; font: inherit; font-size: 17px; letter-spacing: -0.374px;
}
.select { padding-right: 14px; font-size: 14px; letter-spacing: -0.224px; }
@media (max-width: 640px) { h2 { font-size: 28px; } main { padding: 20px 16px 60px; } }
</style>
