<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../supabase.js'

const router = useRouter()
const email = ref('')
const senha = ref('')
const erro = ref('')
const entrando = ref(false)

async function entrar() {
  erro.value = ''
  entrando.value = true
  const { error } = await supabase.auth.signInWithPassword({ email: email.value.trim(), password: senha.value })
  entrando.value = false
  if (error) {
    erro.value = 'E-mail ou senha inválidos.'
    return
  }
  router.replace('/')
}
</script>

<template>
  <form class="login" @submit.prevent="entrar">
    <h2>Entrar</h2>
    <p class="lead muted">Acompanhe suas remessas.</p>
    <input class="campo" v-model="email" type="email" placeholder="E-mail" autocomplete="username" required />
    <input class="campo" v-model="senha" type="password" placeholder="Senha" autocomplete="current-password" required />
    <p v-if="erro" class="erro">{{ erro }}</p>
    <button class="btn" :disabled="entrando">{{ entrando ? 'Entrando…' : 'Entrar' }}</button>
  </form>
</template>

<style scoped>
.login { max-width: 360px; margin: 48px auto; display: flex; flex-direction: column; gap: 14px; text-align: center; }
.lead { font-family: var(--font-display); font-size: 21px; margin: 0 0 8px; }
.login .btn { height: 44px; }
</style>
